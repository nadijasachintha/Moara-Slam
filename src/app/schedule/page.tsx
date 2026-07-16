'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';

export default function ScheduleRedirectPage() {
  const router = useRouter();
  const { setActiveTab } = useTournament();

  useEffect(() => {
    setActiveTab('schedule');
    router.replace('/');
  }, [setActiveTab, router]);

  return null;
}
