'use client';

import React, { useState, useEffect } from 'react';
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
  Clock,
  Save,
  Trash2,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RefereeControlsProps {
  match: Match;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, frame: number) => Promise<void>;
  onPause: (matchId: string) => Promise<void>;
  onResume: (matchId: string) => Promise<void>;
  onConfirmResult: (matchId: string, winnerId: string) => Promise<void>;
  confirmWinnerId: string | null;
  setConfirmWinnerId: (id: string | null) => void;
  submittingResult: boolean;
  nameA: string;
  nameB: string;
}

function RefereeControls({
  match,
  onUpdateScore,
  onPause,
  onResume,
  onConfirmResult,
  confirmWinnerId,
  setConfirmWinnerId,
  submittingResult,
  nameA,
  nameB
}: RefereeControlsProps) {
  const [scoreA, setScoreA] = useState(match.score_a);
  const [scoreB, setScoreB] = useState(match.score_b);
  const [frame, setFrame] = useState(match.current_frame);
  const [saving, setSaving] = useState(false);

  // Sync if database updates from other sources (realtime)
  useEffect(() => {
    setScoreA(match.score_a);
    setScoreB(match.score_b);
    setFrame(match.current_frame);
  }, [match.score_a, match.score_b, match.current_frame]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateScore(match.id, scoreA, scoreB, frame);
    } catch (err: any) {
      alert(err.message || 'Error saving scores');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-3 border-t border-white/5 space-y-3.5">
      {/* Timer Control */}
      <div className="flex gap-2">
        {!match.is_paused ? (
          <button
            onClick={() => onPause(match.id)}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-extrabold py-2 rounded-xl flex items-center justify-center gap-1 transition-all"
          >
            <Pause className="w-3.5 h-3.5 fill-slate-950" /> Pause Timer
          </button>
        ) : (
          <button
            onClick={() => onResume(match.id)}
            className="flex-1 bg-[#22c55e] hover:bg-[#22c55e]/90 text-slate-950 text-[10px] font-extrabold py-2 rounded-xl flex items-center justify-center gap-1 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" /> Resume Timer
          </button>
        )}
      </div>

      {/* Score Fields Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* P1 Controls */}
        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
          <span className="text-[9px] text-slate-400 font-bold block mb-1.5 leading-none uppercase tracking-wider">P1 Points</span>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setScoreA(prev => Math.max(0, prev - 1))}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold transition-all"
            >
              -
            </button>
            <input 
              type="number"
              min="0"
              value={scoreA}
              onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-12 h-7 bg-slate-950/80 border border-white/10 rounded-lg text-center text-xs font-black text-white focus:outline-none focus:border-[#22c55e]/50"
            />
            <button 
              type="button"
              onClick={() => setScoreA(prev => prev + 1)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* P2 Controls */}
        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
          <span className="text-[9px] text-slate-400 font-bold block mb-1.5 leading-none uppercase tracking-wider">P2 Points</span>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setScoreB(prev => Math.max(0, prev - 1))}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold transition-all"
            >
              -
            </button>
            <input 
              type="number"
              min="0"
              value={scoreB}
              onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-12 h-7 bg-slate-950/80 border border-white/10 rounded-lg text-center text-xs font-black text-white focus:outline-none focus:border-[#22c55e]/50"
            />
            <button 
              type="button"
              onClick={() => setScoreB(prev => prev + 1)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-xs font-extrabold transition-all"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Adjust Frame and Save Row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-white/5 h-10">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Frame</span>
          <div className="flex items-center gap-1.5">
            <button 
              type="button"
              onClick={() => setFrame(prev => Math.max(1, prev - 1))}
              className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-[10px] font-extrabold transition-all"
            >
              -
            </button>
            <span className="text-xs font-black text-white min-w-[14px] text-center">{frame}</span>
            <button 
              type="button"
              onClick={() => setFrame(prev => Math.min(8, prev + 1))}
              className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white text-[10px] font-extrabold transition-all"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || (scoreA === match.score_a && scoreB === match.score_b && frame === match.current_frame)}
          className="flex-1 bg-gradient-to-r from-[#22c55e] to-[#16a34a] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 hover:from-[#22c55e]/90 hover:to-[#16a34a]/90 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider py-2 rounded-xl h-10 flex items-center justify-center gap-1 transition-all shadow-[0_0_10px_rgba(34,197,94,0.15)] disabled:shadow-none"
        >
          {saving ? (
            <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            'Save Score'
          )}
        </button>
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
            onClick={() => onConfirmResult(match.id, confirmWinnerId)}
            disabled={submittingResult}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1 shadow-md mt-1 animate-in fade-in slide-in-from-bottom-2 duration-150 transition-all"
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
    </div>
  );
}

export default function LiveScoresTab() {
  const { 
    matches, 
    isAdmin, 
    startM,
    pauseM, 
    resumeM, 
    updateScore, 
    confirmWinner,
    revertToLive
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
  const tableNumbers = Array.from({ length: 16 }, (_, i) => i + 1);

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
          Board {tableNum}
        </span>
        <div className="space-y-1 text-center">
          <h4 className="font-extrabold text-slate-500 text-sm">Board Idle</h4>
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
              Board {tableNum}
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
              Board {tableNum}
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
          {isAdmin ? (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to edit this match? It will be reverted to "Live" status. Any bracket progression from this match will be undone.')) {
                  revertToLive(match.id);
                }
              }}
              className="text-[9px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              <Edit className="w-3 h-3" /> Edit Result
            </button>
          ) : (
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
              Awaiting next
            </span>
          )}
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
              Board {tableNum}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <span className="w-1 h-1 bg-slate-950 rounded-full"></span>
              Live
            </span>
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
            >
              <RefereeControls 
                match={match}
                onUpdateScore={updateScore}
                onPause={handlePause}
                onResume={handleResume}
                onConfirmResult={handleConfirmResult}
                confirmWinnerId={confirmWinnerId}
                setConfirmWinnerId={setConfirmWinnerId}
                submittingResult={submittingResult}
                nameA={nameA}
                nameB={nameB}
              />
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
            16 Hall Boards
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 2xl:grid-cols-8 gap-3">
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
