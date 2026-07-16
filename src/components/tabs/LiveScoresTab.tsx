'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Match } from '@/types/database.types';
import MatchTimer from '@/components/MatchTimer';
import { 
  Play, 
  Pause, 
  Check, 
  Trophy, 
  Plus, 
  Minus, 
  ChevronDown, 
  ChevronUp, 
  Tv
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveScoresTab() {
  const { 
    matches, 
    isAdmin, 
    startM, 
    pauseM, 
    resumeM, 
    updateScore, 
    confirmWinner 
  } = useTournament();

  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [confirmWinnerId, setConfirmWinnerId] = useState<string | null>(null);
  const [submittingResult, setSubmittingResult] = useState(false);

  const toggleExpand = (matchId: string) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
    setConfirmWinnerId(null);
  };

  // Timer actions
  const handleStart = async (matchId: string) => {
    try {
      await startM(matchId);
    } catch (err: any) {
      alert(err.message || 'Error starting match');
    }
  };

  const handlePause = async (matchId: string) => {
    try {
      await pauseM(matchId);
    } catch (err: any) {
      alert(err.message || 'Error pausing match');
    }
  };

  const handleResume = async (matchId: string) => {
    try {
      await resumeM(matchId);
    } catch (err: any) {
      alert(err.message || 'Error resuming match');
    }
  };

  // Score edits
  const adjustScore = async (match: Match, side: 'A' | 'B', amount: number) => {
    let newScoreA = match.score_a;
    let newScoreB = match.score_b;

    if (side === 'A') {
      newScoreA = Math.max(0, match.score_a + amount);
    } else {
      newScoreB = Math.max(0, match.score_b + amount);
    }

    try {
      await updateScore(match.id, newScoreA, newScoreB, match.current_frame);
    } catch (err: any) {
      alert(err.message || 'Error updating score');
    }
  };

  const adjustFrame = async (match: Match, amount: number) => {
    const newFrame = Math.max(1, Math.min(8, match.current_frame + amount));
    try {
      await updateScore(match.id, match.score_a, match.score_b, newFrame);
    } catch (err: any) {
      alert(err.message || 'Error adjusting frame');
    }
  };

  // Confirm match result
  const handleConfirmResult = async (matchId: string) => {
    if (!confirmWinnerId) {
      alert('Please select a winner before confirming.');
      return;
    }
    setSubmittingResult(true);
    try {
      await confirmWinner(matchId, confirmWinnerId);
      setExpandedMatchId(null);
    } catch (err: any) {
      alert(err.message || 'Error confirming result');
    } finally {
      setSubmittingResult(false);
    }
  };

  const liveMatches = matches.filter((m) => m.status === 'live');
  const upcomingMatches = matches.filter((m) => m.status === 'scheduled');
  const finishedMatches = matches.filter((m) => m.status === 'finished');

  const renderMatchCard = (match: Match) => {
    const isExpanded = expandedMatchId === match.id;
    const playerA = match.player_a;
    const playerB = match.player_b;

    // Handle byes or empty slots
    const nameA = playerA ? playerA.full_name : 'TBD';
    const uniA = playerA ? (playerA.team as any)?.university?.name : 'N/A';
    const nameB = playerB ? playerB.full_name : 'TBD';
    const uniB = playerB ? (playerB.team as any)?.university?.name : 'N/A';

    return (
      <div 
        key={match.id} 
        className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 border ${
          match.status === 'live' 
            ? 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
            : 'border-white/5'
        }`}
      >
        {/* Collapsed Header */}
        <div 
          onClick={() => toggleExpand(match.id)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all select-none"
        >
          <div className="flex-1 space-y-1.5">
            {/* Table and Badge */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-300">
                Table {match.table_number}
              </span>
              {match.status === 'live' && (
                <span className="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-slate-950 rounded-full"></span>
                  Live
                </span>
              )}
              {match.status === 'finished' && (
                <span className="text-[9px] font-bold uppercase tracking-widest bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                  Completed
                </span>
              )}
            </div>

            {/* Matchup */}
            <div className="flex items-center justify-between pr-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{nameA}</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{uniA}</span>
              </div>
              
              <div className="flex flex-col items-center justify-center px-3">
                <span className="text-xs font-bold text-slate-500">VS</span>
                <span className="text-base font-extrabold text-[#22c55e] tracking-wider mt-0.5">
                  {match.score_a} - {match.score_b}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-white">{nameB}</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{uniB}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-2">
            <MatchTimer match={match} />
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
              className="border-t border-white/5 bg-slate-950/20"
            >
              <div className="p-5 space-y-5">
                {/* Visual score display */}
                <div className="flex justify-around items-center py-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-center">
                    <span className="text-[10px] text-[#22c55e] font-extrabold uppercase tracking-widest block mb-1">
                      Player A
                    </span>
                    <span className="text-xl font-bold text-white block leading-none">{nameA}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">{uniA}</span>
                    <span className="text-4xl font-black text-white mt-3 block">{match.score_a}</span>
                  </div>

                  <div className="text-center px-4 border-x border-white/5">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block mb-1">
                      Frame
                    </span>
                    <span className="text-2xl font-black text-[#16a34a] block">{match.current_frame} / 8</span>
                    <span className="text-[9px] text-slate-400 block mt-1">45m Limit</span>
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] text-[#22c55e] font-extrabold uppercase tracking-widest block mb-1">
                      Player B
                    </span>
                    <span className="text-xl font-bold text-white block leading-none">{nameB}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">{uniB}</span>
                    <span className="text-4xl font-black text-white mt-3 block">{match.score_b}</span>
                  </div>
                </div>

                {/* Additional Match Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                    <span className="text-slate-400 font-medium">Table Assign</span>
                    <span className="text-sm font-bold text-white mt-0.5">Table {match.table_number}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                    <span className="text-slate-400 font-medium">Scheduled Time</span>
                    <span className="text-sm font-bold text-white mt-0.5">
                      {new Date(match.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* ADMIN CONTROLS INTERFACE */}
                {isAdmin && (
                  <div className="bg-[#22c55e]/5 border border-[#22c55e]/10 p-4 rounded-xl space-y-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#22c55e]">
                      <Tv className="w-3.5 h-3.5" />
                      ADMIN LIVE CONTROLS
                    </div>

                    {/* Start / Pause / Resume controls */}
                    <div className="flex gap-2">
                      {match.status === 'scheduled' && (
                        <button
                          onClick={() => handleStart(match.id)}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                          <Play className="w-3.5 h-3.5 fill-slate-950" /> Start Match
                        </button>
                      )}

                      {match.status === 'live' && !match.is_paused && (
                        <button
                          onClick={() => handlePause(match.id)}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5 fill-slate-950" /> Pause Timer
                        </button>
                      )}

                      {match.status === 'live' && match.is_paused && (
                        <button
                          onClick={() => handleResume(match.id)}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-slate-950" /> Resume Timer
                        </button>
                      )}
                    </div>

                    {/* Score adjustments and frame controls */}
                    {match.status === 'live' && (
                      <div className="space-y-3.5 pt-2 border-t border-[#22c55e]/10">
                        {/* Adjust Scores */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">Adjust Scores:</span>
                          
                          <div className="flex items-center gap-4">
                            {/* Player A Score Controls */}
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 p-0.5">
                              <button 
                                onClick={() => adjustScore(match, 'A', -1)}
                                className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-white">P1</span>
                              <button 
                                onClick={() => adjustScore(match, 'A', 1)}
                                className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Player B Score Controls */}
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 p-0.5">
                              <button 
                                onClick={() => adjustScore(match, 'B', -1)}
                                className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-white">P2</span>
                              <button 
                                onClick={() => adjustScore(match, 'B', 1)}
                                className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Adjust Frame */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">Current Frame:</span>
                          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg border border-white/10 p-0.5">
                            <button 
                              onClick={() => adjustFrame(match, -1)}
                              className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-white">{match.current_frame}</span>
                            <button 
                              onClick={() => adjustFrame(match, 1)}
                              className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Result Confirmation */}
                    {(match.status === 'live' || match.status === 'scheduled') && (
                      <div className="pt-3 border-t border-[#22c55e]/10 space-y-3">
                        <span className="block text-xs font-semibold text-slate-300">Confirm Final Match Winner:</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setConfirmWinnerId(match.player_a_id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                              confirmWinnerId === match.player_a_id
                                ? 'bg-[#22c55e] border-transparent text-slate-950 font-black'
                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            }`}
                          >
                            {nameA}
                          </button>
                          
                          <button
                            onClick={() => setConfirmWinnerId(match.player_b_id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                              confirmWinnerId === match.player_b_id
                                ? 'bg-[#22c55e] border-transparent text-slate-950 font-black'
                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            }`}
                          >
                            {nameB}
                          </button>
                        </div>

                        {confirmWinnerId && (
                          <div className="flex gap-2 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <button
                              onClick={() => handleConfirmResult(match.id)}
                              disabled={submittingResult}
                              className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            >
                              {submittingResult ? (
                                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                              Confirm Winner & Proceed
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0d1b2a] via-[#1b263b] to-[#0d1b2a] border border-white/5 p-5 rounded-3xl flex items-center justify-between">
        <div className="space-y-1 z-10">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">
            Mora Slams Dashboard
          </span>
          <h2 className="text-xl font-extrabold text-white mt-1">Carrom Tournament</h2>
          <p className="text-[11px] text-slate-400">University of Moratuwa live match results and countdown timers.</p>
        </div>
        <div className="absolute right-0 opacity-10 blur-sm pointer-events-none transform translate-x-4">
          <Tv className="w-36 h-36 text-white" />
        </div>
      </div>

      {/* SECTION 1: LIVE SCORES */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
            Live Matches ({liveMatches.length})
          </h3>
        </div>

        {liveMatches.length > 0 ? (
          <div className="space-y-3">
            {liveMatches.map(renderMatchCard)}
          </div>
        ) : (
          <div className="glass-panel border-dashed border-white/10 rounded-2xl p-6 text-center text-slate-500 text-xs">
            No matches are currently active. Admins can start scheduled matches in the Schedule tab.
          </div>
        )}
      </section>

      {/* SECTION 2: UPCOMING MATCHES */}
      <section className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 px-1">
          Upcoming Schedule ({upcomingMatches.length})
        </h3>

        {upcomingMatches.length > 0 ? (
          <div className="space-y-3">
            {upcomingMatches.map(renderMatchCard)}
          </div>
        ) : (
          <div className="glass-panel border-dashed border-white/10 rounded-2xl p-6 text-center text-slate-500 text-xs">
            No upcoming matches scheduled.
          </div>
        )}
      </section>

      {/* SECTION 3: FINISHED MATCHES */}
      <section className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 px-1">
          Finished Matches ({finishedMatches.length})
        </h3>

        {finishedMatches.length > 0 ? (
          <div className="space-y-3">
            {finishedMatches.map(renderMatchCard)}
          </div>
        ) : (
          <div className="glass-panel border-dashed border-white/10 rounded-2xl p-6 text-center text-slate-500 text-xs">
            No matches have finished yet.
          </div>
        )}
      </section>
    </div>
  );
}

