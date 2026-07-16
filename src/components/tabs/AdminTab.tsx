'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { 
  Users, 
  Settings, 
  History, 
  Check, 
  X, 
  Loader2, 
  Clock, 
  Table, 
  Mail,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminTab() {
  const { 
    isAdmin,
    registrations, 
    approveReg, 
    rejectReg, 
    settings, 
    updateSettings, 
    auditLogs,
    adminEmail
  } = useTournament();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white">Access Denied</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            You must be logged in as an administrator to access the Control Panel. Use the "Admin Login" button in the header.
          </p>
        </div>
      </div>
    );
  }

  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'settings' | 'logs'>('queue');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Settings State
  const [formSettings, setFormSettings] = useState({
    startTime: settings.start_time.slice(0, 5),
    tablesCount: settings.tables_count,
    breakDuration: settings.break_duration_minutes,
    matchDuration: settings.match_duration_minutes
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const handleApprove = async (regId: string) => {
    setProcessingId(regId);
    try {
      await approveReg(regId);
      alert('Registration approved!');
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (regId: string) => {
    if (!confirm('Are you sure you want to reject this team registration?')) return;
    setProcessingId(regId);
    try {
      await rejectReg(regId);
      alert('Registration rejected.');
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettings(
        formSettings.startTime,
        formSettings.tablesCount,
        formSettings.matchDuration,
        formSettings.breakDuration
      );
      alert('Tournament settings updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const pendingRegs = registrations.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-1.5">
            Control Panel
          </h2>
          <p className="text-xs text-slate-400">Manage pending team queues, audit actions, and default match parameters.</p>
        </div>
        <span className="text-[10px] bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] font-mono px-3 py-1 rounded-full uppercase tracking-wider font-extrabold">
          Admin: {adminEmail}
        </span>
      </div>

      {/* Tabs list */}
      <div className="grid grid-cols-3 bg-white/5 border border-white/10 p-1 rounded-xl">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'queue'
              ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Queue ({pendingRegs.length})
        </button>
        
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'settings'
              ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" /> Parameters
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'logs'
              ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" /> Audit Trails
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* SUBTAB 1: PENDING REGISTRATIONS */}
        {activeSubTab === 'queue' && (
          <motion.div
            key="queue-subtab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            {pendingRegs.length === 0 ? (
              <div className="glass-panel border-dashed border-white/10 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Roster queue is empty. No pending registrations.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRegs.map((reg) => {
                  const team = reg.team;
                  const uni = team?.university?.name || 'N/A';
                  const roster = team?.players || [];

                  return (
                    <div 
                      key={reg.id}
                      className="glass-panel rounded-2xl p-5 border border-white/5 space-y-4"
                    >
                      <div className="flex justify-between items-start border-b border-white/5 pb-3">
                        <div>
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#22c55e]">
                            {uni}
                          </span>
                          <h4 className="font-bold text-white text-base leading-tight mt-0.5">{team?.name}</h4>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(reg.id)}
                            disabled={processingId === reg.id}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 p-2 rounded-xl transition-all"
                            title="Reject Team"
                          >
                            {processingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => handleApprove(reg.id)}
                            disabled={processingId === reg.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md"
                          >
                            {processingId === reg.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Approve
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Leader: <strong>{team?.leader_name}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                          <span className="font-mono">{team?.leader_email}</span>
                        </div>
                      </div>

                      <div className="bg-slate-950/45 p-3 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                          ROSTER MEMBERS:
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {roster.map((player: any) => (
                            <div key={player.id} className="flex justify-between items-center py-1 border-b border-white/5 pb-1">
                              <span className="font-semibold text-slate-200">
                                {player.full_name} {player.is_leader && <span className="text-[9px] text-[#22c55e] font-black">(Leader)</span>}
                              </span>
                              <span className="text-slate-500 font-mono text-[10px]">{player.index_number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* SUBTAB 2: TOURNAMENT SETTINGS */}
        {activeSubTab === 'settings' && (
          <motion.div
            key="settings-subtab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="max-w-md mx-auto bg-white/5 border border-white/5 p-6 rounded-2xl"
          >
            <h3 className="text-sm font-bold text-white mb-4 border-b border-white/5 pb-2">
              Default Tournament Settings
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#22c55e]" /> Start time of draw matches
                </label>
                <input
                  type="time"
                  required
                  value={formSettings.startTime}
                  onChange={(e) => setFormSettings({ ...formSettings, startTime: e.target.value })}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#22c55e] focus:outline-none transition-all color-scheme-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                  <Table className="w-3.5 h-3.5 text-[#22c55e]" /> Number of active tables
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={formSettings.tablesCount}
                  onChange={(e) => setFormSettings({ ...formSettings, tablesCount: parseInt(e.target.value) })}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#22c55e] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#22c55e]" /> Match duration limit (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  required
                  value={formSettings.matchDuration}
                  onChange={(e) => setFormSettings({ ...formSettings, matchDuration: parseInt(e.target.value) })}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#22c55e] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#22c55e]" /> Break interval between slots (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={formSettings.breakDuration}
                  onChange={(e) => setFormSettings({ ...formSettings, breakDuration: parseInt(e.target.value) })}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#22c55e] focus:outline-none transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-slate-950 font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.15)]"
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Parameter Updates'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* SUBTAB 3: AUDIT LOGS */}
        {activeSubTab === 'logs' && (
          <motion.div
            key="logs-subtab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-3"
          >
            {auditLogs.length === 0 ? (
              <div className="glass-panel border-dashed border-white/10 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Audit logs are clean. No administrative actions recorded.
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                      <span className="text-[#22c55e]">{log.action}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    
                    <p className="text-slate-300">
                      Admin: <strong className="text-slate-200">{log.admin_email}</strong>
                    </p>

                    <div className="text-[10px] text-slate-500 font-mono bg-slate-950/20 p-2 rounded border border-white/5 truncate">
                      {JSON.stringify(log.details)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

