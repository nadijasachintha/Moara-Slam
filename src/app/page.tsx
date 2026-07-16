'use client';

import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import LiveScoresTab from '@/components/tabs/LiveScoresTab';
import ScheduleTab from '@/components/tabs/ScheduleTab';
import ResultsTab from '@/components/tabs/ResultsTab';
import RegisterTab from '@/components/tabs/RegisterTab';
import AdminTab from '@/components/tabs/AdminTab';

export default function HomePage() {
  const { activeTab, loading } = useTournament();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400 font-medium">Syncing tournament dashboard...</p>
      </div>
    );
  }

  // Swap tabs instantly with 0ms router latency
  switch (activeTab) {
    case 'live':
      return <LiveScoresTab />;
    case 'schedule':
      return <ScheduleTab />;
    case 'results':
      return <ResultsTab />;
    case 'register':
      return <RegisterTab />;
    case 'admin':
      return <AdminTab />;
    default:
      return <LiveScoresTab />;
  }
}

