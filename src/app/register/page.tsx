'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';

export default function RegisterRedirectPage() {
  const router = useRouter();
  const { setActiveTab } = useTournament();

  useEffect(() => {
    setActiveTab('register');
    router.replace('/');
  }, [setActiveTab, router]);

  return null;
}
