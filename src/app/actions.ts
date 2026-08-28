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
  universityId: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
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

    const initialStatus = isAdminSubmitting ? 'approved' : 'pending';

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: payload.teamName,
        university_id: finalUniId,
        leader_name: payload.leaderName,
        leader_email: payload.leaderEmail,
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
            from: 'Mora Slams <onboarding@resend.dev>',
            to: [payload.leaderEmail],
            subject: 'Registration Approved - Mora Slams 2026',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #060e08; color: #f8fafc;">
                <div style="text-align: center; border-bottom: 1px solid rgba(34, 197, 94, 0.2); padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #22c55e; margin: 0; font-size: 22px;">Mora Slams 2026</h2>
                  <p style="color: #f5a623; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">University of Moratuwa</p>
                </div>
                
                <h2 style="color: #22c55e; font-size: 18px; margin-top: 0;">Congratulations!</h2>
                <p style="font-size: 14px; color: #cbd5e1;">Hi <strong>${payload.leaderName}</strong>,</p>
                <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
                  Your team <strong>${payload.teamName}</strong> from <strong>${universityName}</strong> has been officially approved to enter the Mora Slams Carrom Tournament.
                </p>
                <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
                  The knockout brackets, schedule tables, and schedules are updated live on the tournament dashboard. Be sure to check the scheduling page for match slots and assignments.
                </p>

                <div style="background-color: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.15); border-radius: 8px; padding: 12px; font-size: 12px; color: #22c55e; text-align: center; margin-top: 20px;">
                  <strong>Roster Confirmed & Seeding Queued</strong>
                </div>

                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 25px 0;" />
                <p style="font-size: 10px; color: #64748b; text-align: center; margin: 0;">
                  This is an automated notification from the Mora Slams Tournament Management System.
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
            from: 'Mora Slams <onboarding@resend.dev>',
            to: [payload.leaderEmail],
            subject: 'Registration Received - Mora Slams 2026',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #060e08; color: #f8fafc;">
                <div style="text-align: center; border-bottom: 1px solid rgba(245, 166, 35, 0.2); padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #22c55e; margin: 0; font-size: 22px;">Mora Slams 2026</h2>
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
                  This is an automated notification from the Mora Slams Tournament Management System.
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
      player_b:players!matches_player_b_id_fkey(
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
        from: 'Mora Slams <onboarding@resend.dev>',
        to: [team.leader_email],
        subject: 'Registration Approved - Mora Slams 2026',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #060e08; color: #f8fafc;">
            <div style="text-align: center; border-bottom: 1px solid rgba(34, 197, 94, 0.2); padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #22c55e; margin: 0; font-size: 22px;">Mora Slams 2026</h2>
              <p style="color: #f5a623; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">University of Moratuwa</p>
            </div>
            
            <h2 style="color: #22c55e; font-size: 18px; margin-top: 0;">Congratulations!</h2>
            <p style="font-size: 14px; color: #cbd5e1;">Hi <strong>${team.leader_name}</strong>,</p>
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              Your team <strong>${team.name}</strong> from <strong>${team.university.name}</strong> has been officially approved to enter the Mora Slams Carrom Tournament.
            </p>
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              The knockout brackets, schedule tables, and schedules are updated live on the tournament dashboard. Be sure to check the scheduling page for match slots and assignments.
            </p>

            <div style="background-color: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.15); border-radius: 8px; padding: 12px; font-size: 12px; color: #22c55e; text-align: center; margin-top: 20px;">
              <strong>Roster Confirmed & Seeding Queued</strong>
            </div>

            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 25px 0;" />
            <p style="font-size: 10px; color: #64748b; text-align: center; margin: 0;">
              This is an automated notification from the Mora Slams Tournament Management System.
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

export async function generateScheduleAndBrackets(adminEmail: string) {
  const adminClient = getSupabaseAdmin();

  // 1. Fetch all players from approved teams
  const { data: approvedTeams, error: teamsError } = await adminClient
    .from('registrations')
    .select('team_id')
    .eq('status', 'approved');

  if (teamsError) throw new Error(teamsError.message);
  if (!approvedTeams || approvedTeams.length === 0) {
    throw new Error('No approved teams available to generate tournament bracket.');
  }

  const teamIds = approvedTeams.map((t) => t.team_id);

  const { data: players, error: playersError } = await adminClient
    .from('players')
    .select('id, full_name, team_id, teams(name, university_id, universities(name))')
    .in('team_id', teamIds);

  if (playersError) throw new Error(playersError.message);
  if (!players || players.length < 2) {
    throw new Error('At least 2 approved players are needed to generate tournament matches.');
  }

  // 2. Fetch Tournament Settings
  const { data: settings, error: settingsError } = await adminClient
    .from('tournament_settings')
    .select('*')
    .single();

  if (settingsError) throw new Error(settingsError.message);

  // 3. Clear existing matches before generating new ones
  await adminClient.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const N = players.length;
  // Calculate next power of 2
  let M = 2;
  while (M < N) {
    M *= 2;
  }

  const numByes = M - N;

  // Teammate separation layout: Group players by university / team
  const playersByUniversity: { [key: string]: typeof players } = {};
  players.forEach((p) => {
    const uniId = (p.teams as any).university_id;
    if (!playersByUniversity[uniId]) {
      playersByUniversity[uniId] = [];
    }
    playersByUniversity[uniId].push(p);
  });

  // Distribute players round-robin style to separate university teammates in the draw slots
  const drawSlots: (typeof players[0] | null)[] = Array(M).fill(null);
  const sortedUniversities = Object.keys(playersByUniversity).sort(
    (a, b) => playersByUniversity[b].length - playersByUniversity[a].length
  );

  let flatSortedPlayers: typeof players = [];
  let maxLen = Math.max(...Object.values(playersByUniversity).map((list) => list.length));

  // Interleave players from different universities
  for (let i = 0; i < maxLen; i++) {
    for (const uniId of sortedUniversities) {
      if (playersByUniversity[uniId][i]) {
        flatSortedPlayers.push(playersByUniversity[uniId][i]);
      }
    }
  }

  // Place byes and players optimally to ensure minimum byes and no bye-bye pairings
  const totalMatchesCount = M / 2;
  const numPlayedMatches = N - totalMatchesCount;
  const matchTypes: ('played' | 'bye')[] = Array(totalMatchesCount).fill('bye');

  if (numPlayedMatches > 0) {
    const step = totalMatchesCount / numPlayedMatches;
    for (let i = 0; i < numPlayedMatches; i++) {
      const idx = Math.floor(i * step);
      matchTypes[idx] = 'played';
    }
  }

  let playerIdx = 0;
  for (let i = 0; i < totalMatchesCount; i++) {
    if (matchTypes[i] === 'played') {
      drawSlots[i * 2] = flatSortedPlayers[playerIdx++];
      drawSlots[i * 2 + 1] = flatSortedPlayers[playerIdx++];
    } else {
      drawSlots[i * 2] = flatSortedPlayers[playerIdx++];
      drawSlots[i * 2 + 1] = null;
    }
  }

  // 4. Construct Bracket Bottom-up (Final -> Semis -> Quarters -> etc.)
  // We determine rounds. M = 16 => rounds: Round of 16 (8 matches), Quarter (4 matches), Semi (2 matches), Final (1 match)
  const roundsList: { roundName: string; matchesCount: number }[] = [];
  let tempM = M;
  while (tempM >= 2) {
    const matchesCount = tempM / 2;
    let roundName = '';
    if (tempM === 2) roundName = 'finals';
    else if (tempM === 4) roundName = 'semi_finals';
    else if (tempM === 8) roundName = 'quarter_finals';
    else if (tempM === 16) roundName = 'round_of_16';
    else if (tempM === 32) roundName = 'round_of_32';
    else roundName = `round_of_${tempM}`;

    roundsList.unshift({ roundName, matchesCount }); // Prepend so Finals is at index 0, first round is last
    tempM /= 2;
  }

  // Initialize start schedules
  const startDayTime = new Date();
  const [startHour, startMin] = settings.start_time.split(':').map(Number);
  startDayTime.setHours(startHour, startMin, 0, 0);
  const slotDurationMinutes = settings.match_duration_minutes + settings.break_duration_minutes;

  // Generate match structures in memory first
  const memoryMatches: any[] = [];
  const createdMatchesMap: { [key: string]: string } = {};

  for (let rIndex = 0; rIndex < roundsList.length; rIndex++) {
    const roundName = roundsList[rIndex].roundName;
    const matchesCount = roundsList[rIndex].matchesCount;
    const isFirstRound = rIndex === roundsList.length - 1;

    for (let mIndex = 0; mIndex < matchesCount; mIndex++) {
      const matchId = crypto.randomUUID();
      createdMatchesMap[`${roundName}_${mIndex}`] = matchId;

      let parentMatchId: string | null = null;
      let parentSlot: 'A' | 'B' | null = null;

      if (rIndex > 0) {
        const parentRound = roundsList[rIndex - 1];
        const parentMatchIdx = Math.floor(mIndex / 2);
        parentMatchId = createdMatchesMap[`${parentRound.roundName}_${parentMatchIdx}`];
        parentSlot = mIndex % 2 === 0 ? 'A' : 'B';
      }

      let playerAId: string | null = null;
      let playerBId: string | null = null;

      if (isFirstRound) {
        playerAId = drawSlots[mIndex * 2]?.id || null;
        playerBId = drawSlots[mIndex * 2 + 1]?.id || null;
      }

      memoryMatches.push({
        id: matchId,
        round: roundName,
        stage_index: rIndex + 1,
        mIndex: mIndex,
        player_a_id: playerAId,
        player_b_id: playerBId,
        winner_id: null,
        table_number: 0, // placeholder, will be set during scheduling
        scheduled_time: startDayTime.toISOString(), // placeholder, will be set during scheduling
        status: 'scheduled',
        score_a: 0,
        score_b: 0,
        next_match_id: parentMatchId,
        next_match_player_slot: parentSlot,
      });
    }
  }

  // Pre-resolve byes in memory
  memoryMatches.forEach((m) => {
    const isFirstRound = m.stage_index === roundsList.length;
    if (isFirstRound && (m.player_a_id === null || m.player_b_id === null)) {
      const activePlayerId = m.player_a_id || m.player_b_id;
      if (activePlayerId) {
        m.status = 'finished';
        m.winner_id = activePlayerId;
        m.score_a = 0;
        m.score_b = 0;
        m.table_number = 0; // Bye match has no table number

        // Propagate winner to next match in memory
        if (m.next_match_id && m.next_match_player_slot) {
          const parent = memoryMatches.find(pm => pm.id === m.next_match_id);
          if (parent) {
            if (m.next_match_player_slot === 'A') {
              parent.player_a_id = activePlayerId;
            } else {
              parent.player_b_id = activePlayerId;
            }
          }
        }
      }
    }
  });

  // Compute dependency minSlots for every match
  const minSlotMap: { [matchId: string]: number } = {};

  // Loop rounds in reverse order (First Round down to Finals)
  for (let rIndex = roundsList.length - 1; rIndex >= 0; rIndex--) {
    const roundName = roundsList[rIndex].roundName;
    const matchesCount = roundsList[rIndex].matchesCount;
    const isFirstRound = rIndex === roundsList.length - 1;

    for (let mIndex = 0; mIndex < matchesCount; mIndex++) {
      const matchObj = memoryMatches.find(m => m.round === roundName && m.mIndex === mIndex);
      const matchId = matchObj.id;

      if (isFirstRound) {
        if (matchObj.player_a_id === null || matchObj.player_b_id === null) {
          minSlotMap[matchId] = -1; // bye match, no slot needed
        } else {
          minSlotMap[matchId] = 0; // played match starting in slot 0
        }
      } else {
        const childA = memoryMatches.find(c => c.next_match_id === matchId && c.next_match_player_slot === 'A');
        const childB = memoryMatches.find(c => c.next_match_id === matchId && c.next_match_player_slot === 'B');

        const slotA = childA ? minSlotMap[childA.id] : -1;
        const slotB = childB ? minSlotMap[childB.id] : -1;

        minSlotMap[matchId] = Math.max(slotA, slotB) + 1;
      }
    }
  }

  // Schedule played matches dynamically using greedy scheduler to pack tables efficiently
  const playedMatches = memoryMatches.filter(m => minSlotMap[m.id] >= 0);
  playedMatches.sort((a, b) => minSlotMap[a.id] - minSlotMap[b.id]);

  let currentSlot = 0;
  let unscheduled = [...playedMatches];

  while (unscheduled.length > 0) {
    const ready = unscheduled.filter(m => minSlotMap[m.id] <= currentSlot);

    if (ready.length === 0) {
      currentSlot++;
      continue;
    }

    const toSchedule = ready.slice(0, settings.tables_count);

    toSchedule.forEach((m, idx) => {
      m.table_number = idx + 1;
      m.scheduled_time = new Date(startDayTime.getTime() + currentSlot * slotDurationMinutes * 60 * 1000).toISOString();
      unscheduled = unscheduled.filter(u => u.id !== m.id);
    });

    currentSlot++;
  }

  // Insert all generated matches into Supabase
  for (const m of memoryMatches) {
    const { error: matchInsertError } = await adminClient
      .from('matches')
      .insert({
        id: m.id,
        player_a_id: m.player_a_id,
        player_b_id: m.player_b_id,
        winner_id: m.winner_id,
        table_number: m.table_number,
        scheduled_time: m.scheduled_time,
        status: m.status,
        score_a: m.score_a,
        score_b: m.score_b,
        current_frame: 1,
        round: m.round,
        stage_index: m.stage_index,
        next_match_id: m.next_match_id,
        next_match_player_slot: m.next_match_player_slot,
        total_duration_minutes: settings.match_duration_minutes,
      });

    if (matchInsertError) throw new Error(matchInsertError.message);
  }

  await logAdminAction(adminEmail, 'GENERATE_SCHEDULE', { matchesGenerated: playedMatches.length });
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

