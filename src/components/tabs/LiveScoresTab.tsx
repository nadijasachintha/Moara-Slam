'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Match } from '@/types/database.types';
import MatchTimer from '@/components/MatchTimer';
import { 
  Play, 
  Pause, 
  Check, 
  Plus, 
  Minus, 
  Tv,
  Settings,
  Trophy,
  Clock
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

  // Compile exact list of 15 tables
  const tableNumbers = Array.from({ length: 15 }, (_, i) => i + 1);

  const cards = tableNumbers.map((tableNum) => {
    const tableMatches = matches.filter(m => m.table_number === tableNum);
    const liveMatch = tableMatches.find(m => m.status === 'live');
    const scheduledMatches = tableMatches
      .filter(m => m.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
    const finishedMatches = tableMatches
      .filter(m => m.status === 'finished')
      .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());

    let match: Match | null = null;
    let state: 'live' | 'upcoming' | 'completed' | 'idle' = 'idle';

    if (liveMatch) {
      match = liveMatch;
      state = 'live';
    } else if (scheduledMatches.length > 0) {
      match = scheduledMatches[0];
      state = 'upcoming';
    } else if (finishedMatches.length > 0) {
      match = finishedMatches[0];
      state = 'completed';
    }

    return { tableNum, match, state };
  });

  const activeLiveCount = cards.filter(c => c.state === 'live').length;

  // Render Functions for the 4 card states
  const renderIdleScoreCard = (tableNum: number) => {
    return (
      <div 
        key={tableNum}
        className="relative overflow-hidden bg-slate-900/10 border border-dashed border-white/5 rounded-2xl p-4 flex flex-col justify-between h-40 items-center justify-center space-y-2 opacity-50"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-400">
          Table {tableNum}
        </span>
        <div className="space-y-1 text-center">
          <h4 className="font-extrabold text-slate-500 text-sm">Table Idle</h4>
          <p className="text-[9px] text-slate-600 uppercase tracking-wider">No Match Assigned</p>
        </div>
      </div>
    );
  };

  const renderUpcomingScoreCard = (match: Match, tableNum: number) => {
    const playerA = match.player_a;
    const playerB = match.player_b;
    const nameA = playerA ? playerA.full_name : 'TBD';
    const uniA = playerA ? (playerA.team as any)?.university?.name : 'N/A';
    const nameB = playerB ? playerB.full_name : 'TBD';
    const uniB = playerB ? (playerB.team as any)?.university?.name : 'N/A';
    const timeStr = new Date(match.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div 
        key={tableNum} 
        className="relative overflow-hidden bg-gradient-to-br from-[#1c160a] to-[#241b0b] border border-amber-500/15 rounded-2xl shadow-lg p-4 flex flex-col justify-between h-40 space-y-2 transition-all duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-300">
              Table {tableNum}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Scheduled
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            {timeStr}
          </span>
        </div>

        {/* Central Matchup */}
        <div className="flex items-center justify-between gap-2 py-0.5">
          <div className="flex-1 text-center min-w-0">
            <h4 className="font-extrabold text-white text-xs truncate leading-tight">{nameA}</h4>
            <span className="text-[8px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniA}</span>
          </div>

          <div className="flex flex-col items-center justify-center px-2 shrink-0">
            <span className="text-[9px] font-extrabold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
              VS
            </span>
          </div>

          <div className="flex-1 text-center min-w-0">
            <h4 className="font-extrabold text-white text-xs truncate leading-tight">{nameB}</h4>
            <span className="text-[8px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniB}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
          <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest truncate max-w-[80px]">
            {match.round.replace('_', ' ')}
          </span>

          {isAdmin && (
            <button
              onClick={() => handleStart(match.id)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-md"
            >
              <Play className="w-3 h-3 fill-slate-950" /> Start
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCompletedScoreCard = (match: Match, tableNum: number) => {
    const playerA = match.player_a;
    const playerB = match.player_b;
    const winner = match.winner;
    const nameA = playerA ? playerA.full_name : 'TBD';
    const uniA = playerA ? (playerA.team as any)?.university?.name : 'N/A';
    const nameB = playerB ? playerB.full_name : 'TBD';
    const uniB = playerB ? (playerB.team as any)?.university?.name : 'N/A';

    return (
      <div 
        key={tableNum} 
        className="relative overflow-hidden bg-gradient-to-br from-[#0b130e] to-[#0c1811] border border-white/5 rounded-2xl shadow-lg p-4 flex flex-col justify-between h-40 space-y-2 transition-all duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-300">
              Table {tableNum}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-white/10 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 text-[#f5a623]" />
              Completed
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-500 font-mono">
            {match.total_duration_minutes}m limits
          </span>
        </div>

        {/* Display */}
        <div className="flex items-center justify-between gap-2 py-0.5">
          {/* Player A */}
          <div className="flex-1 text-center min-w-0">
            <h4 className={`font-extrabold text-xs truncate leading-tight ${
              winner?.id === playerA?.id ? 'text-[#22c55e]' : 'text-slate-400'
            }`}>
              {nameA}
              {winner?.id === playerA?.id && ' 🏆'}
            </h4>
            <span className="text-[8px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniA}</span>
          </div>

          {/* Centered Scores */}
          <div className="flex flex-col items-center justify-center px-2 shrink-0">
            <span className="text-base font-black text-white tracking-widest bg-slate-950/60 px-2.5 py-1 rounded-lg border border-white/5 leading-none">
              {match.score_a} - {match.score_b}
            </span>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1 leading-none">
              {match.current_frame} frames
            </span>
          </div>

          {/* Player B */}
          <div className="flex-1 text-center min-w-0">
            <h4 className={`font-extrabold text-xs truncate leading-tight ${
              winner?.id === playerB?.id ? 'text-[#22c55e]' : 'text-slate-400'
            }`}>
              {nameB}
              {winner?.id === playerB?.id && ' 🏆'}
            </h4>
            <span className="text-[8px] text-slate-500 block truncate mt-0.5 uppercase tracking-wider">{uniB}</span>
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
          <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest truncate max-w-[80px]">
            {match.round.replace('_', ' ')}
          </span>
          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
            Awaiting next
          </span>
        </div>
      </div>
    );
  };

  const renderLiveScoreCard = (match: Match, tableNum: number) => {
    const isExpanded = expandedMatchId === match.id;
    const playerA = match.player_a;
    const playerB = match.player_b;

    const nameA = playerA ? playerA.full_name : 'TBD';
    const uniA = playerA ? (playerA.team as any)?.university?.name : 'N/A';
    const nameB = playerB ? playerB.full_name : 'TBD';
    const uniB = playerB ? (playerB.team as any)?.university?.name : 'N/A';

    return (
      <div 
        key={tableNum} 
        className="relative overflow-hidden bg-gradient-to-br from-[#0c1f0f] to-[#0f2d17] border border-[#22c55e]/15 rounded-2xl shadow-xl shadow-[#22c55e]/5 p-4 flex flex-col justify-between space-y-4 transition-all duration-300"
      >
        {/* Card Header (Table & Pulse Indicator) */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 text-slate-300">
              Table {tableNum}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <span className="w-1 h-1 bg-slate-950 rounded-full"></span>
              Live
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <MatchTimer match={match} />
          </div>
        </div>

        {/* Central Matchup scores (Large Display) */}
        <div className="flex items-center justify-between gap-2 py-1">
          {/* Player A */}
          <div className="flex-1 text-center min-w-0">
            <h4 className="font-extrabold text-white text-sm truncate leading-tight">{nameA}</h4>
            <span className="text-[9px] text-slate-400 block truncate mt-0.5 uppercase tracking-wider">{uniA}</span>
          </div>

          {/* Central Score Digits */}
          <div className="flex flex-col items-center justify-center px-3 shrink-0">
            <span className="text-2xl font-black text-white tracking-widest bg-slate-950/60 px-3 py-1 rounded-xl border border-white/5 leading-none">
              {match.score_a} - {match.score_b}
            </span>
            <span className="text-[9px] text-[#f5a623] font-bold uppercase tracking-wider mt-1.5 leading-none">
              Frame {match.current_frame} / 8
            </span>
          </div>

          {/* Player B */}
          <div className="flex-1 text-center min-w-0">
            <h4 className="font-extrabold text-white text-sm truncate leading-tight">{nameB}</h4>
            <span className="text-[9px] text-slate-400 block truncate mt-0.5 uppercase tracking-wider">{uniB}</span>
          </div>
        </div>

        {/* Card Footer (Round Details & Admin settings trigger) */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {match.round.replace('_', ' ')}
          </span>

          {isAdmin && (
            <button
              onClick={() => toggleExpand(match.id)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border transition-all flex items-center gap-1 ${
                isExpanded 
                  ? 'bg-[#22c55e] border-transparent text-slate-950'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Settings className="w-3 h-3" />
              {isExpanded ? 'Close Controls' : 'Referee'}
            </button>
          )}
        </div>

        {/* Expanded Referee Live Controls */}
        <AnimatePresence>
          {isExpanded && isAdmin && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-3 border-t border-white/5 space-y-3.5"
            >
              {/* Timer Control */}
              <div className="flex gap-2">
                {!match.is_paused ? (
                  <button
                    onClick={() => handlePause(match.id)}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-extrabold py-2 rounded-xl flex items-center justify-center gap-1"
                  >
                    <Pause className="w-3.5 h-3.5 fill-slate-950" /> Pause Timer
                  </button>
                ) : (
                  <button
                    onClick={() => handleResume(match.id)}
                    className="flex-1 bg-[#22c55e] hover:bg-[#22c55e]/90 text-slate-950 text-[10px] font-extrabold py-2 rounded-xl flex items-center justify-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" /> Resume Timer
                  </button>
                )}
              </div>

              {/* Increments / Decrements Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* P1 Controls */}
                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 font-bold block mb-1 leading-none">P1 Points</span>
                  <div className="flex items-center gap-2.5">
                    <button 
                      onClick={() => adjustScore(match, 'A', -1)}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-white min-w-[14px] text-center">{match.score_a}</span>
                    <button 
                      onClick={() => adjustScore(match, 'A', 1)}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* P2 Controls */}
                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 font-bold block mb-1 leading-none">P2 Points</span>
                  <div className="flex items-center gap-2.5">
                    <button 
                      onClick={() => adjustScore(match, 'B', -1)}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-white min-w-[14px] text-center">{match.score_b}</span>
                    <button 
                      onClick={() => adjustScore(match, 'B', 1)}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Adjust Frame */}
              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-white/5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1">Frame</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => adjustFrame(match, -1)}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-white min-w-[16px] text-center">{match.current_frame}</span>
                  <button 
                    onClick={() => adjustFrame(match, 1)}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Winner Selection & Finish Match */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Confirm Match Result:
                </span>
                
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setConfirmWinnerId(match.player_a_id)}
                    className={`px-2 py-1.5 rounded-lg text-[9px] font-bold border truncate transition-all ${
                      confirmWinnerId === match.player_a_id
                        ? 'bg-[#22c55e] border-transparent text-slate-950 font-black'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {nameA}
                  </button>
                  
                  <button
                    onClick={() => setConfirmWinnerId(match.player_b_id)}
                    className={`px-2 py-1.5 rounded-lg text-[9px] font-bold border truncate transition-all ${
                      confirmWinnerId === match.player_b_id
                        ? 'bg-[#22c55e] border-transparent text-slate-950 font-black'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {nameB}
                  </button>
                </div>

                {confirmWinnerId && (
                  <button
                    onClick={() => handleConfirmResult(match.id)}
                    disabled={submittingResult}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1 shadow-md mt-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  >
                    {submittingResult ? (
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    Confirm Winner
                  </button>
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

      {/* LIVE SCORES SCORE CARD GRID */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
              Active Live Boards ({activeLiveCount} Live)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/5">
            15 Hall Tables
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ tableNum, match, state }) => {
            if (state === 'live') return renderLiveScoreCard(match!, tableNum);
            if (state === 'upcoming') return renderUpcomingScoreCard(match!, tableNum);
            if (state === 'completed') return renderCompletedScoreCard(match!, tableNum);
            return renderIdleScoreCard(tableNum);
          })}
        </div>
      </section>
    </div>
  );
}
