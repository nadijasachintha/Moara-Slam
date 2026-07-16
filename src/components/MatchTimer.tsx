'use client';

import React, { useState, useEffect } from 'react';
import { Match } from '@/types/database.types';
import { Timer, AlertTriangle } from 'lucide-react';

interface MatchTimerProps {
  match: Match;
  onExpiry?: () => void;
}

export default function MatchTimer({ match, onExpiry }: MatchTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => calculateSecondsLeft(match));

  function calculateSecondsLeft(m: Match): number {
    if (m.status === 'scheduled') {
      return m.total_duration_minutes * 60;
    }
    if (m.status === 'finished') {
      return 0;
    }
    if (!m.match_start_time) {
      return m.total_duration_minutes * 60;
    }

    const startTime = new Date(m.match_start_time).getTime();
    const totalDurationMs = m.total_duration_minutes * 60 * 1000;
    const pauseDurationMs = m.pause_duration_seconds * 1000;

    let elapsedMs = 0;
    if (m.is_paused) {
      const pausedTime = m.paused_at_timestamp 
        ? new Date(m.paused_at_timestamp).getTime() 
        : Date.now();
      elapsedMs = (pausedTime - startTime) - pauseDurationMs;
    } else {
      elapsedMs = (Date.now() - startTime) - pauseDurationMs;
    }

    const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
    return Math.ceil(remainingMs / 1000);
  }

  useEffect(() => {
    // Set initial
    setSecondsLeft(calculateSecondsLeft(match));

    // If match is not live or is paused, no ticking needed
    if (match.status !== 'live' || match.is_paused) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateSecondsLeft(match);
      setSecondsLeft(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        if (onExpiry) onExpiry();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [match]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (match.status === 'finished') {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400 font-semibold text-xs bg-slate-950/40 border border-slate-800 px-2 py-1 rounded-md">
        Finished
      </span>
    );
  }

  if (match.status === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-1 text-sky-400 font-semibold text-xs bg-sky-950/20 border border-sky-800/30 px-2 py-1 rounded-md">
        <Timer className="w-3.5 h-3.5" />
        {match.total_duration_minutes}m
      </span>
    );
  }

  // Live match
  const isExpired = secondsLeft === 0;

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
      match.is_paused 
        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
        : isExpired
        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 border-neon'
        : 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e] border-neon'
    }`}>
      <Timer className={`w-3.5 h-3.5 ${!match.is_paused && !isExpired ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
      {match.is_paused ? (
        <span>PAUSED ({formatTime(secondsLeft)})</span>
      ) : isExpired ? (
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-400" /> Overtime
        </span>
      ) : (
        <span>{formatTime(secondsLeft)}</span>
      )}
    </span>
  );
}

