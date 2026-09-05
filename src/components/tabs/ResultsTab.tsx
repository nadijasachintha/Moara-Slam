'use client';

import React, { useState, useEffect } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Match } from '@/types/database.types';
import TournamentBracket from '@/components/TournamentBracket';
import {
  Trophy, 
  History,
  ArrowRight,
  Edit,
  Save,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllTeams } from '@/app/actions';

export default function ResultsTab() {
  const { matches, isAdmin, updateStandingsOverride, getPlayers, updateChampions } = useTournament();
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [allTeamsList, setAllTeamsList] = useState<any[]>([]);

  useEffect(() => {
    getPlayers().then(setPlayersList);
    getAllTeams().then(setAllTeamsList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [expandedEncounterId, setExpandedEncounterId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'boys' | 'girls'>('boys');
  
  // Standings Override State
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [standingsForm, setStandingsForm] = useState<any[]>([]);
  const [savingStandings, setSavingStandings] = useState(false);

  const openEditStandings = (groupKey: string, data: any[]) => {
    setEditingGroup(groupKey);
    setStandingsForm(data.map(t => ({
      id: t.id,
      teamName: t.teamName,
      played: t.manual_played !== null && t.manual_played !== undefined ? t.manual_played : '',
      wins: t.manual_wins !== null && t.manual_wins !== undefined ? t.manual_wins : '',
      points: t.manual_points !== null && t.manual_points !== undefined ? t.manual_points : '',
      rank: t.manual_rank !== null && t.manual_rank !== undefined ? t.manual_rank : ''
    })));
  };

  const handleStandingsChange = (teamId: string, field: string, value: string) => {
    setStandingsForm(prev => prev.map(t => {
      if (t.id === teamId) {
        return { ...t, [field]: value === '' ? '' : parseInt(value, 10) };
      }
      return t;
    }));
  };

  const saveStandingsOverrides = async () => {
    setSavingStandings(true);
    try {
      for (const t of standingsForm) {
        await updateStandingsOverride(
          t.id, 
          t.played === '' ? null : t.played,
          t.wins === '' ? null : t.wins,
          t.points === '' ? null : t.points,
          t.rank === '' || t.rank === undefined || t.rank === null ? null : t.rank
        );
      }
      const updatedPlayers = await getPlayers();
      setPlayersList(updatedPlayers);
      setEditingGroup(null);
    } catch (err: any) {
      alert(err.message || 'Error updating standings');
    } finally {
      setSavingStandings(false);
    }
  };

  // Champions State
  const [champForm, setChampForm] = useState({ first: '', second: '', third: '' });
  const [savingChampions, setSavingChampions] = useState(false);

  // Extract unique teams for the active category
  const uniqueTeams = allTeamsList.filter(t => t.category === activeCategory);

  // Get current champions
  const champ1st = uniqueTeams.find(t => t.tournament_rank === 1);
  const champ2nd = uniqueTeams.find(t => t.tournament_rank === 2);
  const champ3rd = uniqueTeams.find(t => t.tournament_rank === 3);

  useEffect(() => {
    setChampForm({
      first: champ1st?.id || '',
      second: champ2nd?.id || '',
      third: champ3rd?.id || ''
    });
  }, [champ1st?.id, champ2nd?.id, champ3rd?.id, activeCategory]);

  const handleSaveChampions = async () => {
    setSavingChampions(true);
    try {
      await updateChampions(
        activeCategory, 
        champForm.first || null, 
        champForm.second || null, 
        champForm.third || null
      );
      // Local state update (optimistic)
      setAllTeamsList(prev => prev.map(t => {
        if (t.category !== activeCategory) return t;
        
        let newRank = null;
        if (t.id === champForm.first) newRank = 1;
        if (t.id === champForm.second) newRank = 2;
        if (t.id === champForm.third) newRank = 3;
        
        return { ...t, tournament_rank: newRank };
      }));
      setPlayersList(prev => prev.map(p => {
        if (!p.team) return p;
        if (p.team.category !== activeCategory) return p;
        
        let newRank = null;
        if (p.team.id === champForm.first) newRank = 1;
        if (p.team.id === champForm.second) newRank = 2;
        if (p.team.id === champForm.third) newRank = 3;
        
        return {
          ...p,
          team: { ...p.team, tournament_rank: newRank }
        };
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingChampions(false);
    }
  };

  const renderChampionsTable = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-panel border border-amber-500/20 rounded-3xl overflow-hidden mb-8 shadow-[0_0_30px_rgba(245,158,11,0.05)] relative"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-amber-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between relative z-10">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-wider">
            <Trophy className="w-4 h-4 text-amber-500" /> Tournament Champions ({activeCategory})
          </h3>
          {isAdmin && (
            <button
              onClick={handleSaveChampions}
              disabled={savingChampions}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg disabled:opacity-50 hover:scale-105 active:scale-95 duration-200"
            >
              {savingChampions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Champions
            </button>
          )}
        </div>
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="py-3 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-40">Place</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/20">
              {/* 1st Place */}
              <tr className="hover:bg-amber-500/5 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both">
                <td className="py-4 px-6 text-sm font-black text-amber-500 tracking-wider">
                  🥇 1st Place
                </td>
                <td className="py-4 px-6">
                  {isAdmin ? (
                    <select
                      value={champForm.first}
                      onChange={e => setChampForm(prev => ({ ...prev, first: e.target.value }))}
                      className="w-full max-w-md bg-black/40 border border-white/10 hover:border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                    >
                      <option value="" className="text-slate-500">-- Select Team --</option>
                      {uniqueTeams.map(t => <option key={t.id} value={t.id} className="text-white bg-slate-900">{t.name} ({t.university?.name})</option>)}
                    </select>
                  ) : (
                    <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{champ1st?.name || 'TBD'} <span className="text-slate-400 font-normal">{champ1st?.university?.name || ''}</span></span>
                  )}
                </td>
              </tr>
              {/* 2nd Place */}
              <tr className="hover:bg-slate-400/5 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500 delay-75 fill-mode-both">
                <td className="py-4 px-6 text-sm font-black text-slate-300 tracking-wider">
                  🥈 2nd Place
                </td>
                <td className="py-4 px-6">
                  {isAdmin ? (
                    <select
                      value={champForm.second}
                      onChange={e => setChampForm(prev => ({ ...prev, second: e.target.value }))}
                      className="w-full max-w-md bg-black/40 border border-white/10 hover:border-slate-400/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-400/50 transition-colors"
                    >
                      <option value="" className="text-slate-500">-- Select Team --</option>
                      {uniqueTeams.map(t => <option key={t.id} value={t.id} className="text-white bg-slate-900">{t.name} ({t.university?.name})</option>)}
                    </select>
                  ) : (
                    <span className="text-sm font-bold text-white group-hover:text-slate-300 transition-colors">{champ2nd?.name || 'TBD'} <span className="text-slate-400 font-normal">{champ2nd?.university?.name || ''}</span></span>
                  )}
                </td>
              </tr>
              {/* 3rd Place */}
              <tr className="hover:bg-orange-500/5 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500 delay-150 fill-mode-both">
                <td className="py-4 px-6 text-sm font-black text-orange-400 tracking-wider">
                  🥉 3rd Place
                </td>
                <td className="py-4 px-6">
                  {isAdmin ? (
                    <select
                      value={champForm.third}
                      onChange={e => setChampForm(prev => ({ ...prev, third: e.target.value }))}
                      className="w-full max-w-md bg-black/40 border border-white/10 hover:border-orange-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                    >
                      <option value="" className="text-slate-500">-- Select Team --</option>
                      {uniqueTeams.map(t => <option key={t.id} value={t.id} className="text-white bg-slate-900">{t.name} ({t.university?.name})</option>)}
                    </select>
                  ) : (
                    <span className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{champ3rd?.name || 'TBD'} <span className="text-slate-400 font-normal">{champ3rd?.university?.name || ''}</span></span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    );
  };


  const toggleExpand = (matchId: string) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

  const finishedMatches = matches.filter((m) => m.status === 'finished');

  const getNextMatchDetails = (match: Match) => {
    if (!match.next_match_id) return 'Tournament Champions';
    
    const nextMatch = matches.find((m) => m.id === match.next_match_id);
    if (!nextMatch) return 'Yet to Decide';

    const isSlotA = match.next_match_player_slot === 'A';
    const opponentId = isSlotA ? nextMatch.player_b_id : nextMatch.player_a_id;

    if (!opponentId) {
      const feederMatch = matches.find(
        (m) => m.next_match_id === nextMatch.id && m.next_match_player_slot === (isSlotA ? 'B' : 'A')
      );
      if (feederMatch) {
        const feederNameA = feederMatch.player_a ? feederMatch.player_a.full_name : 'TBD';
        const feederNameB = feederMatch.player_b ? feederMatch.player_b.full_name : 'TBD';
        return `Winner of ${feederNameA} vs ${feederNameB}`;
      }
      return 'Yet to Decide';
    }

    const opponent = matches.find((m) => m.player_a_id === opponentId)?.player_a 
                  || matches.find((m) => m.player_b_id === opponentId)?.player_b;
                  
    return opponent ? opponent.full_name : 'TBD';
  };

  const renderScoreCard = (match: Match) => {
    const isExpanded = expandedMatchId === match.id;
    const playerA = match.player_a;
    const playerA2 = match.player_a2;
    const playerB = match.player_b;
    const playerB2 = match.player_b2;
    const winner = match.winner;

    const nameA = playerA ? playerA.full_name : 'TBD';
    const nameA2 = playerA2 ? ` & ${playerA2.full_name}` : '';
    const displayA = `${nameA}${nameA2}`;
    const uniA = playerA ? (playerA.team as any)?.university?.name : 'N/A';
    
    const nameB = playerB ? playerB.full_name : 'TBD';
    const nameB2 = playerB2 ? ` & ${playerB2.full_name}` : '';
    const displayB = `${nameB}${nameB2}`;
    const uniB = playerB ? (playerB.team as any)?.university?.name : 'N/A';

    const startTimeStr = match.match_start_time 
      ? new Date(match.match_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'N/A';

    const isBye = match.status === 'finished' && (match.player_a_id === null || match.player_b_id === null);

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

    return (
      <div 
        key={match.id} 
        className="relative overflow-hidden bg-gradient-to-br from-[#0c1f0f] to-[#0f2d17] border border-white/5 rounded-2xl shadow-lg p-4 flex flex-col justify-between space-y-4 transition-all duration-300"
      >
        {/* Card Header (Table & Status) */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-300">
              Board {match.table_number}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-white/10 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 text-[#f5a623]" />
              Completed
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 font-mono">
            {match.total_duration_minutes}m limit
          </span>
        </div>

        {/* Central Display */}
        <div className="flex items-center justify-between gap-2 py-1">
          {/* Player A */}
          <div className="flex-1 text-center min-w-0">
            <h4 className={`font-extrabold text-xs truncate leading-tight ${
              winner?.id === playerA?.id ? 'text-[#22c55e]' : 'text-slate-400'
            }`}>
              {displayA}
              {winner?.id === playerA?.id && ' 🏆'}
            </h4>
            <span className="text-[9px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniA}</span>
          </div>

          {/* Central VS */}
          <div className="flex flex-col items-center justify-center px-3 shrink-0">
            <span className="text-[12px] font-extrabold bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] px-3 py-1 rounded-full text-center tabular-nums shadow-[0_0_10px_rgba(34,197,94,0.1)]">
              {match.score_a} - {match.score_b}
            </span>
          </div>

          {/* Player B */}
          <div className="flex-1 text-center min-w-0">
            <h4 className={`font-extrabold text-xs truncate leading-tight ${
              winner?.id === playerB?.id ? 'text-[#22c55e]' : 'text-slate-400'
            }`}>
              {displayB}
              {winner?.id === playerB?.id && ' 🏆'}
            </h4>
            <span className="text-[9px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniB}</span>
          </div>
        </div>

        {/* Card Footer (Round Details & Stats trigger) */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {match.round.replace('_', ' ')}
          </span>

          <button
            onClick={() => toggleExpand(match.id)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border transition-all ${
              isExpanded 
                ? 'bg-[#22c55e] border-transparent text-slate-950'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {isExpanded ? 'Hide Details' : 'Details'}
          </button>
        </div>

        {/* Expanded Stats & Predictions */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-3 border-t border-white/5 space-y-3"
            >
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                  <span className="block mb-0.5 text-slate-500 font-bold uppercase text-[8px]">Start Time</span>
                  <span className="font-extrabold text-slate-200">{startTimeStr}</span>
                </div>
                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                  <span className="block mb-0.5 text-slate-500 font-bold uppercase text-[8px]">Winner Name</span>
                  <span className="font-extrabold text-[#22c55e] truncate block">{winner ? winner.full_name : 'TBD'}</span>
                </div>
              </div>

              {/* Bracket Progression Prediction */}
              <div className="bg-gradient-to-r from-[#22c55e]/5 to-[#16a34a]/5 border border-[#22c55e]/10 p-2.5 rounded-xl flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] uppercase font-bold text-[#22c55e] tracking-wider block mb-0.5">
                    Up Next in Bracket Round
                  </span>
                  <span className="text-slate-300 font-bold block text-[10px] truncate">
                    {winner ? winner.full_name : 'Winner'} vs {getNextMatchDetails(match)}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#22c55e] shrink-0 ml-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Group Standings (Encounter-based)
  // An "Encounter" is a set of matches between Team A and Team B in a specific round.
  // First team to 3 match wins gets 1 Encounter Win.
  // Tie-breaker is the sum of total board scores (score_a + score_b for all matches).
  const groupAStandings: Record<string, any> = {};
  const groupBStandings: Record<string, any> = {};

  const encounters: Record<string, { teamAId: string, teamBId: string, teamAName: string, teamBName: string, teamAUni: string, teamBUni: string, teamAObj: any, teamBObj: any, matchWinsA: number, matchWinsB: number, singleWinsA: number, singleWinsB: number, totalScoreA: number, totalScoreB: number, matches: Match[], round: string, finishedMatches: number }> = {};
  
  // Filter matches by current gender tab
  const categoryMatches = matches.filter(m => m.category === activeCategory);

  // Pre-populate standings with all registered teams for this category
  playersList.forEach(p => {
    if (p.team && p.team.category === activeCategory) {
      const t = p.team;
      const target = t.group_name === 'group_a' ? groupAStandings : groupBStandings;
      if (!target[p.team_id]) {
        target[p.team_id] = {
          id: p.team_id,
          teamName: t.name,
          uniName: t.university?.name || 'Unknown',
          played: 0,
          wins: 0,
          totalWinSets: 0,
          tieBreakerScore: 0,
          encounterMatches: [],
          manual_played: t.manual_played ?? null,
          manual_wins: t.manual_wins ?? null,
          manual_points: t.manual_points ?? null,
          manual_rank: t.manual_rank ?? null
        };
      }
    }
  });

  categoryMatches.forEach(m => {
    if (m.round === 'group_a' || m.round === 'group_b') {
      const pA = m.player_a;
      const pB = m.player_b;
      
      if (!pA || !pB || !pA.team?.id || !pB.team?.id) return;
      
      const teamAId = pA.team.id;
      const teamBId = pB.team.id;
      
      // Create a unique Encounter ID based on team IDs (sorted so A vs B is same as B vs A)
      const isAFirst = teamAId < teamBId;
      const t1Id = isAFirst ? teamAId : teamBId;
      const t2Id = isAFirst ? teamBId : teamAId;
      const encounterId = `${m.round}_${t1Id}_${t2Id}`;

      if (!encounters[encounterId]) {
        encounters[encounterId] = {
          round: m.round,
          teamAId: t1Id,
          teamBId: t2Id,
          teamAName: isAFirst ? (pA.team as any)?.name : (pB.team as any)?.name,
          teamBName: isAFirst ? (pB.team as any)?.name : (pA.team as any)?.name,
          teamAUni: isAFirst ? (pA.team as any)?.university?.name : (pB.team as any)?.university?.name,
          teamBUni: isAFirst ? (pB.team as any)?.university?.name : (pA.team as any)?.university?.name,
          teamAObj: isAFirst ? pA.team : pB.team,
          teamBObj: isAFirst ? pB.team : pA.team,
          matchWinsA: 0,
          matchWinsB: 0,
          singleWinsA: 0,
          singleWinsB: 0,
          totalScoreA: 0,
          totalScoreB: 0,
          matches: [],
          finishedMatches: 0
        };
      }
      
      const enc = encounters[encounterId];
      enc.matches.push(m);
      
      // Calculate scores (parse as int to ensure no string concatenation)
      const scoreForT1 = parseInt((isAFirst ? m.score_a : m.score_b) as any, 10) || 0;
      const scoreForT2 = parseInt((isAFirst ? m.score_b : m.score_a) as any, 10) || 0;
      
      if (m.status === 'finished') {
        enc.totalScoreA += scoreForT1;
        enc.totalScoreB += scoreForT2;
        enc.finishedMatches += 1;
        
        if (m.winner_id) {
          const isTeamAWinner = (isAFirst && m.winner_id === pA.id) || (!isAFirst && m.winner_id === pB.id);
          if (isTeamAWinner) {
            enc.matchWinsA += 1;
            if (m.match_type === 'single') enc.singleWinsA += 1;
          } else {
            enc.matchWinsB += 1;
            if (m.match_type === 'single') enc.singleWinsB += 1;
          }
        }
      }
    }
  });

  // Calculate Standings from Encounters
  Object.values(encounters).forEach(enc => {
    const target = enc.round === 'group_a' ? groupAStandings : groupBStandings;
    
    // Initialize Team A
    if (!target[enc.teamAId]) {
      target[enc.teamAId] = { 
        id: enc.teamAId, teamName: enc.teamAName, uniName: enc.teamAUni, 
        played: 0, wins: 0, totalWinSets: 0, tieBreakerScore: 0, encounterMatches: [],
        manual_played: enc.teamAObj?.manual_played ?? null,
        manual_wins: enc.teamAObj?.manual_wins ?? null,
        manual_points: enc.teamAObj?.manual_points ?? null,
        manual_rank: enc.teamAObj?.manual_rank ?? null
      };
    }
    // Initialize Team B
    if (!target[enc.teamBId]) {
      target[enc.teamBId] = { 
        id: enc.teamBId, teamName: enc.teamBName, uniName: enc.teamBUni, 
        played: 0, wins: 0, totalWinSets: 0, tieBreakerScore: 0, encounterMatches: [],
        manual_played: enc.teamBObj?.manual_played ?? null,
        manual_wins: enc.teamBObj?.manual_wins ?? null,
        manual_points: enc.teamBObj?.manual_points ?? null,
        manual_rank: enc.teamBObj?.manual_rank ?? null
      };
    }
    
    // Add encounter references
    target[enc.teamAId].encounterMatches.push(...enc.matches);
    target[enc.teamBId].encounterMatches.push(...enc.matches);
    
    target[enc.teamAId].tieBreakerScore += enc.totalScoreA;
    target[enc.teamBId].tieBreakerScore += enc.totalScoreB;
    
    // Accumulate all board wins as "Total Win Sets"
    target[enc.teamAId].totalWinSets += enc.matchWinsA;
    target[enc.teamBId].totalWinSets += enc.matchWinsB;
    
    // Track played and wins based on ENCOUNTER completions
    const teamASweptSingles = enc.singleWinsA === 3;
    const teamBSweptSingles = enc.singleWinsB === 3;
    
    // Has the encounter finished?
    // Case 1: 5 matches are completed.
    // Case 2: One team won all 3 singles.
    const isEncounterFinished = enc.finishedMatches >= 5 || teamASweptSingles || teamBSweptSingles;

    if (isEncounterFinished) {
      target[enc.teamAId].played += 1;
      target[enc.teamBId].played += 1;
      
      // Determine winner of the encounter
      if (enc.matchWinsA > enc.matchWinsB) target[enc.teamAId].wins += 1;
      else if (enc.matchWinsB > enc.matchWinsA) target[enc.teamBId].wins += 1;
      
      // Special case: +50 score bonus for winning all 3 singles
      if (teamASweptSingles) {
        target[enc.teamAId].tieBreakerScore += 50;
        target[enc.teamAId].totalWinSets += (5 - enc.matchWinsA); // Award remaining unplayed sets
      } else if (teamBSweptSingles) {
        target[enc.teamBId].tieBreakerScore += 50;
        target[enc.teamBId].totalWinSets += (5 - enc.matchWinsB); // Award remaining unplayed sets
      }
    }
  });

  // Apply manual overrides before sorting
  Object.values(groupAStandings).forEach(t => {
    if (t.manual_played !== null && t.manual_played !== undefined) t.played = t.manual_played;
    if (t.manual_wins !== null && t.manual_wins !== undefined) t.wins = t.manual_wins;
    if (t.manual_points !== null && t.manual_points !== undefined) t.tieBreakerScore = t.manual_points;
  });
  
  Object.values(groupBStandings).forEach(t => {
    if (t.manual_played !== null && t.manual_played !== undefined) t.played = t.manual_played;
    if (t.manual_wins !== null && t.manual_wins !== undefined) t.wins = t.manual_wins;
    if (t.manual_points !== null && t.manual_points !== undefined) t.tieBreakerScore = t.manual_points;
  });

  const sortTeams = (a: any, b: any) => {
    if (a.manual_rank !== null && a.manual_rank !== undefined && b.manual_rank !== null && b.manual_rank !== undefined) return a.manual_rank - b.manual_rank;
    if (a.manual_rank !== null && a.manual_rank !== undefined) return -1;
    if (b.manual_rank !== null && b.manual_rank !== undefined) return 1;
    
    if (b.wins !== a.wins) return b.wins - a.wins; // 1st priority: Encounter Wins
    if (b.totalWinSets !== a.totalWinSets) return b.totalWinSets - a.totalWinSets; // 2nd priority: Board Win Sets
    return b.tieBreakerScore - a.tieBreakerScore; // 3rd priority: Total Score Points
  };

  const sortedGroupA = Object.values(groupAStandings).sort(sortTeams);
  const sortedGroupB = Object.values(groupBStandings).sort(sortTeams);

  // Auto-generate Semi-Final Bracket Matches based on Standings
  const autoBracketMatches: any[] = [];
  
  // A1 vs B2
  if (sortedGroupA.length >= 1 && sortedGroupB.length >= 2) {
    autoBracketMatches.push({
      id: 'auto_semi_1',
      round: 'semi_finals',
      stage_index: 2,
      status: 'pending',
      player_a_id: sortedGroupA[0].id,
      player_b_id: sortedGroupB[1].id,
      player_a: { full_name: sortedGroupA[0].teamName, team: { university: { name: sortedGroupA[0].uniName } } },
      player_b: { full_name: sortedGroupB[1].teamName, team: { university: { name: sortedGroupB[1].uniName } } },
      score_a: 0,
      score_b: 0,
      total_duration_minutes: 60,
      winner_id: null
    });
  }

  // B1 vs A2
  if (sortedGroupB.length >= 1 && sortedGroupA.length >= 2) {
    autoBracketMatches.push({
      id: 'auto_semi_2',
      round: 'semi_finals',
      stage_index: 2,
      status: 'pending',
      player_a_id: sortedGroupB[0].id,
      player_b_id: sortedGroupA[1].id,
      player_a: { full_name: sortedGroupB[0].teamName, team: { university: { name: sortedGroupB[0].uniName } } },
      player_b: { full_name: sortedGroupA[1].teamName, team: { university: { name: sortedGroupA[1].uniName } } },
      score_a: 0,
      score_b: 0,
      total_duration_minutes: 60,
      winner_id: null
    });
  }

  // Finals
  if (autoBracketMatches.length === 2) {
    autoBracketMatches.push({
      id: 'auto_finals',
      round: 'finals',
      stage_index: 1,
      status: 'pending',
      player_a_id: 'tbd1',
      player_b_id: 'tbd2',
      player_a: { full_name: 'Winner of Semi 1' },
      player_b: { full_name: 'Winner of Semi 2' },
      score_a: 0,
      score_b: 0,
      total_duration_minutes: 60,
      winner_id: null
    });
  }

  // Find any manually scheduled semi/finals for this category
  const manualBracketMatches = categoryMatches.filter(m => m.round === 'semi_finals' || m.round === 'finals' || m.round === '3rd_place');
  const groupedKnockoutEncounters: any[] = [];
  
  if (manualBracketMatches.length > 0) {
    const encMap = new Map<string, any>();
    
    manualBracketMatches.forEach(m => {
      // Safely check if players and teams exist before comparing
      const teamAId = (m.player_a?.team as any)?.id || 'unknownA';
      const teamBId = (m.player_b?.team as any)?.id || 'unknownB';
      
      const isAFirst = teamAId < teamBId;
      const pA = isAFirst ? m.player_a : m.player_b;
      const pB = isAFirst ? m.player_b : m.player_a;
      
      const pATeamId = isAFirst ? teamAId : teamBId;
      const pBTeamId = isAFirst ? teamBId : teamAId;
      
      if (pATeamId === 'unknownA' && pBTeamId === 'unknownB') return; // Skip if no teams
      
      const encKey = `${m.round}_${pATeamId}_${pBTeamId}`;
      if (!encMap.has(encKey)) {
        encMap.set(encKey, {
          id: encKey,
          round: m.round,
          stage_index: m.round === 'finals' || m.round === '3rd_place' ? 1 : 2,
          teamAId: pATeamId,
          teamBId: pBTeamId,
          teamAName: pA ? (pA.team as any)?.name : 'TBD',
          teamBName: pB ? (pB.team as any)?.name : 'TBD',
          teamAUni: pA ? (pA.team as any)?.university?.name : '',
          teamBUni: pB ? (pB.team as any)?.university?.name : '',
          winsA: 0,
          winsB: 0,
          totalFinished: 0
        });
      }
      
      const enc = encMap.get(encKey)!;
      if (m.status === 'finished') {
        enc.totalFinished += 1;
        if (m.winner_id === (isAFirst ? m.player_a_id : m.player_b_id)) enc.winsA += 1;
        else enc.winsB += 1;
      }
    });
    
    encMap.forEach(enc => {
      groupedKnockoutEncounters.push({
        id: enc.id,
        round: enc.round,
        stage_index: enc.stage_index,
        status: enc.winsA >= 3 || enc.winsB >= 3 || enc.totalFinished >= 5 ? 'finished' : 'pending',
        player_a_id: enc.teamAId,
        player_b_id: enc.teamBId,
        player_a: { full_name: enc.teamAName, team: { university: { name: enc.teamAUni } } },
        player_b: { full_name: enc.teamBName, team: { university: { name: enc.teamBUni } } },
        score_a: enc.winsA,
        score_b: enc.winsB,
        winner_id: enc.winsA >= 3 ? enc.teamAId : (enc.winsB >= 3 ? enc.teamBId : null)
      });
    });
  }
  
  // Prefer manual bracket if it has items, otherwise use auto bracket
  const displayBracketMatches = manualBracketMatches.length > 0 ? groupedKnockoutEncounters : autoBracketMatches;

  const renderStandingsTable = (title: string, data: any[], groupKey: string) => (
    <div className="glass-panel border border-white/5 rounded-3xl overflow-hidden mb-6">
      <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-wider">
          <Trophy className="w-4 h-4 text-[#22c55e]" /> {title} Standings
        </h3>
        {isAdmin && (
          <button
            onClick={() => openEditStandings(groupKey, data)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-bold uppercase transition-colors"
          >
            <Edit className="w-3.5 h-3.5 text-[#22c55e]" /> Edit Standings
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-slate-950/40 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">
              <th className="px-6 py-3 border-b border-white/5">Rank</th>
              <th className="px-6 py-3 border-b border-white/5">Team / University</th>
              <th className="px-6 py-3 border-b border-white/5 text-center">Total Matches</th>
              <th className="px-6 py-3 border-b border-white/5 text-center">Wins</th>
              <th className="px-6 py-3 border-b border-white/5 text-center">Total Win Sets</th>
              <th className="px-6 py-3 border-b border-white/5 text-center">Total Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-bold">No teams registered for this group yet.</td>
              </tr>
            ) : (
              data.map((team, idx) => {
                if (expandedTeamId && expandedTeamId !== `${groupKey}_${team.id}`) {
                  return null;
                }
                
                return (
                <React.Fragment key={team.id}>
                  <tr 
                    onClick={() => {
                      if (expandedTeamId === `${groupKey}_${team.id}`) {
                        setExpandedTeamId(null);
                      } else {
                        setExpandedTeamId(`${groupKey}_${team.id}`);
                        setExpandedEncounterId(null);
                      }
                    }}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">#{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-white text-sm flex items-center gap-2">
                        {team.teamName}
                        {expandedTeamId === `${groupKey}_${team.id}` ? (
                          <span className="text-[9px] bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">Hide Matches</span>
                        ) : (
                          <span className="text-[9px] bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-2 py-0.5 rounded-full uppercase tracking-widest">View Matches</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{team.uniName}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-300 font-bold">{team.played}</td>
                    <td className="px-6 py-4 text-center text-lg font-black text-[#22c55e]">{team.wins}</td>
                    <td className="px-6 py-4 text-center text-amber-400 font-black">{team.totalWinSets}</td>
                    <td className="px-6 py-4 text-center text-slate-300 font-bold">{team.tieBreakerScore} pts</td>
                  </tr>
                  
                  {expandedTeamId === `${groupKey}_${team.id}` && (
                    <tr>
                      <td colSpan={6} className="p-0 bg-black/20">
                        <div className="p-4 bg-gradient-to-b from-black/40 to-transparent">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#22c55e] mb-3 px-2">Encounters for {team.teamName}</h4>
                          
                          {(() => {
                            // Group by encounter
                            const encounters: Record<string, { opponentTeamName: string, matches: Match[] }> = {};
                            team.encounterMatches.forEach((m: Match) => {
                              const isTeamA = m.player_a?.team?.id === team.id;
                              const opponent = isTeamA ? m.player_b : m.player_a;
                              const opponentTeamName = opponent ? (opponent.team as any)?.name : 'Unknown Team';
                              
                              if (!encounters[opponentTeamName]) encounters[opponentTeamName] = { opponentTeamName, matches: [] };
                              encounters[opponentTeamName].matches.push(m);
                            });
                            
                            const encounterKeys = Object.keys(encounters);
                            if (encounterKeys.length === 0) {
                              return <div className="text-xs text-slate-500 px-2 pb-2">No encounters recorded yet.</div>;
                            }

                            return (
                              <div className="space-y-2">
                                {encounterKeys.map(oppTeamName => (
                                  <div key={oppTeamName} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                    <div 
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         setExpandedEncounterId(expandedEncounterId === oppTeamName ? null : oppTeamName);
                                      }}
                                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                      <span className="text-xs font-bold text-white uppercase tracking-wider">{team.teamName} <span className="text-slate-500">vs</span> {oppTeamName}</span>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-black/40 px-2 py-1 rounded">
                                        {expandedEncounterId === oppTeamName ? 'Hide Details' : 'View Matches'}
                                      </span>
                                    </div>

                                    {expandedEncounterId === oppTeamName && (
                                      <div className="p-3 border-t border-white/10 bg-black/40">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {encounters[oppTeamName].matches.map((m: Match) => {
                                              const isTeamA = m.player_a?.team?.id === team.id;
                                              const opponent = isTeamA ? m.player_b : m.player_a;
                                              const myScore = isTeamA ? m.score_a : m.score_b;
                                              const theirScore = isTeamA ? m.score_b : m.score_a;
                                              
                                              const myNameA = isTeamA ? m.player_a?.full_name : m.player_b?.full_name;
                                              const myNameA2 = isTeamA && m.match_type === 'double' ? m.player_a2?.full_name : (!isTeamA && m.match_type === 'double' ? m.player_b2?.full_name : null);
                                              
                                              const oppNameB = opponent ? opponent.full_name : 'TBD';
                                              const oppNameB2 = !isTeamA && m.match_type === 'double' ? m.player_a2?.full_name : (isTeamA && m.match_type === 'double' ? m.player_b2?.full_name : null);

                                              let statusTag = <span className="bg-white/10 text-slate-400 text-[8px] uppercase font-bold px-1.5 py-0.5 rounded">Yet to start</span>;
                                              if (m.status === 'live') {
                                                statusTag = <span className="bg-emerald-500/20 text-emerald-400 text-[8px] uppercase font-bold px-1.5 py-0.5 rounded animate-pulse">Ongoing</span>;
                                              } else if (m.status === 'finished') {
                                                statusTag = <span className="bg-sky-500/20 text-sky-400 text-[8px] uppercase font-bold px-1.5 py-0.5 rounded">Done</span>;
                                              }

                                              return (
                                                <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                                  <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.match_type} match</span>
                                                      {statusTag}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-white flex flex-col gap-0.5">
                                                      <div><span className="text-slate-400">{team.teamName}:</span> <span className="truncate">{myNameA}</span> {myNameA2 && <span className="truncate">& {myNameA2}</span>}</div>
                                                      <div><span className="text-slate-400">{oppTeamName}:</span> <span className="truncate">{oppNameB}</span> {oppNameB2 && <span className="truncate">& {oppNameB2}</span>}</div>
                                                    </div>
                                                  </div>
                                                  <div className="shrink-0 ml-3 text-right">
                                                    {m.status === 'finished' ? (
                                                      <div className="text-sm font-black text-[#22c55e]">{myScore} - {theirScore}</div>
                                                    ) : (
                                                      <div className="text-xs font-bold text-slate-500">TBD</div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                         </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Gender Toggle */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">Tournament Results</h2>
          <p className="text-slate-400 mt-1 font-medium">Live standings and bracket progression</p>
        </div>
      </div>

      {renderChampionsTable()}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => { setActiveCategory('boys'); setExpandedTeamId(null); setExpandedMatchId(null); }}
            className={`px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all ${
              activeCategory === 'boys'
                ? 'bg-[#22c55e] text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Boys
          </button>
          <button
            onClick={() => { setActiveCategory('girls'); setExpandedTeamId(null); setExpandedMatchId(null); }}
            className={`px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all ${
              activeCategory === 'girls'
                ? 'bg-[#22c55e] text-slate-950 shadow-md'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Girls
          </button>
        </div>
      </div>

      {/* Group Standings */}
      <div className={`grid grid-cols-1 ${expandedTeamId ? '' : 'xl:grid-cols-2'} gap-6 mt-6`}>
        {(!expandedTeamId || expandedTeamId.startsWith('group_a_')) && renderStandingsTable('Group A', sortedGroupA, 'group_a')}
        {(!expandedTeamId || expandedTeamId.startsWith('group_b_')) && renderStandingsTable('Group B', sortedGroupB, 'group_b')}
      </div>

      {/* Bracket View (Only Knockout Matches) */}
      {displayBracketMatches.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Knockout Stage Bracket
          </h3>
          <TournamentBracket matches={displayBracketMatches} />
        </div>
      )}



      {/* Edit Standings Modal */}
      <AnimatePresence>
        {editingGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#22c55e]" /> Edit Standings ({editingGroup === 'group_a' ? 'Group A' : 'Group B'})
                </h3>
                <button
                  onClick={() => setEditingGroup(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">
                      <th className="pb-3 border-b border-white/5">Team</th>
                      <th className="pb-3 border-b border-white/5 text-center">Played</th>
                      <th className="pb-3 border-b border-white/5 text-center">Wins</th>
                      <th className="pb-3 border-b border-white/5 text-center">Total Points</th>
                      <th className="pb-3 border-b border-white/5 text-center">Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {standingsForm.map((team) => (
                      <tr key={team.id} className="hover:bg-white/5">
                        <td className="py-4 text-xs font-bold text-white">{team.teamName}</td>
                        <td className="py-4 px-2">
                          <input
                            type="number"
                            value={team.played === null ? '' : team.played}
                            onChange={(e) => handleStandingsChange(team.id, 'played', e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-center text-white focus:outline-none focus:border-[#22c55e]"
                            placeholder="Auto"
                          />
                        </td>
                        <td className="py-4 px-2">
                          <input
                            type="number"
                            value={team.wins === null ? '' : team.wins}
                            onChange={(e) => handleStandingsChange(team.id, 'wins', e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-center text-white focus:outline-none focus:border-[#22c55e]"
                            placeholder="Auto"
                          />
                        </td>
                        <td className="py-4 px-2">
                          <input
                            type="number"
                            value={team.points === null ? '' : team.points}
                            onChange={(e) => handleStandingsChange(team.id, 'points', e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-center text-white focus:outline-none focus:border-[#22c55e]"
                            placeholder="Auto"
                          />
                        </td>
                        <td className="py-4 px-2">
                          <input
                            type="number"
                            value={team.rank === null || team.rank === undefined ? '' : team.rank}
                            onChange={(e) => handleStandingsChange(team.id, 'rank', e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-center text-amber-400 focus:outline-none focus:border-amber-400 font-black"
                            placeholder="Auto"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-black/20 p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setEditingGroup(null)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStandingsOverrides}
                  disabled={savingStandings}
                  className="bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-[#22c55e]/20 disabled:opacity-50"
                >
                  {savingStandings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}





