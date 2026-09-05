'use server';

import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import { Match, Player, Registration, Team, TournamentSettings, University } from '@/types/database.types';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

// Helper to write audit logs
async function logAdminAction(adminEmail: string, action: string, details: any) {
  const adminClient = getSupabaseAdmin();
  await adminClient.from('audit_logs').insert({
    admin_email: adminEmail,
    action,
    details
  });
}

// ----------------------------------------------------
// PUBLIC ACTIONS
// ----------------------------------------------------

// Fetch all universities
export async function getUniversities(): Promise<University[]> {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// Add a new university (manual entry)
export async function addUniversity(name: string): Promise<University> {
  const { data, error } = await supabase
    .from('universities')
    .insert({ name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Submit a registration
export async function submitRegistration(payload: {
  teamName: string;
  universityId: string; // Could be 'new_xxx'
  newUniversityName?: string;
  leaderName: string;
  leaderEmail: string;
  category: 'boys' | 'girls';
  groupName: 'group_a' | 'group_b';
  players: { fullName: string; indexNumber: string; isLeader: boolean }[];
  submittedByAdminEmail?: string;
}) {
  try {
    let finalUniId = payload.universityId;
    let universityName = 'Custom Institution';

    const defaultUniMap: { [key: string]: string } = {
      'u1': 'University of Moratuwa',
      'u2': 'University of Colombo',
      'u3': 'University of Peradeniya',
      'u4': 'Stanford University',
      'u5': 'MIT'
    };

    let targetUniId = payload.universityId;
    if (targetUniId in defaultUniMap) {
      targetUniId = 'manual_' + defaultUniMap[targetUniId];
    }

    // Create university if manual entry
    if (targetUniId.startsWith('manual_')) {
      const rawName = targetUniId.replace('manual_', '').trim();
      const { data: newUni, error: uniError } = await supabase
        .from('universities')
        .insert({ name: rawName })
        .select()
        .single();

      if (uniError) {
        // If university already exists, fetch it
        const { data: existingUni } = await supabase
          .from('universities')
          .select('id, name')
          .eq('name', rawName)
          .maybeSingle();
        if (existingUni) {
          finalUniId = existingUni.id;
          universityName = existingUni.name;
        } else {
          throw new Error(uniError.message);
        }
      } else {
        finalUniId = newUni.id;
        universityName = newUni.name;
      }
    } else {
      const { data: uni } = await supabase
        .from('universities')
        .select('name')
        .eq('id', targetUniId)
        .single();
      if (uni) {
        universityName = uni.name;
        finalUniId = targetUniId;
      }
    }

    // Verify if submitted by an admin
    let isAdminSubmitting = false;
    if (payload.submittedByAdminEmail) {
      const adminClient = getSupabaseAdmin();
      const { data: adminUser } = await adminClient
        .from('admins')
        .select('id')
        .eq('email', payload.submittedByAdminEmail)
        .maybeSingle();
      if (adminUser) {
        isAdminSubmitting = true;
      }
    }

    const initialStatus = 'pending'; // Always send to pending, even if submitted by admin

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: payload.teamName,
        university_id: finalUniId,
        leader_name: payload.leaderName,
        leader_email: payload.leaderEmail,
        category: payload.category,
        group_name: payload.groupName,
      })
      .select()
      .single();

    if (teamError) throw new Error(teamError.message);

    const playersData = payload.players.map((p) => ({
      team_id: team.id,
      full_name: p.fullName,
      index_number: p.indexNumber,
      is_leader: p.isLeader,
    }));

    const { error: playersError } = await supabase
      .from('players')
      .insert(playersData);

    if (playersError) throw new Error(playersError.message);

    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .insert({
        team_id: team.id,
        status: initialStatus,
      })
      .select()
      .single();

    if (regError) throw new Error(regError.message);

    // Send Confirmation Email
    if (isAdminSubmitting) {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey && !apiKey.includes('placeholder')) {
          await resend.emails.send({
            from: 'Mora Slam <onboarding@resend.dev>',
            to: [payload.leaderEmail],
            subject: 'Registration Approved - Mora Slam 2026',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #060e08; color: #f8fafc;">
                <div style="text-align: center; border-bottom: 1px solid rgba(34, 197, 94, 0.2); padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #22c55e; margin: 0; font-size: 22px;">Mora Slam 2026</h2>
                  <p style="color: #f5a623; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">University of Moratuwa</p>
                </div>
                
                <h2 style="color: #22c55e; font-size: 18px; margin-top: 0;">Congratulations!</h2>
                <p style="font-size: 14px; color: #cbd5e1;">Hi <strong>${payload.leaderName}</strong>,</p>
                <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
                  Your team <strong>${payload.teamName}</strong> from <strong>${universityName}</strong> has been officially approved to enter the Mora Slam Carrom Tournament.
                </p>
                <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
                  The knockout brackets, schedule tables, and schedules are updated live on the tournament dashboard. Be sure to check the scheduling page for match slots and assignments.
                </p>

                <div style="background-color: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.15); border-radius: 8px; padding: 12px; font-size: 12px; color: #22c55e; text-align: center; margin-top: 20px;">
                  <strong>Roster Confirmed & Seeding Queued</strong>
                </div>

                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 25px 0;" />
                <p style="font-size: 10px; color: #64748b; text-align: center; margin: 0;">
                  This is an automated notification from the Mora Slam Tournament Management System.
                </p>
              </div>
            `,
          });
        }
      } catch (emailError) {
        console.error("Failed to send direct registration confirmation email:", emailError);
      }
    } else {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey && !apiKey.includes('placeholder')) {
          await resend.emails.send({
            from: 'Mora Slam <onboarding@resend.dev>',
            to: [payload.leaderEmail],
            subject: 'Registration Received - Mora Slam 2026',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #060e08; color: #f8fafc;">
                <div style="text-align: center; border-bottom: 1px solid rgba(245, 166, 35, 0.2); padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #22c55e; margin: 0; font-size: 22px;">Mora Slam 2026</h2>
                  <p style="color: #f5a623; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">University of Moratuwa</p>
                </div>
                
                <h2 style="color: #f5a623; font-size: 18px; margin-top: 0;">Registration Received!</h2>
                <p style="font-size: 14px; color: #cbd5e1;">Hi <strong>${payload.leaderName}</strong>,</p>
                <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
                  We have successfully received your team registration for <strong>${payload.teamName}</strong> from <strong>${universityName}</strong>.
                </p>
                <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
                  Your entry is currently <strong>pending approval</strong> by tournament administrators. Once the administrators verify your credentials and approve the registration, you will receive another confirmation email with your bracket slot details.
                </p>

                <div style="background-color: rgba(245, 166, 35, 0.05); border: 1px solid rgba(245, 166, 35, 0.15); border-radius: 8px; padding: 12px; font-size: 12px; color: #f5a623; text-align: center; margin-top: 20px;">
                  <strong>Status: Pending Verification</strong>
                </div>

                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 25px 0;" />
                <p style="font-size: 10px; color: #64748b; text-align: center; margin: 0;">
                  This is an automated notification from the Mora Slam Tournament Management System.
                </p>
              </div>
            `,
          });
        }
      } catch (emailError) {
        console.error("Failed to send pending registration email:", emailError);
      }
    }

    return { success: true, team, registration };
  } catch (error: any) {
    console.error("submitRegistration error:", error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

// Fetch matches (live, scheduled, finished) with details
export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey(
        id, full_name, index_number, team:teams(id, name, university:universities(name))
      ),
      player_a2:players!matches_player_a2_id_fkey(
        id, full_name, index_number, team:teams(id, name, university:universities(name))
      ),
      player_b:players!matches_player_b_id_fkey(
        id, full_name, index_number, team:teams(id, name, university:universities(name))
      ),
      player_b2:players!matches_player_b2_id_fkey(
        id, full_name, index_number, team:teams(id, name, university:universities(name))
      ),
      winner:players!matches_winner_id_fkey(
        id, full_name, index_number, team:teams(id, name, university:universities(name))
      )
    `)
    .order('scheduled_time', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as Match[];
}

// ----------------------------------------------------
// ADMIN PROTECTED ACTIONS (Uses Supabase Admin Client to verify / perform operations)
// ----------------------------------------------------

// Verify Admin Role
export async function verifyAdmin(userId: string): Promise<boolean> {
  const adminClient = getSupabaseAdmin();
  const { data, error } = await adminClient
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

// Fetch all pending registrations for Admin Dashboard
export async function getPendingRegistrations() {
  const adminClient = getSupabaseAdmin();
  const { data, error } = await adminClient
    .from('registrations')
    .select(`
      *,
      team:teams(
        id, name, leader_name, leader_email,
        university:universities(id, name),
        players(id, full_name, index_number, is_leader)
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

// Approve Registration
export async function approveRegistration(registrationId: string, adminEmail: string) {
  const adminClient = getSupabaseAdmin();
  
  // Get Registration details
  const { data: registration, error: regError } = await adminClient
    .from('registrations')
    .select(`
      id,
      team:teams(
        id, name, leader_name, leader_email,
        university:universities(name)
      )
    `)
    .eq('id', registrationId)
    .single();

  if (regError || !registration) {
    throw new Error('Registration not found');
  }

  // Update status to approved
  const { error: updateError } = await adminClient
    .from('registrations')
    .update({ status: 'approved' })
    .eq('id', registrationId);

  if (updateError) throw new Error(updateError.message);

  const team = registration.team as any;

  // Send approval email via Resend
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && !apiKey.includes('placeholder')) {
      await resend.emails.send({
        from: 'Mora Slam <onboarding@resend.dev>',
        to: [team.leader_email],
        subject: 'Registration Approved - Mora Slam 2026',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #060e08; color: #f8fafc;">
            <div style="text-align: center; border-bottom: 1px solid rgba(34, 197, 94, 0.2); padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #22c55e; margin: 0; font-size: 22px;">Mora Slam 2026</h2>
              <p style="color: #f5a623; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">University of Moratuwa</p>
            </div>
            
            <h2 style="color: #22c55e; font-size: 18px; margin-top: 0;">Congratulations!</h2>
            <p style="font-size: 14px; color: #cbd5e1;">Hi <strong>${team.leader_name}</strong>,</p>
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              Your team <strong>${team.name}</strong> from <strong>${team.university.name}</strong> has been officially approved to enter the Mora Slam Carrom Tournament.
            </p>
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              The knockout brackets, schedule tables, and schedules are updated live on the tournament dashboard. Be sure to check the scheduling page for match slots and assignments.
            </p>

            <div style="background-color: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.15); border-radius: 8px; padding: 12px; font-size: 12px; color: #22c55e; text-align: center; margin-top: 20px;">
              <strong>Roster Confirmed & Seeding Queued</strong>
            </div>

            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 25px 0;" />
            <p style="font-size: 10px; color: #64748b; text-align: center; margin: 0;">
              This is an automated notification from the Mora Slam Tournament Management System.
            </p>
          </div>
        `,
      });
    }
  } catch (emailError) {
    console.error("Failed to send approval email:", emailError);
  }

  await logAdminAction(adminEmail, 'APPROVE_REGISTRATION', { registrationId, teamName: team.name });
  return { success: true };
}

// Reject Registration
export async function rejectRegistration(registrationId: string, adminEmail: string) {
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient
    .from('registrations')
    .update({ status: 'rejected' })
    .eq('id', registrationId);

  if (error) throw new Error(error.message);

  await logAdminAction(adminEmail, 'REJECT_REGISTRATION', { registrationId });
  return { success: true };
}

// ----------------------------------------------------
// SCHEDULING & KNOCKOUT BRACKET ALGORITHM
// ----------------------------------------------------

export async function getApprovedPlayers() {
  const adminClient = getSupabaseAdmin();
  const { data: approvedTeams, error: teamsError } = await adminClient
    .from('registrations')
    .select('team_id')
    .eq('status', 'approved');

  if (teamsError) throw new Error(teamsError.message);
  if (!approvedTeams || approvedTeams.length === 0) return [];

  const teamIds = approvedTeams.map((t) => t.team_id);

  const { data: players, error: playersError } = await adminClient
    .from('players')
    .select('id, full_name, team_id, team:teams(name, category, group_name, university_id, university:universities(name))')
    .in('team_id', teamIds);

  if (playersError) throw new Error(playersError.message);
  
  return players || [];
}

export async function createManualMatch(payload: {
  round: string;
  category: 'boys' | 'girls';
  matchType: 'single' | 'double';
  playerAId: string | null;
  playerA2Id?: string | null;
  playerBId: string | null;
  playerB2Id?: string | null;
  tableNumber: number;
  scheduledTime: string;
  adminEmail: string;
}) {
  const adminClient = getSupabaseAdmin();

  // We assign a pseudo stage_index for the visual bracket (if applicable)
  // Let's say: Group Stages = 4, Semi-Finals = 2, Finals = 1
  let stageIndex = 4;
  let duration = 45;
  if (payload.round === 'finals') { stageIndex = 1; duration = 60; }
  else if (payload.round === 'semi_finals') { stageIndex = 2; duration = 60; }

  const { error } = await adminClient.from('matches').insert({
    id: crypto.randomUUID(),
    category: payload.category,
    match_type: payload.matchType,
    player_a_id: payload.playerAId,
    player_a2_id: payload.playerA2Id || null,
    player_b_id: payload.playerBId,
    player_b2_id: payload.playerB2Id || null,
    winner_id: null,
    table_number: payload.tableNumber,
    scheduled_time: payload.scheduledTime,
    status: 'scheduled',
    score_a: 0,
    score_b: 0,
    current_frame: 1,
    round: payload.round,
    stage_index: stageIndex,
    next_match_id: null,
    next_match_player_slot: null,
    total_duration_minutes: 45, // default
  });

  if (error) throw new Error(error.message);

  await logAdminAction(payload.adminEmail, 'CREATE_MANUAL_MATCH', { round: payload.round, table: payload.tableNumber });
  return { success: true };
}

// ----------------------------------------------------
// LIVE MATCH TIMER & SCORE ADMIN CONTROLS
// ----------------------------------------------------

export async function startMatch(matchId: string, adminEmail: string) {
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient
    .from('matches')
    .update({
      status: 'live',
      match_start_time: new Date().toISOString(),
      is_paused: false,
      paused_at_timestamp: null,
      pause_duration_seconds: 0,
    })
    .eq('id', matchId);

  if (error) throw new Error(error.message);

  await logAdminAction(adminEmail, 'START_MATCH', { matchId });
  return { success: true };
}

export async function pauseMatch(matchId: string, adminEmail: string) {
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient
    .from('matches')
    .update({
      is_paused: true,
      paused_at_timestamp: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (error) throw new Error(error.message);

  await logAdminAction(adminEmail, 'PAUSE_MATCH', { matchId });
  return { success: true };
}

export async function resumeMatch(matchId: string, adminEmail: string) {
  const adminClient = getSupabaseAdmin();
  
  // Fetch match details to compute pause duration
  const { data: match, error: fetchError } = await adminClient
    .from('matches')
    .select('paused_at_timestamp, pause_duration_seconds')
    .eq('id', matchId)
    .single();

  if (fetchError || !match) throw new Error('Match not found');

  let newPauseDuration = match.pause_duration_seconds;
  if (match.paused_at_timestamp) {
    const pausedTime = new Date(match.paused_at_timestamp).getTime();
    const elapsedPauseSeconds = Math.floor((Date.now() - pausedTime) / 1000);
    newPauseDuration += elapsedPauseSeconds;
  }

  const { error } = await adminClient
    .from('matches')
    .update({
      is_paused: false,
      paused_at_timestamp: null,
      pause_duration_seconds: newPauseDuration,
    })
    .eq('id', matchId);

  if (error) throw new Error(error.message);

  await logAdminAction(adminEmail, 'RESUME_MATCH', { matchId, extraPauseSeconds: newPauseDuration });
  return { success: true };
}

export async function updateMatchScore(payload: {
  matchId: string;
  scoreA: number;
  scoreB: number;
  currentFrame: number;
  adminEmail: string;
}) {
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient
    .from('matches')
    .update({
      score_a: payload.scoreA,
      score_b: payload.scoreB,
      current_frame: payload.currentFrame,
    })
    .eq('id', payload.matchId);

  if (error) throw new Error(error.message);

  await logAdminAction(payload.adminEmail, 'UPDATE_SCORE', {
    matchId: payload.matchId,
    scoreA: payload.scoreA,
    scoreB: payload.scoreB,
    currentFrame: payload.currentFrame,
  });
  return { success: true };
}

export async function confirmMatchResult(payload: {
  matchId: string;
  winnerId: string;
  adminEmail: string;
}) {
  const adminClient = getSupabaseAdmin();

  // 1. Get Match Info
  const { data: match, error: matchError } = await adminClient
    .from('matches')
    .select('next_match_id, next_match_player_slot, winner_id')
    .eq('id', payload.matchId)
    .single();

  if (matchError || !match) throw new Error('Match not found');
  if (match.winner_id) throw new Error('Match result already confirmed and is immutable.');

  // 2. Mark Match as Finished and record winner
  const { error: updateMatchError } = await adminClient
    .from('matches')
    .update({
      status: 'finished',
      winner_id: payload.winnerId,
    })
    .eq('id', payload.matchId);

  if (updateMatchError) throw new Error(updateMatchError.message);

  // 3. Progress winner to next match if slot exists
  if (match.next_match_id && match.next_match_player_slot) {
    const updateField = match.next_match_player_slot === 'A' ? 'player_a_id' : 'player_b_id';
    const { error: progressError } = await adminClient
      .from('matches')
      .update({ [updateField]: payload.winnerId })
      .eq('id', match.next_match_id);

    if (progressError) throw new Error(progressError.message);
  }

  await logAdminAction(payload.adminEmail, 'CONFIRM_RESULT', {
    matchId: payload.matchId,
    winnerId: payload.winnerId,
  });
  return { success: true };
}

export async function revertMatchToLive(payload: { matchId: string; adminEmail: string }) {
  const adminClient = getSupabaseAdmin();

  const { data: match, error: matchError } = await adminClient
    .from('matches')
    .select('next_match_id, next_match_player_slot, winner_id, status')
    .eq('id', payload.matchId)
    .single();

  if (matchError || !match) throw new Error('Match not found');
  if (match.status !== 'finished') throw new Error('Only finished matches can be reverted.');

  // 1. Remove player from next bracket slot if applicable
  if (match.next_match_id && match.next_match_player_slot) {
    const updateField = match.next_match_player_slot === 'A' ? 'player_a_id' : 'player_b_id';
    const { error: revertProgressError } = await adminClient
      .from('matches')
      .update({ [updateField]: null })
      .eq('id', match.next_match_id);

    if (revertProgressError) throw new Error('Failed to remove player from next round: ' + revertProgressError.message);
  }

  // 2. Set match back to live
  const { error: updateMatchError } = await adminClient
    .from('matches')
    .update({
      status: 'live',
      winner_id: null,
    })
    .eq('id', payload.matchId);

  if (updateMatchError) throw new Error(updateMatchError.message);

  await logAdminAction(payload.adminEmail, 'REVERT_TO_LIVE', {
    matchId: payload.matchId,
  });
  return { success: true };
}

// Reschedule Match Time or Table
export async function rescheduleMatch(payload: {
  matchId: string;
  tableNumber: number;
  scheduledTime: string;
  adminEmail: string;
}) {
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient
    .from('matches')
    .update({
      table_number: payload.tableNumber,
      scheduled_time: payload.scheduledTime,
    })
    .eq('id', payload.matchId);

  if (error) throw new Error(error.message);

  await logAdminAction(payload.adminEmail, 'RESCHEDULE_MATCH', {
    matchId: payload.matchId,
    tableNumber: payload.tableNumber,
    scheduledTime: payload.scheduledTime,
  });
  return { success: true };
}

// Override Bracket Player (Manual override always takes priority)
export async function overrideBracketMatchSlot(payload: {
  matchId: string;
  slot: 'A' | 'B';
  playerId: string | null;
  adminEmail: string;
}) {
  const adminClient = getSupabaseAdmin();
  const updateField = payload.slot === 'A' ? 'player_a_id' : 'player_b_id';

  const { error } = await adminClient
    .from('matches')
    .update({ [updateField]: payload.playerId })
    .eq('id', payload.matchId);

  if (error) throw new Error(error.message);

  await logAdminAction(payload.adminEmail, 'MANUAL_BRACKET_OVERRIDE', {
    matchId: payload.matchId,
    slot: payload.slot,
    playerId: payload.playerId,
  });
  return { success: true };
}

// Cancel (Delete) Match
export async function cancelMatch(payload: { matchId: string; adminEmail: string }) {
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient.from('matches').delete().eq('id', payload.matchId);
  if (error) throw new Error(error.message);

  await logAdminAction(payload.adminEmail, 'CANCEL_MATCH', { matchId: payload.matchId });
  return { success: true };
}

// Update Manual Standings Overrides
export async function updateTeamStandings(payload: {
  teamId: string;
  played: number | null;
  wins: number | null;
  points: number | null;
  rank: number | null;
  adminEmail: string;
}) {
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient
    .from('teams')
    .update({
      manual_played: payload.played,
      manual_wins: payload.wins,
      manual_points: payload.points,
      manual_rank: payload.rank,
    })
    .eq('id', payload.teamId);

  if (error) throw new Error(error.message);

  await logAdminAction(payload.adminEmail, 'UPDATE_STANDINGS', payload);
  return { success: true };
}


export async function updateTournamentChampions(payload: {
  category: 'boys' | 'girls';
  firstPlaceId: string | null;
  secondPlaceId: string | null;
  thirdPlaceId: string | null;
  adminEmail: string;
}) {
  const adminClient = getSupabaseAdmin();
  
  // Reset all existing ranks for this category to null
  await adminClient.from('teams').update({ tournament_rank: null }).eq('category', payload.category);
  
  // Set new ranks if provided
  if (payload.firstPlaceId) await adminClient.from('teams').update({ tournament_rank: 1 }).eq('id', payload.firstPlaceId);
  if (payload.secondPlaceId) await adminClient.from('teams').update({ tournament_rank: 2 }).eq('id', payload.secondPlaceId);
  if (payload.thirdPlaceId) await adminClient.from('teams').update({ tournament_rank: 3 }).eq('id', payload.thirdPlaceId);

  await logAdminAction(payload.adminEmail, 'UPDATE_CHAMPIONS', payload);
  return { success: true };
}
