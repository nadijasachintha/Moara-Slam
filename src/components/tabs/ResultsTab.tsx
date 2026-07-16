'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Match } from '@/types/database.types';
import { 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  History,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResultsTab() {
  const { matches } = useTournament();
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white">Championship Results</h2>
        <p className="text-xs text-slate-400 mt-0.5">Explore completed matchups, final scores, and brackets progression.</p>
      </div>

      {finishedMatches.length === 0 ? (
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
        <div className="space-y-3.5">
          {finishedMatches.map((match) => {
            const isExpanded = expandedMatchId === match.id;
            const playerA = match.player_a;
            const playerB = match.player_b;
            const winner = match.winner;
            const nameA = playerA ? playerA.full_name : 'TBD';
            const uniA = playerA ? (playerA.team as any)?.university?.name : 'N/A';
            const nameB = playerB ? playerB.full_name : 'TBD';
            const uniB = playerB ? (playerB.team as any)?.university?.name : 'N/A';
            
            const startTimeStr = match.match_start_time 
              ? new Date(match.match_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'N/A';
              
            const durationMinutes = match.total_duration_minutes;

            return (
              <div 
                key={match.id}
                className="glass-panel rounded-2xl overflow-hidden border border-white/5 transition-all duration-300"
              >
                {/* Collapsed Header */}
                <div 
                  onClick={() => toggleExpand(match.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all select-none"
                >
                  <div className="flex-1 space-y-1.5">
                    {/* Round & Info */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-300">
                        {match.round.replace('_', ' ').replace('round of', 'Round of')}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" />
                        Winner: {winner ? winner.full_name : 'TBD'}
                      </span>
                    </div>

                    {/* Matchup names & scores */}
                    <div className="flex items-center justify-between pr-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold ${winner?.id === playerA?.id ? 'text-[#22c55e] font-black' : 'text-slate-300'}`}>
                          {nameA}
                        </span>
                        <span className="text-[9px] text-slate-500 truncate max-w-[120px]">{uniA}</span>
                      </div>
                      
                      <div className="text-sm font-black text-white tracking-widest bg-slate-950/45 px-3 py-1 rounded-lg border border-white/5">
                        {match.score_a} - {match.score_b}
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-semibold ${winner?.id === playerB?.id ? 'text-[#22c55e] font-black' : 'text-slate-300'}`}>
                          {nameB}
                        </span>
                        <span className="text-[9px] text-slate-500 truncate max-w-[120px]">{uniB}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-2">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/5 bg-slate-950/20 text-xs"
                    >
                      <div className="p-5 space-y-4">
                        {/* Stats block */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-slate-400 block mb-0.5">Start Time</span>
                            <span className="font-bold text-white">{startTimeStr}</span>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-slate-400 block mb-0.5">Played Table</span>
                            <span className="font-bold text-white">Table {match.table_number}</span>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-slate-400 block mb-0.5">Total Frames played</span>
                            <span className="font-bold text-white">{match.current_frame} Frames</span>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <span className="text-slate-400 block mb-0.5">Limit Duration</span>
                            <span className="font-bold text-white">{durationMinutes} Minutes</span>
                          </div>
                        </div>

                        {/* Next Match Prediction Card */}
                        <div className="bg-gradient-to-r from-[#22c55e]/5 to-[#16a34a]/5 border border-[#22c55e]/10 p-3.5 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#22c55e] tracking-wider block mb-1">
                              Up Next in Bracket
                            </span>
                            <span className="text-slate-300 font-semibold block text-xs">
                              {winner ? winner.full_name : 'Winner'} vs {getNextMatchDetails(match)}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#22c55e]" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

