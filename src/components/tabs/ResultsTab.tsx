'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Match } from '@/types/database.types';
import TournamentBracket from '@/components/TournamentBracket';
import { 
  Trophy, 
  History,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResultsTab() {
  const { matches } = useTournament();
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'boys' | 'girls'>('boys');

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
              Table {match.table_number}
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

  const encounters: Record<string, { teamAId: string, teamBId: string, teamAName: string, teamBName: string, teamAUni: string, teamBUni: string, matchWinsA: number, matchWinsB: number, totalScoreA: number, totalScoreB: number, matches: Match[], round: string, finishedMatches: number }> = {};
  
  // Filter matches by current gender tab
  const categoryMatches = matches.filter(m => m.category === activeCategory);

  categoryMatches.forEach(m => {
    if (m.round === 'group_a' || m.round === 'group_b') {
      const pA = m.player_a;
      const pB = m.player_b;
      
      if (!pA || !pB || !pA.team_id || !pB.team_id) return;
      
      const teamAId = pA.team_id;
      const teamBId = pB.team_id;
      
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
          matchWinsA: 0,
          matchWinsB: 0,
          totalScoreA: 0,
          totalScoreB: 0,
          matches: [],
          finishedMatches: 0
        };
      }
      
      const enc = encounters[encounterId];
      enc.matches.push(m);
      
      // Calculate scores
      const scoreForT1 = isAFirst ? m.score_a : m.score_b;
      const scoreForT2 = isAFirst ? m.score_b : m.score_a;
      
      if (m.status === 'finished') {
        enc.totalScoreA += scoreForT1;
        enc.totalScoreB += scoreForT2;
        enc.finishedMatches += 1;
        
        if (m.winner_id) {
          if ((isAFirst && m.winner_id === pA.id) || (!isAFirst && m.winner_id === pB.id)) {
            enc.matchWinsA += 1;
          } else {
            enc.matchWinsB += 1;
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
      target[enc.teamAId] = { id: enc.teamAId, teamName: enc.teamAName, uniName: enc.teamAUni, played: 0, wins: 0, tieBreakerScore: 0, encounterMatches: [] };
    }
    // Initialize Team B
    if (!target[enc.teamBId]) {
      target[enc.teamBId] = { id: enc.teamBId, teamName: enc.teamBName, uniName: enc.teamBUni, played: 0, wins: 0, tieBreakerScore: 0, encounterMatches: [] };
    }
    
    // Add encounter references
    target[enc.teamAId].encounterMatches.push(...enc.matches);
    target[enc.teamBId].encounterMatches.push(...enc.matches);
    
    target[enc.teamAId].tieBreakerScore += enc.totalScoreA;
    target[enc.teamBId].tieBreakerScore += enc.totalScoreB;

    // Has the encounter finished? (A team reached 3 wins, or 5 matches completed)
    if (enc.matchWinsA >= 3 || enc.matchWinsB >= 3 || enc.finishedMatches === 5) {
      target[enc.teamAId].played += 1;
      target[enc.teamBId].played += 1;
      
      if (enc.matchWinsA > enc.matchWinsB) {
        target[enc.teamAId].wins += 1;
      } else if (enc.matchWinsB > enc.matchWinsA) {
        target[enc.teamBId].wins += 1;
      }
    }
  });

  const sortedGroupA = Object.values(groupAStandings).sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.tieBreakerScore - a.tieBreakerScore);
  const sortedGroupB = Object.values(groupBStandings).sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.tieBreakerScore - a.tieBreakerScore);

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
      winner_id: null
    });
  }

  // Find any manually scheduled semi/finals for this category
  const manualBracketMatches = categoryMatches.filter(m => m.round === 'semi_finals' || m.round === 'finals');
  
  // Prefer manual bracket if it has items, otherwise use auto bracket
  const displayBracketMatches = manualBracketMatches.length > 0 ? manualBracketMatches : autoBracketMatches;

  const renderStandingsTable = (title: string, data: any[]) => (
    <div className="glass-panel border border-white/5 rounded-3xl overflow-hidden mb-6">
      <div className="bg-white/5 px-6 py-4 border-b border-white/5">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-wider">
          <Trophy className="w-4 h-4 text-[#22c55e]" /> {title} Standings
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-slate-950/40 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">
              <th className="px-6 py-3 border-b border-white/5">Rank</th>
              <th className="px-6 py-3 border-b border-white/5">Team / University</th>
              <th className="px-6 py-3 border-b border-white/5 text-center">Encounters Played</th>
              <th className="px-6 py-3 border-b border-white/5 text-center">Wins</th>
              <th className="px-6 py-3 border-b border-white/5 text-center">Total Score (Tie-breaker)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-500">No teams have played in this group yet.</td>
              </tr>
            ) : (
              data.map((team, idx) => (
                <React.Fragment key={team.id}>
                  <tr 
                    onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">#{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-white text-sm flex items-center gap-2">
                        {team.teamName}
                        {expandedTeamId === team.id ? (
                          <span className="text-[9px] bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">Hide Matches</span>
                        ) : (
                          <span className="text-[9px] bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-2 py-0.5 rounded-full uppercase tracking-widest">View Matches</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{team.uniName}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-300 font-bold">{team.played}</td>
                    <td className="px-6 py-4 text-center text-lg font-black text-[#22c55e]">{team.wins}</td>
                    <td className="px-6 py-4 text-center text-slate-300 font-bold">{team.tieBreakerScore} pts</td>
                  </tr>
                  
                  {expandedTeamId === team.id && (
                    <tr>
                      <td colSpan={5} className="p-0 bg-black/20">
                        <div className="p-4 bg-gradient-to-b from-black/40 to-transparent">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#22c55e] mb-3 px-2">Sub-Matches for {team.teamName}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {team.encounterMatches.map((m: Match) => {
                              const isTeamA = m.player_a?.team_id === team.id;
                              const opponent = isTeamA ? m.player_b : m.player_a;
                              const myScore = isTeamA ? m.score_a : m.score_b;
                              const theirScore = isTeamA ? m.score_b : m.score_a;
                              const opponentName = opponent ? opponent.full_name : 'TBD';
                              const opponentTeam = opponent ? (opponent.team as any)?.name : 'TBD';
                              
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
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">vs {opponentTeam}</span>
                                      {statusTag}
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">Match: against {opponentName}</div>
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Gender Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Championship Results</h2>
          <p className="text-xs text-slate-400 mt-0.5">Explore group standings, knockouts, and completed matchups.</p>
        </div>
        
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
      {(sortedGroupA.length > 0 || sortedGroupB.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
          {sortedGroupA.length > 0 && renderStandingsTable('Group A', sortedGroupA)}
          {sortedGroupB.length > 0 && renderStandingsTable('Group B', sortedGroupB)}
        </div>
      )}

      {/* Bracket View (Only Knockout Matches) */}
      {displayBracketMatches.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Knockout Stage Bracket
          </h3>
          <TournamentBracket matches={displayBracketMatches} />
        </div>
      )}

      {/* Completed Matches List */}
      <h3 className="text-sm font-bold text-slate-300 mb-3 mt-8">Recent Completed Matches</h3>
      {categoryMatches.filter((m) => m.status === 'finished').length === 0 ? (
        <div className="glass-panel border-dashed border-white/10 rounded-3xl p-10 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">No Completed Matches</h3>
          <p className="text-xs text-slate-500">
            Results will appear here as soon as match winners are locked in and confirmed by tournament referees.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryMatches.filter((m) => m.status === 'finished').map(renderScoreCard)}
        </div>
      )}
    </div>
  );
}
