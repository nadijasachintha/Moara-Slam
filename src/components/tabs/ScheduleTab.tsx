'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Match } from '@/types/database.types';
import { 
  Calendar, 
  Clock, 
  Edit, 
  Shuffle, 
  Loader2, 
  Play,
  Settings,
  X
} from 'lucide-react';

export default function ScheduleTab() {
  const { 
    matches, 
    isAdmin, 
    createMatch, 
    getPlayers,
    reschedule, 
    startM, 
    overrideSlot 
  } = useTournament();

  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');

  // Rescheduling State
  const [reschedulingMatchId, setReschedulingMatchId] = useState<string | null>(null);
  const [newTable, setNewTable] = useState(1);
  const [newTime, setNewTime] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Override State
  const [overridingMatchId, setOverridingMatchId] = useState<string | null>(null);
  const [overrideSlotName, setOverrideSlotName] = useState<'A' | 'B'>('A');
  const [overridePlayerId, setOverridePlayerId] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  // Manual Match Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [newMatchRound, setNewMatchRound] = useState('group_a');
  const [newMatchCategory, setNewMatchCategory] = useState<'boys' | 'girls'>('boys');
  
  const [newMatchType, setNewMatchType] = useState<'single' | 'double'>('single');
  const [uniA, setUniA] = useState('');
  const [uniB, setUniB] = useState('');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');

  const [newMatchPlayerA, setNewMatchPlayerA] = useState('');
  const [newMatchPlayerA2, setNewMatchPlayerA2] = useState('');
  const [newMatchPlayerB, setNewMatchPlayerB] = useState('');
  const [newMatchPlayerB2, setNewMatchPlayerB2] = useState('');
  
  const [newMatchTable, setNewMatchTable] = useState(1);
  const [newMatchTime, setNewMatchTime] = useState('');

  // Load players when opening create modal
  const handleOpenCreateModal = async () => {
    try {
      const p = await getPlayers();
      setPlayersList(p);
      setShowCreateModal(true);
      // Set default time to now (HH:mm format for time input)
      const localDate = new Date();
      const tzOffset = localDate.getTimezoneOffset() * 60000;
      const localTimeString = new Date(localDate.getTime() - tzOffset).toISOString().slice(11, 16);
      setNewMatchTime(localTimeString);
      
      // Select first available valid table (not live)
      const liveTables = matches.filter(m => m.status === 'live').map(m => m.table_number);
      const availableTables = Array.from({length: 10}, (_, i) => i + 1).filter(t => !liveTables.includes(t));
      setNewMatchTable(availableTables.length > 0 ? availableTables[0] : 1);
      
    } catch (err: any) {
      alert('Error fetching players: ' + err.message);
    }
  };

  const handleCreateMatch = async () => {
    if (!newMatchPlayerA || !newMatchPlayerB) {
      alert('Please select Player 1 for both teams');
      return;
    }
    if (newMatchType === 'double' && (!newMatchPlayerA2 || !newMatchPlayerB2)) {
      alert('Please select Player 2 for both teams in a double match');
      return;
    }
    if (newMatchPlayerA === newMatchPlayerA2 || newMatchPlayerB === newMatchPlayerB2) {
      alert('A player cannot be selected twice in the same team');
      return;
    }
    
    setCreatingMatch(true);
    try {
      // Build an ISO string using today's date and the selected time
      const todayStr = new Date().toISOString().split('T')[0];
      const scheduledIso = `${todayStr}T${newMatchTime}:00.000Z`;

      await createMatch({
        round: newMatchRound,
        category: newMatchCategory,
        matchType: newMatchType,
        playerAId: newMatchPlayerA,
        playerA2Id: newMatchType === 'double' ? newMatchPlayerA2 : null,
        playerBId: newMatchPlayerB,
        playerB2Id: newMatchType === 'double' ? newMatchPlayerB2 : null,
        tableNumber: newMatchTable,
        scheduledTime: scheduledIso
      });
      setShowCreateModal(false);
      setNewMatchPlayerA('');
      setNewMatchPlayerA2('');
      setNewMatchPlayerB('');
      setNewMatchPlayerB2('');
      setTeamA(''); setTeamB('');
      setUniA(''); setUniB('');
    } catch (err: any) {
      alert(err.message || 'Error creating match');
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleStartMatch = async (matchId: string) => {
    try {
      await startM(matchId);
    } catch (err: any) {
      alert(err.message || 'Error starting match');
    }
  };

  const openRescheduleModal = (match: Match) => {
    setReschedulingMatchId(match.id);
    setNewTable(match.table_number);
    const localDate = new Date(match.scheduled_time);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setNewTime(localISOTime);
  };

  const saveRescheduleAction = async () => {
    if (!reschedulingMatchId) return;
    setSavingReschedule(true);
    try {
      await reschedule(reschedulingMatchId, newTable, new Date(newTime).toISOString());
      setReschedulingMatchId(null);
    } catch (err: any) {
      alert(err.message || 'Error saving schedule updates');
    } finally {
      setSavingReschedule(false);
    }
  };

  const handleOverrideSlotAction = async () => {
    if (!overridingMatchId) return;
    setSavingOverride(true);
    try {
      const targetPlayerId = overridePlayerId.trim() === '' ? null : overridePlayerId.trim();
      await overrideSlot(overridingMatchId, overrideSlotName, targetPlayerId);
      setOverridingMatchId(null);
      setOverridePlayerId('');
    } catch (err: any) {
      alert(err.message || 'Error overriding bracket slot');
    } finally {
      setSavingOverride(false);
    }
  };

  const roundOrder = ['round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'finals'];
  const groupedByRound: { [key: string]: Match[] } = {};
  matches.forEach((m) => {
    if (!groupedByRound[m.round]) {
      groupedByRound[m.round] = [];
    }
    groupedByRound[m.round].push(m);
  });

  const activeRounds = roundOrder.filter((r) => groupedByRound[r] && groupedByRound[r].length > 0);

  // Group matches by scheduled_time for batch display in chronological list view
  const matchesByTime: { [time: string]: Match[] } = {};
  matches.forEach((m) => {
    const timeKey = m.scheduled_time;
    if (!matchesByTime[timeKey]) {
      matchesByTime[timeKey] = [];
    }
    matchesByTime[timeKey].push(m);
  });

  const sortedTimes = Object.keys(matchesByTime).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const renderScoreCard = (match: Match) => {
    const playerA = match.player_a;
    const playerA2 = match.player_a2;
    const playerB = match.player_b;
    const playerB2 = match.player_b2;
    
    const nameA = playerA ? playerA.full_name : 'TBD';
    const nameA2 = playerA2 ? ` & ${playerA2.full_name}` : '';
    const displayA = `${nameA}${nameA2}`;
    const uniA = playerA ? (playerA.team as any)?.university?.name : 'N/A';
    
    const nameB = playerB ? playerB.full_name : 'TBD';
    const nameB2 = playerB2 ? ` & ${playerB2.full_name}` : '';
    const displayB = `${nameB}${nameB2}`;
    const uniB = playerB ? (playerB.team as any)?.university?.name : 'N/A';
    
    const timeStr = new Date(match.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isBye = match.status === 'finished' && (match.player_a_id === null || match.player_b_id === null);
    const isTBD = match.player_a_id === null || match.player_b_id === null;

    if (isBye) {
      const advancedPlayerName = playerA ? displayA : displayB;
      const advancedPlayerUni = playerA ? uniA : uniB;
      return (
        <div 
          key={match.id}
          className="relative overflow-hidden bg-gradient-to-br from-[#0c1f0f] to-[#0f2d17] border border-[#22c55e]/15 rounded-2xl p-4 flex flex-col justify-between h-40 opacity-75"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-400">
              Bye Slot
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
              Advanced
            </span>
          </div>

          <div className="text-center py-1">
            <h4 className="font-extrabold text-white text-sm truncate leading-tight">{advancedPlayerName}</h4>
            <span className="text-[9px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{advancedPlayerUni}</span>
            <span className="text-[10px] text-[#22c55e] font-extrabold block mt-2">Moved to the next round</span>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{match.round.replace('_', ' ')}</span>
            <span>Score: 0 - 0</span>
          </div>
        </div>
      );
    }

    if (isTBD && match.status === 'scheduled') {
      return (
        <div 
          key={match.id}
          className="relative overflow-hidden bg-slate-900/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-40 opacity-60"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-400">
              TBD Match
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full">
              Waiting
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 py-1">
            <div className="flex-1 text-center min-w-0">
              <h4 className="font-extrabold text-slate-400 text-[10px] truncate leading-tight">{displayA}</h4>
              <span className="text-[8px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniA}</span>
            </div>
            <span className="text-[9px] font-extrabold text-slate-600 px-2 py-0.5 leading-none">VS</span>
            <div className="flex-1 text-center min-w-0">
              <h4 className="font-extrabold text-slate-400 text-[10px] truncate leading-tight">{displayB}</h4>
              <span className="text-[8px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniB}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{match.round.replace('_', ' ')}</span>
            <span>Score: 0 - 0</span>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={match.id} 
        className={`relative overflow-hidden bg-gradient-to-br from-[#0c1f0f] to-[#0f2d17] border rounded-2xl shadow-lg p-4 flex flex-col justify-between space-y-4 transition-all duration-300 ${
          match.status === 'live' 
            ? 'border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
            : 'border-white/5'
        }`}
      >
        {/* Card Header (Table & Status & Scheduled Time) */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-300">
              Table {match.table_number}
            </span>
            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 ${
              match.status === 'live'
                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                : match.status === 'finished'
                ? 'bg-white/10 text-slate-400'
                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
            }`}>
              {match.status === 'live' && <span className="w-1 h-1 bg-slate-950 rounded-full"></span>}
              {match.status}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#22c55e]" />
            {timeStr}
          </span>
        </div>

        {/* Central Display */}
        <div className="flex items-center justify-between gap-2 py-1">
          {/* Player A */}
          <div className="flex-1 text-center min-w-0">
            <h4 className="font-extrabold text-white text-xs truncate leading-tight">{displayA}</h4>
            <span className="text-[9px] text-slate-400 block truncate mt-0.5 uppercase tracking-wider">{uniA}</span>
          </div>

          {/* Central VS */}
          <div className="flex flex-col items-center justify-center px-3 shrink-0">
            <span className="text-[10px] font-extrabold bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] px-2.5 py-0.5 rounded-full uppercase tracking-widest text-center leading-none">
              VS
            </span>
          </div>

          {/* Player B */}
          <div className="flex-1 text-center min-w-0">
            <h4 className="font-extrabold text-white text-xs truncate leading-tight">{displayB}</h4>
            <span className="text-[9px] text-slate-400 block truncate mt-0.5 uppercase tracking-wider">{uniB}</span>
          </div>
        </div>

        {/* Card Footer (Round Details & Admin actions) */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {match.round.replace('_', ' ')}
          </span>

          {isAdmin && (
            <div className="flex gap-1.5">
              <button
                onClick={() => openRescheduleModal(match)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-extrabold text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                title="Reschedule Match"
              >
                <Edit className="w-3 h-3 text-[#22c55e]" /> Resched
              </button>

              {match.status === 'scheduled' && (
                <button
                  onClick={() => handleStartMatch(match.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-md"
                >
                  <Play className="w-3 h-3 fill-slate-950" /> Start
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Matches & Brackets</h2>
          <p className="text-xs text-slate-400 mt-0.5">Explore the schedule list or track the tournament tree.</p>
        </div>

        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl w-fit">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Schedule List
          </button>
          <button
            onClick={() => setViewMode('bracket')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'bracket'
                ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Visual Bracket
          </button>
        </div>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={handleOpenCreateModal}
            className="bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#22c55e]/90 hover:to-[#16a34a]/90 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(0,242,254,0.15)] flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" /> Create Match Manually
          </button>
        </div>
      )}
      {/* VIEW MODE: CHRONOLOGICAL LIST */}
      {viewMode === 'list' && matches.length > 0 && (
        <div className="space-y-8">
          {sortedTimes.map((timeKey, idx) => {
            const timeMatches = matchesByTime[timeKey].sort((a, b) => a.table_number - b.table_number);
            const timeDate = new Date(timeKey);
            const timeStr = timeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = timeDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

            return (
              <div key={timeKey} className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#22c55e]" />
                    Batch {idx + 1} — {timeStr}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {timeMatches.length} Boards Allocated
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {timeMatches.map(renderScoreCard)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE: VISUAL KNOCKOUT BRACKET */}
      {viewMode === 'bracket' && matches.length > 0 && (
        <div className="w-full overflow-x-auto pb-6 select-none">
          <div className="flex gap-8 px-2 min-w-[800px] justify-between">
            {activeRounds.map((roundKey) => {
              const roundMatches = groupedByRound[roundKey] || [];
              let roundTitle = roundKey.replace('_', ' ').replace('round of', 'Round of');
              if (roundKey === 'semi_finals') roundTitle = 'Semifinals';
              if (roundKey === 'finals') roundTitle = 'Championship Final';

              return (
                <div key={roundKey} className="flex-1 flex flex-col gap-6">
                  {/* Round Heading */}
                  <div className="text-center border-b border-white/5 pb-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                      {roundTitle}
                    </h4>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase">
                      {roundMatches.length} Matches
                    </span>
                  </div>

                  {/* Round Matches List */}
                  <div className="flex-1 flex flex-col justify-around gap-6 py-4">
                    {roundMatches.map((m) => {
                      const nameA = m.player_a ? m.player_a.full_name : 'TBD';
                      const nameB = m.player_b ? m.player_b.full_name : 'TBD';
                      const isWinnerA = m.status === 'finished' && m.winner_id === m.player_a_id;
                      const isWinnerB = m.status === 'finished' && m.winner_id === m.player_b_id;

                      return (
                        <div 
                          key={m.id} 
                          className={`relative glass-panel rounded-xl p-3 border text-xs space-y-2 transition-all ${
                            m.status === 'live' 
                              ? 'border-emerald-500/30' 
                              : 'border-white/5'
                          }`}
                        >
                          {/* Round Match Metadata */}
                          <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold border-b border-white/5 pb-1">
                            <span>T-{m.table_number}</span>
                            <span>{new Date(m.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {/* Player A slot */}
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold truncate max-w-[120px] ${
                              isWinnerA ? 'text-[#22c55e] font-bold' : m.winner_id ? 'text-slate-500' : 'text-white'
                            }`}>
                              {nameA}
                            </span>
                            <span className={`font-bold ${isWinnerA ? 'text-[#22c55e]' : 'text-slate-400'}`}>
                              {m.score_a}
                            </span>
                          </div>

                          {/* Player B slot */}
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold truncate max-w-[120px] ${
                              isWinnerB ? 'text-[#22c55e] font-bold' : m.winner_id ? 'text-slate-500' : 'text-white'
                            }`}>
                              {nameB}
                            </span>
                            <span className={`font-bold ${isWinnerB ? 'text-[#22c55e]' : 'text-slate-400'}`}>
                              {m.score_b}
                            </span>
                          </div>

                          {/* Admin manual slot overrides */}
                          {isAdmin && (
                            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                              <span className="text-[8px] text-[#22c55e] font-semibold">OVERRIDE:</span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => {
                                    setOverridingMatchId(m.id);
                                    setOverrideSlotName('A');
                                  }}
                                  className="text-[8px] uppercase tracking-wider font-extrabold bg-white/5 border border-white/10 px-1 py-0.5 rounded hover:bg-white/10"
                                >
                                  Slot A
                                </button>
                                <button
                                  onClick={() => {
                                    setOverridingMatchId(m.id);
                                    setOverrideSlotName('B');
                                  }}
                                  className="text-[8px] uppercase tracking-wider font-extrabold bg-white/5 border border-white/10 px-1 py-0.5 rounded hover:bg-white/10"
                                >
                                  Slot B
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RESCHEDULING DIALOG */}
      {reschedulingMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl p-6 border border-white/10 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1">
                <Settings className="w-4 h-4 text-[#22c55e]" /> Reschedule Match
              </h3>
              <button 
                onClick={() => setReschedulingMatchId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Assign Table Number</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newTable}
                  onChange={(e) => setNewTable(parseInt(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Match Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all color-scheme-dark"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setReschedulingMatchId(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-2.5 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRescheduleAction}
                  disabled={savingReschedule}
                  className="flex-1 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#22c55e]/90 hover:to-[#16a34a]/90 text-slate-950 rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  {savingReschedule ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Apply Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL OVERRIDE DIALOG */}
      {overridingMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl p-6 border border-white/10 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1">
                <Settings className="w-4 h-4 text-[#22c55e]" /> Bracket Override Slot {overrideSlotName}
              </h3>
              <button 
                onClick={() => setOverridingMatchId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-slate-400">
                Type in a Player ID to force slot assignment. If empty, the slot is cleared.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Player UUID</label>
                <input
                  type="text"
                  placeholder="Paste player uuid"
                  value={overridePlayerId}
                  onChange={(e) => setOverridePlayerId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOverridingMatchId(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-2.5 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideSlotAction}
                  disabled={savingOverride}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                >
                  {savingOverride ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Apply Override'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CREATE MATCH MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-white/10 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#22c55e]" /> Create Match
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Compute visible universities based on round */}
            {(() => {
              const isGroupA = newMatchRound === 'group_a';
              const isGroupB = newMatchRound === 'group_b';
              const checkUni = (name: string) => {
                const n = name.toLowerCase();
                if (isGroupA) return n.includes('moratuwa') || n.includes('colombo') || n.includes('japura') || n.includes('iit') || n.includes('sri jayewardenepura');
                if (isGroupB) return n.includes('kelaniya') || n.includes('sliit') || n.includes('sabaragamuwa') || n.includes('ruhuna');
                return true;
              };
              
              const availableUnis = Array.from(new Set(playersList.map(p => p.team?.university?.name)))
                                        .filter(Boolean)
                                        .filter(name => checkUni(name as string));

              return (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Tournament Round</label>
                  <select
                    value={newMatchRound}
                    onChange={(e) => setNewMatchRound(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all appearance-none"
                  >
                    <option value="group_a">Group A</option>
                    <option value="group_b">Group B</option>
                    <option value="semi_finals">Semi Finals</option>
                    <option value="finals">Finals</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Gender Category</label>
                  <select
                    value={newMatchCategory}
                    onChange={(e) => setNewMatchCategory(e.target.value as 'boys'|'girls')}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all appearance-none"
                  >
                    <option value="boys">Boys Tournament</option>
                    <option value="girls">Girls Tournament</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Match Type</label>
                  <select
                    value={newMatchType}
                    onChange={(e) => setNewMatchType(e.target.value as 'single'|'double')}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all appearance-none"
                  >
                    <option value="single">Single Match</option>
                    <option value="double">Double Match</option>
                  </select>
                </div>
              </div>

              {/* TEAM A SELECTION */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-[#22c55e] uppercase tracking-widest">Competitor A</h4>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={uniA}
                    onChange={(e) => { setUniA(e.target.value); setTeamA(''); setNewMatchPlayerA(''); setNewMatchPlayerA2(''); }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select University</option>
                    {availableUnis.map(u => (
                      <option key={u as string} value={u as string}>{u as string}</option>
                    ))}
                  </select>
                  <select
                    value={teamA}
                    onChange={(e) => { setTeamA(e.target.value); setNewMatchPlayerA(''); setNewMatchPlayerA2(''); }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    disabled={!uniA}
                  >
                    <option value="">Select Team</option>
                    {Array.from(new Set(playersList.filter(p => p.team?.university?.name === uniA).map(p => p.team?.name))).filter(Boolean).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <select
                    value={newMatchPlayerA}
                    onChange={(e) => setNewMatchPlayerA(e.target.value)}
                    className="w-full bg-black/40 border border-[#22c55e]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    disabled={!teamA}
                  >
                    <option value="">Player 1</option>
                    {playersList.filter(p => p.team?.name === teamA).map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                  {newMatchType === 'double' && (
                    <select
                      value={newMatchPlayerA2}
                      onChange={(e) => setNewMatchPlayerA2(e.target.value)}
                      className="w-full bg-black/40 border border-[#22c55e]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      disabled={!teamA}
                    >
                      <option value="">Player 2</option>
                      {playersList.filter(p => p.team?.name === teamA).map(p => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* TEAM B SELECTION */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Competitor B</h4>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={uniB}
                    onChange={(e) => { setUniB(e.target.value); setTeamB(''); setNewMatchPlayerB(''); setNewMatchPlayerB2(''); }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select University</option>
                    {availableUnis.map(u => (
                      <option key={u as string} value={u as string}>{u as string}</option>
                    ))}
                  </select>
                  <select
                    value={teamB}
                    onChange={(e) => { setTeamB(e.target.value); setNewMatchPlayerB(''); setNewMatchPlayerB2(''); }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    disabled={!uniB}
                  >
                    <option value="">Select Team</option>
                    {Array.from(new Set(playersList.filter(p => p.team?.university?.name === uniB).map(p => p.team?.name))).filter(Boolean).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <select
                    value={newMatchPlayerB}
                    onChange={(e) => setNewMatchPlayerB(e.target.value)}
                    className="w-full bg-black/40 border border-amber-400/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    disabled={!teamB}
                  >
                    <option value="">Player 1</option>
                    {playersList.filter(p => p.team?.name === teamB).map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                  {newMatchType === 'double' && (
                    <select
                      value={newMatchPlayerB2}
                      onChange={(e) => setNewMatchPlayerB2(e.target.value)}
                      className="w-full bg-black/40 border border-amber-400/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      disabled={!teamB}
                    >
                      <option value="">Player 2</option>
                      {playersList.filter(p => p.team?.name === teamB).map(p => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Table Number</label>
                  <select
                    value={newMatchTable}
                    onChange={(e) => setNewMatchTable(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all appearance-none"
                  >
                    {Array.from({length: 10}, (_, i) => i + 1).map(t => {
                      const isLive = matches.some(m => m.status === 'live' && m.table_number === t);
                      return (
                        <option key={t} value={t} disabled={isLive}>
                          Table {t} {isLive ? '(In Use)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Scheduled Time</label>
                  <input
                    type="time"
                    value={newMatchTime}
                    onChange={(e) => setNewMatchTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all color-scheme-dark"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-3 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMatch}
                  disabled={creatingMatch}
                  className="flex-1 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#22c55e]/90 hover:to-[#16a34a]/90 text-slate-950 rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  {creatingMatch ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Match'}
                </button>
              </div>
            </div>
            );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

