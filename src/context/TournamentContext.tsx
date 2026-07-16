'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Match, Player, Registration, Team, University, TournamentSettings, AuditLog } from '@/types/database.types';
import { 
  getMatches, 
  verifyAdmin,
  startMatch,
  pauseMatch,
  resumeMatch,
  updateMatchScore,
  confirmMatchResult,
  rescheduleMatch,
  overrideBracketMatchSlot,
  submitRegistration,
  approveRegistration,
  rejectRegistration,
  generateScheduleAndBrackets,
  getPendingRegistrations,
  getUniversities
} from '@/app/actions';
import { supabase } from '@/lib/supabase';

interface TournamentContextType {
  isDemoMode: boolean;
  isAdmin: boolean;
  adminEmail: string;
  matches: Match[];
  registrations: any[];
  universities: University[];
  settings: TournamentSettings;
  auditLogs: AuditLog[];
  loading: boolean;
  activeTab: 'live' | 'schedule' | 'results' | 'register' | 'admin';
  setActiveTab: (tab: 'live' | 'schedule' | 'results' | 'register' | 'admin') => void;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  submitReg: (payload: any) => Promise<any>;
  approveReg: (regId: string) => Promise<void>;
  rejectReg: (regId: string) => Promise<void>;
  generateDraw: () => Promise<void>;
  startM: (matchId: string) => Promise<void>;
  pauseM: (matchId: string) => Promise<void>;
  resumeM: (matchId: string) => Promise<void>;
  updateScore: (matchId: string, scoreA: number, scoreB: number, frame: number) => Promise<void>;
  confirmWinner: (matchId: string, winnerId: string) => Promise<void>;
  reschedule: (matchId: string, table: number, time: string) => Promise<void>;
  overrideSlot: (matchId: string, slot: 'A' | 'B', playerId: string | null) => Promise<void>;
  updateSettings: (start: string, tables: number, duration: number, breakMins: number) => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

// Pre-seeded teams for Demo Mode
const DEFAULT_UNIVERSITIES = [
  { id: 'u1', name: 'University of Moratuwa' },
  { id: 'u2', name: 'University of Colombo' },
  { id: 'u3', name: 'University of Peradeniya' },
  { id: 'u4', name: 'Stanford University' },
  { id: 'u5', name: 'MIT' }
];

const DEFAULT_TEAMS = [
  { id: 't1', name: 'CSE Strikers', university_id: 'u1', leader_name: 'Amara Silva', leader_email: 'amara@mora.edu' },
  { id: 't2', name: 'Mechanical Slammers', university_id: 'u1', leader_name: 'Buddhika Perera', leader_email: 'buddhika@mora.edu' },
  { id: 't3', name: 'UCSC Boarders', university_id: 'u2', leader_name: 'Chathura Fernando', leader_email: 'chathura@ucsc.edu' },
  { id: 't4', name: 'Pera Pockets', university_id: 'u3', leader_name: 'Dinesh Kumara', leader_email: 'dinesh@pera.edu' },
  { id: 't5', name: 'MIT Sliders', university_id: 'u5', leader_name: 'Ethan Hunt', leader_email: 'ethan@mit.edu' },
  { id: 't6', name: 'Civil Rebounds', university_id: 'u1', leader_name: 'Fathima Riza', leader_email: 'fathima@mora.edu' },
];

const DEFAULT_PLAYERS = [
  { id: 'p1', team_id: 't1', full_name: 'Amara Silva', index_number: '220011A', is_leader: true },
  { id: 'p2', team_id: 't1', full_name: 'Kasun Wickramasinghe', index_number: '220012B', is_leader: false },
  { id: 'p3', team_id: 't2', full_name: 'Buddhika Perera', index_number: '210123T', is_leader: true },
  { id: 'p4', team_id: 't2', full_name: 'Dilan Pathirana', index_number: '210124V', is_leader: false },
  { id: 'p5', team_id: 't3', full_name: 'Chathura Fernando', index_number: '230554X', is_leader: true },
  { id: 'p6', team_id: 't3', full_name: 'Lahiru Silva', index_number: '230555Y', is_leader: false },
  { id: 'p7', team_id: 't4', full_name: 'Dinesh Kumara', index_number: '200432E', is_leader: true },
  { id: 'p8', team_id: 't4', full_name: 'Ruwan Perera', index_number: '200433F', is_leader: false },
  { id: 'p9', team_id: 't5', full_name: 'Ethan Hunt', index_number: '990022M', is_leader: true },
  { id: 'p10', team_id: 't5', full_name: 'John Doe', index_number: '990023N', is_leader: false },
  { id: 'p11', team_id: 't6', full_name: 'Fathima Riza', index_number: '220911V', is_leader: true },
  { id: 'p12', team_id: 't6', full_name: 'Sajith De Silva', index_number: '220912W', is_leader: false }
];

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [universities, setUniversities] = useState<University[]>(DEFAULT_UNIVERSITIES as University[]);
  const [settings, setSettings] = useState<TournamentSettings>({
    id: 'default',
    start_time: '09:00:00',
    tables_count: 10,
    break_duration_minutes: 10,
    match_duration_minutes: 45,
    created_at: new Date().toISOString()
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'schedule' | 'results' | 'register' | 'admin'>('live');

  // Checks if Supabase has custom endpoints set up
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isConfigured = supabaseUrl && 
      !supabaseUrl.includes('placeholder-domain') && 
      !supabaseUrl.includes('your-project-id') &&
      supabaseAnonKey && 
      !supabaseAnonKey.includes('your-anon-key-here');
    
    if (isConfigured) {
      setIsDemoMode(false);
      initSupabase();
    } else {
      setIsDemoMode(true);
      initDemoMode();
    }
  }, []);

  // Load pending registrations when admin state is true and in Supabase mode
  useEffect(() => {
    if (isAdmin && !isDemoMode) {
      getPendingRegistrations()
        .then((regs) => {
          setRegistrations(regs || []);
        })
        .catch((err) => {
          console.error('Error fetching pending registrations:', err);
        });
    }
  }, [isAdmin, isDemoMode]);

  // ----------------------------------------------------
  // DEMO MODE LOCAL STATE
  // ----------------------------------------------------
  const initDemoMode = () => {
    // Load local storage states
    const localTeams = localStorage.getItem('demo_teams');
    const localPlayers = localStorage.getItem('demo_players');
    const localRegs = localStorage.getItem('demo_regs');
    const localMatches = localStorage.getItem('demo_matches');
    const localSettings = localStorage.getItem('demo_settings');
    const localLogs = localStorage.getItem('demo_logs');
    const localAdmin = localStorage.getItem('demo_admin');

    if (!localTeams) {
      localStorage.setItem('demo_teams', JSON.stringify(DEFAULT_TEAMS));
      localStorage.setItem('demo_players', JSON.stringify(DEFAULT_PLAYERS));
      
      const seedRegs = DEFAULT_TEAMS.map(t => ({
        id: `r_${t.id}`,
        team_id: t.id,
        status: 'approved',
        created_at: new Date().toISOString(),
        team: {
          ...t,
          university: DEFAULT_UNIVERSITIES.find(u => u.id === t.university_id),
          players: DEFAULT_PLAYERS.filter(p => p.team_id === t.id)
        }
      }));
      localStorage.setItem('demo_regs', JSON.stringify(seedRegs));
      setRegistrations(seedRegs);
    } else {
      setRegistrations(JSON.parse(localRegs || '[]'));
    }

    if (localMatches) setMatches(JSON.parse(localMatches));
    if (localSettings) setSettings(JSON.parse(localSettings));
    if (localLogs) setAuditLogs(JSON.parse(localLogs));
    if (localAdmin) {
      const parsed = JSON.parse(localAdmin);
      setIsAdmin(true);
      setAdminEmail(parsed.email);
    }

    setLoading(false);
  };

  const saveDemoState = (key: string, data: any) => {
    localStorage.setItem(`demo_${key}`, JSON.stringify(data));
  };

  const addDemoAudit = (action: string, details: any) => {
    const newLog: AuditLog = {
      id: Math.random().toString(),
      admin_email: adminEmail || 'Sachintha',
      action,
      details,
      created_at: new Date().toISOString()
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    saveDemoState('logs', updated);
  };

  // ----------------------------------------------------
  // SUPABASE REAL DATABASE SYNC
  // ----------------------------------------------------
  const initSupabase = async () => {
    try {
      // Load user session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAdminEmail(session.user.email || '');
        const verified = await verifyAdmin(session.user.id);
        setIsAdmin(verified);
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setAdminEmail(session.user.email || '');
          const verified = await verifyAdmin(session.user.id);
          setIsAdmin(verified);
        } else {
          setIsAdmin(false);
          setAdminEmail('');
        }
      });

      // Fetch base matches, universities and settings
      const mData = await getMatches();
      setMatches(mData);

      const { data: uniData } = await supabase.from('universities').select('*').order('name');
      if (uniData && uniData.length > 0) setUniversities(uniData as University[]);

      const { data: sData } = await supabase.from('tournament_settings').select('*').single();
      if (sData) setSettings(sData);

      // Listen for realtime matches
      supabase.channel('supabase_db_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, async () => {
          const freshMatches = await getMatches();
          setMatches(freshMatches);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, async () => {
          if (isAdmin) {
            const regs = await getPendingRegistrations();
            setRegistrations(regs);
          }
        })
        .subscribe();

    } catch (err) {
      console.error('Supabase load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // AUTH LOGIC (SACINTHA / 240364H BYPASS + SUPABASE)
  // ----------------------------------------------------
  const login = async (username: string, pass: string): Promise<boolean> => {
    // 1. Local admin bypass test
    if (username.toLowerCase() === 'sachintha' && pass === '240364H') {
      setIsAdmin(true);
      setAdminEmail('Sachintha');
      if (isDemoMode) {
        saveDemoState('admin', { email: 'Sachintha' });
      }
      return true;
    }

    if (isDemoMode) return false;

    // 2. Try Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: pass
      });
      if (error) return false;

      const verified = await verifyAdmin(data.user.id);
      if (verified) {
        setIsAdmin(true);
        setAdminEmail(data.user.email || '');
        return true;
      }
      await supabase.auth.signOut();
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminEmail('');
    if (isDemoMode) {
      localStorage.removeItem('demo_admin');
    } else {
      supabase.auth.signOut();
    }
  };

  // ----------------------------------------------------
  // ACTION DISPATCHERS (ADAPTIVE FOR DEMO / DB)
  // ----------------------------------------------------

  const submitReg = async (payload: any) => {
    if (!isDemoMode) {
      return submitRegistration({
        ...payload,
        submittedByAdminEmail: isAdmin ? adminEmail : undefined
      });
    }

    // Demo Registration Simulation
    const newTeam = {
      id: `t_${Math.random()}`,
      name: payload.teamName,
      university_id: payload.universityId,
      leader_name: payload.leaderName,
      leader_email: payload.leaderEmail
    };

    const newPlayers = payload.players.map((p: any) => ({
      id: `p_${Math.random()}`,
      team_id: newTeam.id,
      full_name: p.fullName,
      index_number: p.indexNumber,
      is_leader: p.isLeader
    }));

    const status = isAdmin ? 'approved' : 'pending';

    const newReg = {
      id: `r_${newTeam.id}`,
      team_id: newTeam.id,
      status: status,
      created_at: new Date().toISOString(),
      team: {
        ...newTeam,
        university: DEFAULT_UNIVERSITIES.find(u => u.id === payload.universityId) 
          || (payload.universityId.startsWith('manual_') 
              ? { id: payload.universityId, name: payload.universityId.replace('manual_', '') } 
              : { id: payload.universityId, name: 'Custom Institution' }),
        players: newPlayers
      }
    };

    // Update Local Storage
    const teams = JSON.parse(localStorage.getItem('demo_teams') || '[]');
    const players = JSON.parse(localStorage.getItem('demo_players') || '[]');
    const regs = JSON.parse(localStorage.getItem('demo_regs') || '[]');

    teams.push(newTeam);
    players.push(...newPlayers);
    regs.push(newReg);

    saveDemoState('teams', teams);
    saveDemoState('players', players);
    saveDemoState('regs', regs);

    setRegistrations(regs);
    return { team: newTeam, registration: newReg };
  };

  const approveReg = async (regId: string) => {
    if (!isDemoMode) {
      await approveRegistration(regId, adminEmail);
      const freshRegs = await getPendingRegistrations();
      setRegistrations(freshRegs || []);
      return;
    }

    // Demo Mode Approve
    const regs = [...registrations];
    const foundIdx = regs.findIndex(r => r.id === regId);
    if (foundIdx !== -1) {
      regs[foundIdx].status = 'approved';
      setRegistrations(regs);
      saveDemoState('regs', regs);
      addDemoAudit('APPROVE_REGISTRATION', { registrationId: regId, teamName: regs[foundIdx].team.name });
    }
  };

  const rejectReg = async (regId: string) => {
    if (!isDemoMode) {
      await rejectRegistration(regId, adminEmail);
      const freshRegs = await getPendingRegistrations();
      setRegistrations(freshRegs || []);
      return;
    }

    // Demo Mode Reject
    const regs = [...registrations];
    const foundIdx = regs.findIndex(r => r.id === regId);
    if (foundIdx !== -1) {
      regs[foundIdx].status = 'rejected';
      setRegistrations(regs);
      saveDemoState('regs', regs);
      addDemoAudit('REJECT_REGISTRATION', { registrationId: regId });
    }
  };

  const generateDraw = async () => {
    if (!isDemoMode) {
      await generateScheduleAndBrackets(adminEmail);
      return;
    }

    // Demo Mode Bracket Generator
    const approved = registrations.filter(r => r.status === 'approved');
    if (approved.length < 2) {
      throw new Error('At least 2 approved players are needed to generate tournament matches.');
    }

    // Gather players
    const allPlayers: Player[] = [];
    approved.forEach(reg => {
      if (reg.team?.players) {
        reg.team.players.forEach((p: any) => {
          allPlayers.push({
            ...p,
            team: reg.team
          });
        });
      }
    });

    if (allPlayers.length < 2) {
      throw new Error('No registered players found.');
    }

    const N = allPlayers.length;
    let M = 2;
    while (M < N) M *= 2;

    // Place byes and players optimally to ensure minimum byes and no bye-bye pairings
    const drawSlots: (Player | null)[] = Array(M).fill(null);
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
        drawSlots[i * 2] = allPlayers[playerIdx++];
        drawSlots[i * 2 + 1] = allPlayers[playerIdx++];
      } else {
        drawSlots[i * 2] = allPlayers[playerIdx++];
        drawSlots[i * 2 + 1] = null;
      }
    }

    // Build rounds lists
    const roundsList: { roundName: string; matchesCount: number }[] = [];
    let tempM = M;
    while (tempM >= 2) {
      const count = tempM / 2;
      let name = '';
      if (tempM === 2) name = 'finals';
      else if (tempM === 4) name = 'semi_finals';
      else if (tempM === 8) name = 'quarter_finals';
      else if (tempM === 16) name = 'round_of_16';
      else name = `round_of_${tempM}`;
      roundsList.unshift({ roundName: name, matchesCount: count });
      tempM /= 2;
    }

    const localMatchesList: Match[] = [];
    const createdMap: { [key: string]: string } = {};

    const startDayTime = new Date();
    const slotDuration = settings.match_duration_minutes + settings.break_duration_minutes;

    for (let rIndex = 0; rIndex < roundsList.length; rIndex++) {
      const roundName = roundsList[rIndex].roundName;
      const count = roundsList[rIndex].matchesCount;
      const isFirst = rIndex === roundsList.length - 1;

      for (let mIndex = 0; mIndex < count; mIndex++) {
        const parentMatchId = rIndex > 0 ? createdMap[`${roundsList[rIndex - 1].roundName}_${Math.floor(mIndex / 2)}`] : null;
        const parentSlot = rIndex > 0 ? (mIndex % 2 === 0 ? 'A' : 'B') : null;

        let pA = isFirst ? drawSlots[mIndex * 2] : null;
        let pB = isFirst ? drawSlots[mIndex * 2 + 1] : null;

        const matchId = `match_${Math.random().toString(36).substr(2, 9)}`;

        const newMatch: Match = {
          id: matchId,
          player_a_id: pA?.id || null,
          player_b_id: pB?.id || null,
          winner_id: null,
          table_number: 0, // placeholder
          scheduled_time: startDayTime.toISOString(), // placeholder
          status: 'scheduled',
          score_a: 0,
          score_b: 0,
          current_frame: 1,
          match_start_time: null,
          total_duration_minutes: settings.match_duration_minutes,
          paused_at_timestamp: null,
          pause_duration_seconds: 0,
          is_paused: false,
          round: roundName,
          stage_index: rIndex + 1,
          next_match_id: parentMatchId,
          next_match_player_slot: parentSlot,
          created_at: new Date().toISOString(),
          player_a: pA || undefined,
          player_b: pB || undefined
        };

        localMatchesList.push(newMatch);
        createdMap[`${roundName}_${mIndex}`] = matchId;
      }
    }

    // Auto resolve byes in memory first
    localMatchesList.forEach(m => {
      const isFirst = m.stage_index === roundsList.length;
      if (isFirst && (m.player_a_id === null || m.player_b_id === null)) {
        const winnerId = m.player_a_id || m.player_b_id;
        if (winnerId) {
          m.status = 'finished';
          m.winner_id = winnerId;
          m.score_a = 0;
          m.score_b = 0;
          m.table_number = 0; // Bye match has no table

          // Propagate
          if (m.next_match_id && m.next_match_player_slot) {
            const parent = localMatchesList.find(pm => pm.id === m.next_match_id);
            if (parent) {
              const winnerPlayer = m.player_a_id ? m.player_a : m.player_b;
              if (m.next_match_player_slot === 'A') {
                parent.player_a_id = winnerId;
                parent.player_a = winnerPlayer;
              } else {
                parent.player_b_id = winnerId;
                parent.player_b = winnerPlayer;
              }
            }
          }
        }
      }
    });

    // Compute dependency minSlots for every match
    const minSlotMap: { [matchId: string]: number } = {};

    for (let rIndex = roundsList.length - 1; rIndex >= 0; rIndex--) {
      const roundName = roundsList[rIndex].roundName;
      const count = roundsList[rIndex].matchesCount;
      const isFirst = rIndex === roundsList.length - 1;

      for (let mIndex = 0; mIndex < count; mIndex++) {
        const matchObj = localMatchesList.find(m => m.round === roundName && (createdMap[`${roundName}_${mIndex}`] === m.id));
        const matchId = matchObj!.id;

        if (isFirst) {
          if (matchObj!.player_a_id === null || matchObj!.player_b_id === null) {
            minSlotMap[matchId] = -1; // bye match
          } else {
            minSlotMap[matchId] = 0; // played match in slot 0
          }
        } else {
          const childA = localMatchesList.find(c => c.next_match_id === matchId && c.next_match_player_slot === 'A');
          const childB = localMatchesList.find(c => c.next_match_id === matchId && c.next_match_player_slot === 'B');

          const slotA = childA ? minSlotMap[childA.id] : -1;
          const slotB = childB ? minSlotMap[childB.id] : -1;

          minSlotMap[matchId] = Math.max(slotA, slotB) + 1;
        }
      }
    }

    // Schedule played matches dynamically using greedy scheduler
    const playedMatches = localMatchesList.filter(m => minSlotMap[m.id] >= 0);
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
        m.scheduled_time = new Date(startDayTime.getTime() + currentSlot * slotDuration * 60 * 1000).toISOString();
        unscheduled = unscheduled.filter(u => u.id !== m.id);
      });

      currentSlot++;
    }

    setMatches(localMatchesList);
    saveDemoState('matches', localMatchesList);
    addDemoAudit('GENERATE_SCHEDULE', { matchesGenerated: playedMatches.length });
  };

  const startM = async (matchId: string) => {
    if (!isDemoMode) {
      await startMatch(matchId, adminEmail);
      return;
    }

    const updated = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          status: 'live' as const,
          match_start_time: new Date().toISOString(),
          is_paused: false,
          paused_at_timestamp: null,
          pause_duration_seconds: 0
        };
      }
      return m;
    });
    setMatches(updated);
    saveDemoState('matches', updated);
    addDemoAudit('START_MATCH', { matchId });
  };

  const pauseM = async (matchId: string) => {
    if (!isDemoMode) {
      await pauseMatch(matchId, adminEmail);
      return;
    }

    const updated = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          is_paused: true,
          paused_at_timestamp: new Date().toISOString()
        };
      }
      return m;
    });
    setMatches(updated);
    saveDemoState('matches', updated);
    addDemoAudit('PAUSE_MATCH', { matchId });
  };

  const resumeM = async (matchId: string) => {
    if (!isDemoMode) {
      await resumeMatch(matchId, adminEmail);
      return;
    }

    const updated = matches.map(m => {
      if (m.id === matchId) {
        let pauseSecs = m.pause_duration_seconds;
        if (m.paused_at_timestamp) {
          pauseSecs += Math.floor((Date.now() - new Date(m.paused_at_timestamp).getTime()) / 1000);
        }
        return {
          ...m,
          is_paused: false,
          paused_at_timestamp: null,
          pause_duration_seconds: pauseSecs
        };
      }
      return m;
    });
    setMatches(updated);
    saveDemoState('matches', updated);
    addDemoAudit('RESUME_MATCH', { matchId });
  };

  const updateScore = async (matchId: string, scoreA: number, scoreB: number, frame: number) => {
    if (!isDemoMode) {
      await updateMatchScore({ matchId, scoreA, scoreB, currentFrame: frame, adminEmail });
      return;
    }

    const updated = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          score_a: scoreA,
          score_b: scoreB,
          current_frame: frame
        };
      }
      return m;
    });
    setMatches(updated);
    saveDemoState('matches', updated);
    addDemoAudit('UPDATE_SCORE', { matchId, scoreA, scoreB, currentFrame: frame });
  };

  const confirmWinner = async (matchId: string, winnerId: string) => {
    if (!isDemoMode) {
      await confirmMatchResult({ matchId, winnerId, adminEmail });
      return;
    }

    const list = [...matches];
    const mIdx = list.findIndex(m => m.id === matchId);
    if (mIdx !== -1) {
      const match = list[mIdx];
      match.status = 'finished';
      match.winner_id = winnerId;
      match.winner = match.player_a_id === winnerId ? match.player_a : match.player_b;

      // Progress winner
      if (match.next_match_id && match.next_match_player_slot) {
        const parent = list.find(pm => pm.id === match.next_match_id);
        if (parent) {
          if (match.next_match_player_slot === 'A') {
            parent.player_a_id = winnerId;
            parent.player_a = match.winner;
          } else {
            parent.player_b_id = winnerId;
            parent.player_b = match.winner;
          }
        }
      }

      setMatches(list);
      saveDemoState('matches', list);
      addDemoAudit('CONFIRM_RESULT', { matchId, winnerId });
    }
  };

  const reschedule = async (matchId: string, table: number, time: string) => {
    if (!isDemoMode) {
      await rescheduleMatch({ matchId, tableNumber: table, scheduledTime: time, adminEmail });
      return;
    }

    const updated = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          table_number: table,
          scheduled_time: time
        };
      }
      return m;
    });
    setMatches(updated);
    saveDemoState('matches', updated);
    addDemoAudit('RESCHEDULE_MATCH', { matchId, tableNumber: table, scheduledTime: time });
  };

  const overrideSlot = async (matchId: string, slot: 'A' | 'B', playerId: string | null) => {
    if (!isDemoMode) {
      await overrideBracketMatchSlot({ matchId, slot, playerId, adminEmail });
      return;
    }

    // Demo Mode Override lookup
    const roster = DEFAULT_PLAYERS.map(p => ({
      ...p,
      team: DEFAULT_TEAMS.find(t => t.id === p.team_id)
    })) as unknown as Player[];

    const updated = matches.map(m => {
      if (m.id === matchId) {
        const foundPlayer = playerId ? roster.find(p => p.id === playerId) : undefined;
        if (slot === 'A') {
          return {
            ...m,
            player_a_id: playerId,
            player_a: foundPlayer || undefined
          };
        } else {
          return {
            ...m,
            player_b_id: playerId,
            player_b: foundPlayer || undefined
          };
        }
      }
      return m;
    });
    setMatches(updated);
    saveDemoState('matches', updated);
    addDemoAudit('MANUAL_BRACKET_OVERRIDE', { matchId, slot, playerId });
  };

  const updateSettings = async (start: string, tables: number, duration: number, breakMins: number) => {
    if (!isDemoMode) {
      const { error } = await supabase
        .from('tournament_settings')
        .update({
          start_time: start + ':00',
          tables_count: tables,
          match_duration_minutes: duration,
          break_duration_minutes: breakMins
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw new Error(error.message);
      
      const { data: sData } = await supabase.from('tournament_settings').select('*').single();
      if (sData) setSettings(sData);
      return;
    }

    const updated: TournamentSettings = {
      ...settings,
      start_time: start + ':00',
      tables_count: tables,
      match_duration_minutes: duration,
      break_duration_minutes: breakMins
    };
    setSettings(updated);
    saveDemoState('settings', updated);
    addDemoAudit('UPDATE_SETTINGS', updated);
  };

  return (
    <TournamentContext.Provider
      value={{
        isDemoMode,
        isAdmin,
        adminEmail,
        matches,
        registrations,
        universities,
        settings,
        auditLogs,
        loading,
        activeTab,
        setActiveTab,
        login,
        logout,
        submitReg,
        approveReg,
        rejectReg,
        generateDraw,
        startM,
        pauseM,
        resumeM,
        updateScore,
        confirmWinner,
        reschedule,
        overrideSlot,
        updateSettings
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) throw new Error('useTournament must be used within a TournamentProvider');
  return context;
}
