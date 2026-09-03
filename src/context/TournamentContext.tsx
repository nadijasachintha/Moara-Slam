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
  getApprovedPlayers,
  createManualMatch,
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
  createMatch: (payload: any) => Promise<void>;
  getPlayers: () => Promise<any[]>;
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
  const [syncChannel, setSyncChannel] = useState<any>(null);

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

      // Listen for realtime matches and instant broadcast updates
      const channel = supabase.channel('supabase_db_sync')
        .on('broadcast', { event: 'optimistic_score_update' }, (payload: any) => {
          const { matchId, scoreA, scoreB, currentFrame } = payload.payload;
          setMatches((prevMatches) => 
            prevMatches.map((m) => {
              if (m.id === matchId) {
                return {
                  ...m,
                  score_a: scoreA,
                  score_b: scoreB,
                  current_frame: currentFrame,
                };
              }
              return m;
            })
          );
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, async (payload: any) => {
          const oldMatch = payload.old;
          const newMatch = payload.new;

          // If only scores or frames changed, merge them locally to avoid fetching all matches
          const isOnlyScoreOrFrame = oldMatch && newMatch && 
            oldMatch.status === newMatch.status && 
            oldMatch.winner_id === newMatch.winner_id &&
            oldMatch.player_a_id === newMatch.player_a_id &&
            oldMatch.player_b_id === newMatch.player_b_id &&
            oldMatch.is_paused === newMatch.is_paused;

          if (isOnlyScoreOrFrame) {
            setMatches((prevMatches) => 
              prevMatches.map((m) => {
                if (m.id === newMatch.id) {
                  return {
                    ...m,
                    score_a: newMatch.score_a,
                    score_b: newMatch.score_b,
                    current_frame: newMatch.current_frame,
                  };
                }
                return m;
              })
            );
          } else {
            const freshMatches = await getMatches();
            setMatches(freshMatches);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, async () => {
          if (isAdmin) {
            const regs = await getPendingRegistrations();
            setRegistrations(regs);
          }
        })
        .subscribe();
        
      setSyncChannel(channel);

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
      const res = await submitRegistration({
        ...payload,
        submittedByAdminEmail: isAdmin ? adminEmail : undefined
      });
      if (res && res.success === false) {
        throw new Error(res.error || 'An unexpected registration error occurred.');
      }
      return res;
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

  const createMatch = async (payload: any) => {
    if (isDemoMode) {
      alert('Cannot create manual match in demo mode.');
      return;
    }
    if (!isAdmin) throw new Error('Unauthorized');
    const res = await createManualMatch({ ...payload, adminEmail });
    if (res.success) {
      await fetchMatches();
    }
  };

  const getPlayers = async () => {
    if (isDemoMode) return DEFAULT_PLAYERS;
    return await getApprovedPlayers();
  };



  const startM = async (matchId: string) => {
    // 1. Optimistic local update
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

    // 2. Database update in background
    if (!isDemoMode) {
      startMatch(matchId, adminEmail).catch((err) => {
        console.error('Failed to start match in database:', err);
      });
      return;
    }

    saveDemoState('matches', updated);
    addDemoAudit('START_MATCH', { matchId });
  };

  const pauseM = async (matchId: string) => {
    // 1. Optimistic local update
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

    // 2. Database update in background
    if (!isDemoMode) {
      pauseMatch(matchId, adminEmail).catch((err) => {
        console.error('Failed to pause match in database:', err);
      });
      return;
    }

    saveDemoState('matches', updated);
    addDemoAudit('PAUSE_MATCH', { matchId });
  };

  const resumeM = async (matchId: string) => {
    // 1. Optimistic local update
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

    // 2. Database update in background
    if (!isDemoMode) {
      resumeMatch(matchId, adminEmail).catch((err) => {
        console.error('Failed to resume match in database:', err);
      });
      return;
    }

    saveDemoState('matches', updated);
    addDemoAudit('RESUME_MATCH', { matchId });
  };

  const updateScore = async (matchId: string, scoreA: number, scoreB: number, frame: number) => {
    // 1. Optimistic local update
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

    // Broadcast instant update to all other connected clients
    if (syncChannel) {
      syncChannel.send({
        type: 'broadcast',
        event: 'optimistic_score_update',
        payload: { matchId, scoreA, scoreB, currentFrame: frame }
      });
    }

    // 2. Database update in background
    if (!isDemoMode) {
      updateMatchScore({ matchId, scoreA, scoreB, currentFrame: frame, adminEmail }).catch((err) => {
        console.error('Failed to update score in database:', err);
      });
      return;
    }

    saveDemoState('matches', updated);
    addDemoAudit('UPDATE_SCORE', { matchId, scoreA, scoreB, currentFrame: frame });
  };

  const confirmWinner = async (matchId: string, winnerId: string) => {
    // 1. Optimistic local update
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
    }

    // 2. Database update in background
    if (!isDemoMode) {
      confirmMatchResult({ matchId, winnerId, adminEmail }).catch((err) => {
        console.error('Failed to confirm result in database:', err);
      });
      return;
    }

    saveDemoState('matches', list);
    addDemoAudit('CONFIRM_RESULT', { matchId, winnerId });
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
