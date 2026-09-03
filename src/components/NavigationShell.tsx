'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTournament } from '@/context/TournamentContext';
import { 
  Tv, 
  Calendar, 
  Trophy, 
  UserPlus, 
  LogIn, 
  LogOut, 
  ShieldAlert, 
  Loader2, 
  ShieldCheck,
  FlaskConical
} from 'lucide-react';

interface NavigationShellProps {
  children: React.ReactNode;
}

export default function NavigationShell({ children }: NavigationShellProps) {
  const { 
    isAdmin, 
    adminEmail, 
    activeTab, 
    setActiveTab, 
    login, 
    logout,
    isDemoMode
  } = useTournament();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        setIsLoginOpen(false);
        setUsername('');
        setPassword('');
        setActiveTab('admin');
      } else {
        setError('Invalid credentials or access denied.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogin = () => {
    // Always clear fields when opening modal to prevent browser autofill display
    setUsername('');
    setPassword('');
    setError('');
    setIsLoginOpen(true);
  };

  const baseNavItems = [
    { name: 'Live', tab: 'live' as const, icon: Tv },
    { name: 'Schedule', tab: 'schedule' as const, icon: Calendar },
    { name: 'Results', tab: 'results' as const, icon: Trophy },
  ];

  const displayNavItems = isAdmin 
    ? [
        ...baseNavItems, 
        { name: 'Register', tab: 'register' as const, icon: UserPlus },
        { name: 'Admin', tab: 'admin' as const, icon: ShieldCheck }
      ]
    : baseNavItems;

  return (
    <div className="min-h-screen bg-[#060e08] text-[#f8fafc] flex flex-col pb-20">
      {/* ── Top Header Bar ── */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Mora Carrom Logo */}
          <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-[#f5a623]/50 shadow-[0_0_15px_rgba(245,166,35,0.3)] shrink-0">
            <Image 
              src="/mora-carrom-logo.jpg" 
              alt="Mora Carrom" 
              width={36} 
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight leading-none text-white">
              Mora Slams
            </h1>
            <span className="text-[9px] text-[#f5a623] font-bold tracking-wider uppercase">
              university of moratuwa
            </span>
          </div>

          {/* Demo Badge */}
          {isDemoMode && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full ml-1">
              <FlaskConical className="w-2.5 h-2.5" /> Demo
            </span>
          )}
        </div>

        {/* Header Right */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')} 
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeTab === 'admin' 
                  ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] border-transparent text-white'
                  : 'bg-white/5 border-white/10 text-[#f8fafc] hover:bg-white/10'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Portal
            </button>
          )}

          {isAdmin ? (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          ) : (
            <button
              onClick={handleOpenLogin}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:opacity-90 text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.25)] hover:scale-105"
            >
              <LogIn className="w-3.5 h-3.5" />
              Admin Login
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto p-4 md:p-6">
        {children}
      </main>

      {/* ── Fixed Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 nav-glass h-16 flex items-center justify-around px-2">
        {displayNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className="flex flex-col items-center justify-center flex-1 h-full relative transition-all focus:outline-none group"
            >
              {/* Active top line */}
              {isActive && (
                <div className="absolute top-0 w-8 h-[2px] bg-[#f5a623] rounded-full shadow-[0_0_10px_rgba(245,166,35,0.8)]" />
              )}
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive 
                  ? 'text-[#f5a623] scale-110 bg-[#f5a623]/10' 
                  : 'text-slate-500 group-hover:text-slate-300'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 font-semibold transition-all ${
                isActive ? 'text-[#f5a623]' : 'text-slate-600'
              }`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Admin Login Modal ── */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0c1f0f] border border-[#22c55e]/20 rounded-2xl p-6 shadow-2xl shadow-[#22c55e]/10">
            {/* Modal Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#f5a623]/40 shadow-[0_0_20px_rgba(245,166,35,0.2)] mb-3">
                <Image 
                  src="/mora-carrom-logo.jpg" 
                  alt="Mora Carrom" 
                  width={56} 
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-base font-bold text-white">Admin Authentication</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Access restricted to authorized tournament administrators only.
              </p>
            </div>

            {/* ── LOGIN FORM ── */}
            {/* autocomplete="off" prevents browser prefill; name randomization further prevents it */}
            <form 
              onSubmit={handleLoginSubmit} 
              className="space-y-4"
              autoComplete="off"
            >
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs text-center font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username / Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                  autoComplete="off"
                  data-form-type="other"
                  name="admin-username-field"
                  className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  autoComplete="new-password"
                  data-form-type="other"
                  name="admin-password-field"
                  className="w-full bg-white/5 border border-white/10 focus:border-[#22c55e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Demo hint */}
              {isDemoMode && (
                <div className="text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-center font-medium">
                  Demo credentials — Username: <code className="font-bold">Sachintha</code> · Password: <code className="font-bold">240364H</code>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginOpen(false);
                    setUsername('');
                    setPassword('');
                    setError('');
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-2.5 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:opacity-90 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.25)] flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Verify & Login'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
