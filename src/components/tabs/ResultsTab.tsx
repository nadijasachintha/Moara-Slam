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
    const playerB = match.player_b;
    const winner = match.winner;

    const nameA = playerA ? playerA.full_name : 'TBD';
    const uniA = playerA ? (playerA.team as any)?.university?.name : 'N/A';
    const nameB = playerB ? playerB.full_name : 'TBD';
    const uniB = playerB ? (playerB.team as any)?.university?.name : 'N/A';

    const startTimeStr = match.match_start_time 
      ? new Date(match.match_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'N/A';

    const isBye = match.status === 'finished' && (match.player_a_id === null || match.player_b_id === null);

    if (isBye) {
      const advancedPlayerName = playerA ? nameA : nameB;
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
            <h4 className={`font-extrabold text-sm truncate leading-tight ${
              winner?.id === playerA?.id ? 'text-[#22c55e]' : 'text-slate-400'
            }`}>
              {nameA}
              {winner?.id === playerA?.id && ' 🏆'}
            </h4>
            <span className="text-[9px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniA}</span>
          </div>

          {/* Central Score Digits */}
          <div className="flex flex-col items-center justify-center px-3 shrink-0">
            <span className="text-2xl font-black text-white tracking-widest bg-slate-950/60 px-3 py-1 rounded-xl border border-white/5 leading-none">
              {match.score_a} - {match.score_b}
            </span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1.5 leading-none">
              {match.current_frame} frames
            </span>
          </div>

          {/* Player B */}
          <div className="flex-1 text-center min-w-0">
            <h4 className={`font-extrabold text-sm truncate leading-tight ${
              winner?.id === playerB?.id ? 'text-[#22c55e]' : 'text-slate-400'
            }`}>
              {nameB}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white">Championship Results</h2>
        <p className="text-xs text-slate-400 mt-0.5">Explore completed matchups, final scores, and brackets progression.</p>
      </div>

      {/* Bracket View */}
      {matches.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#22c55e]" /> Live Bracket
          </h3>
          <TournamentBracket matches={matches} />
        </div>
      )}

      {/* Completed Matches List */}
      <h3 className="text-sm font-bold text-slate-300 mb-3 mt-6">Completed Matches</h3>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {finishedMatches.map(renderScoreCard)}
        </div>
      )}
    </div>
  );
}
