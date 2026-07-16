'use server';

import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import { Match, Player, Registration, Team, TournamentSettings, University } from '@/types/database.types';
import { Resend } from 'resend';

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
  let finalUniId = payload.universityId;
  let universityName = 'Custom Institution';

  // Create university if manual entry
  if (payload.universityId.startsWith('manual_')) {
    const rawName = payload.universityId.replace('manual_', '').trim();
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
      .eq('id', payload.universityId)
      .single();
    if (uni) {
      universityName = uni.name;
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

  // Send Confirmation Email if directly approved by Admin
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
  }

  return { team, registration };
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

  // Place byes (nulls) uniformly in the slots
  let byeIndices: number[] = [];
  if (numByes > 0) {
    const step = M / numByes;
    for (let i = 0; i < numByes; i++) {
      const idx = Math.floor(i * step);
      byeIndices.push(idx);
    }
  }

  let playerIdx = 0;
  for (let i = 0; i < M; i++) {
    if (byeIndices.includes(i)) {
      drawSlots[i] = null;
    } else {
      drawSlots[i] = flatSortedPlayers[playerIdx++];
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

  // Map of next_round_match index to created Match UUID
  // key: "roundName_matchIndex"
  const createdMatchesMap: { [key: string]: string } = {};

  // Initialize start schedules
  const startDayTime = new Date();
  const [startHour, startMin] = settings.start_time.split(':').map(Number);
  startDayTime.setHours(startHour, startMin, 0, 0);

  const slotDurationMinutes = settings.match_duration_minutes + settings.break_duration_minutes;
  let matchesCreatedCount = 0;

  // Loop through rounds from final down to first round
  for (let rIndex = 0; rIndex < roundsList.length; rIndex++) {
    const roundName = roundsList[rIndex].roundName;
    const matchesCount = roundsList[rIndex].matchesCount;
    const isFirstRound = rIndex === roundsList.length - 1;

    for (let mIndex = 0; mIndex < matchesCount; mIndex++) {
      // Find parent match
      let parentMatchId: string | null = null;
      let parentSlot: 'A' | 'B' | null = null;

      if (rIndex > 0) {
        const parentRound = roundsList[rIndex - 1];
        const parentMatchIdx = Math.floor(mIndex / 2);
        parentMatchId = createdMatchesMap[`${parentRound.roundName}_${parentMatchIdx}`];
        parentSlot = mIndex % 2 === 0 ? 'A' : 'B';
      }

      // Schedule calculations (Only for first round initially, others are placeholders or TBD)
      let tableNumber = 1;
      let scheduledTime = new Date(startDayTime.getTime());

      if (isFirstRound) {
        // Table distribution
        const tableIdx = matchesCreatedCount % settings.tables_count;
        const slotIdx = Math.floor(matchesCreatedCount / settings.tables_count);
        tableNumber = tableIdx + 1;
        scheduledTime = new Date(startDayTime.getTime() + slotIdx * slotDurationMinutes * 60 * 1000);
        matchesCreatedCount++;
      } else {
        // Later rounds scheduled sequentially after first round slots
        const firstRoundTotalSlots = Math.ceil(roundsList[roundsList.length - 1].matchesCount / settings.tables_count);
        const roundOffsetSlots = firstRoundTotalSlots + (rIndex - 0); // approx later slots
        const tableIdx = mIndex % settings.tables_count;
        tableNumber = tableIdx + 1;
        scheduledTime = new Date(startDayTime.getTime() + roundOffsetSlots * slotDurationMinutes * 60 * 1000);
      }

      let playerAId: string | null = null;
      let playerBId: string | null = null;

      if (isFirstRound) {
        // Pull players from draw slots
        playerAId = drawSlots[mIndex * 2]?.id || null;
        playerBId = drawSlots[mIndex * 2 + 1]?.id || null;
      }

      // Insert match
      const { data: match, error: matchInsertError } = await adminClient
        .from('matches')
        .insert({
          player_a_id: playerAId,
          player_b_id: playerBId,
          winner_id: null,
          table_number: tableNumber,
          scheduled_time: scheduledTime.toISOString(),
          status: 'scheduled',
          score_a: 0,
          score_b: 0,
          current_frame: 1,
          round: roundName,
          stage_index: rIndex + 1,
          next_match_id: parentMatchId,
          next_match_player_slot: parentSlot,
          total_duration_minutes: settings.match_duration_minutes,
        })
        .select()
        .single();

      if (matchInsertError) throw new Error(matchInsertError.message);

      createdMatchesMap[`${roundName}_${mIndex}`] = match.id;

      // Handle Automatic Bye Resolution
      if (isFirstRound && (playerAId === null || playerBId === null)) {
        const activePlayerId = playerAId || playerBId;
        if (activePlayerId) {
          // Finish match immediately and progress player
          await adminClient
            .from('matches')
            .update({
              status: 'finished',
              winner_id: activePlayerId,
              score_a: playerAId ? 8 : 0,
              score_b: playerBId ? 8 : 0,
            })
            .eq('id', match.id);

          if (parentMatchId && parentSlot) {
            const updateField = parentSlot === 'A' ? 'player_a_id' : 'player_b_id';
            await adminClient
              .from('matches')
              .update({ [updateField]: activePlayerId })
              .eq('id', parentMatchId);
          }
        }
      }
    }
  }

  await logAdminAction(adminEmail, 'GENERATE_SCHEDULE', { matchesGenerated: matchesCreatedCount });
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

