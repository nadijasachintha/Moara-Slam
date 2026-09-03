'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { 
  UserPlus, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  ArrowLeft, 
  Loader2,
  BookmarkCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FormPlayer {
  fullName: string;
  indexNumber: string;
  isLeader: boolean;
}

export default function RegisterTab() {
  const { 
    submitReg, 
    universities,
    isAdmin,
    registrations,
    approveReg,
    rejectReg
  } = useTournament();
  
  // Form State
  const [selectedUniId, setSelectedUniId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [teamCategory, setTeamCategory] = useState<'boys' | 'girls'>('boys');
  const [teamGroup, setTeamGroup] = useState<'group_a' | 'group_b'>('group_a');
  const [players, setPlayers] = useState<FormPlayer[]>([
    { fullName: '', indexNumber: '', isLeader: true }
  ]);

  // Stage: 'edit' | 'confirm' | 'success'
  const [stage, setStage] = useState<'edit' | 'confirm' | 'success'>('edit');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (regId: string) => {
    setProcessingId(regId);
    try {
      await approveReg(regId);
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
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRegs = registrations.filter(r => r.status === 'pending');

  const handleAddPlayer = () => {
    setPlayers([...players, { fullName: '', indexNumber: '', isLeader: false }]);
  };

  const handleRemovePlayer = (index: number) => {
    const p = players[index];
    if (p.isLeader) {
      const newPlayers = players.filter((_, i) => i !== index);
      if (newPlayers.length > 0) {
        newPlayers[0].isLeader = true;
        setPlayers(newPlayers);
      } else {
        setPlayers(newPlayers);
      }
    } else {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const handlePlayerChange = (index: number, field: keyof FormPlayer, value: any) => {
    const updated = [...players];
    if (field === 'isLeader' && value === true) {
      updated.forEach((p, idx) => {
        p.isLeader = idx === index;
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setPlayers(updated);

    if (field === 'isLeader' && value === true) {
      setLeaderName(updated[index].fullName);
    } else if (updated[index].isLeader && field === 'fullName') {
      setLeaderName(value);
    }
  };

  const validateForm = () => {
    if (!selectedUniId) return 'Please select your University.';
    if (!teamName.trim()) return 'Please choose a Team Name.';
    if (players.length < 3) return 'At least 3 players are required.';
    
    for (let i = 0; i < players.length; i++) {
      if (!players[i].fullName.trim() || !players[i].indexNumber.trim()) {
        return `Please fill in all details for Player ${i + 1}.`;
      }
    }

    const hasLeader = players.some((p) => p.isLeader);
    if (!hasLeader) return 'Please select one team member as the Team Leader.';

    return '';
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = validateForm();
    if (errorMsg) {
      setSubmitError(errorMsg);
      return;
    }
    setSubmitError('');
    setStage('confirm');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitReg({
        universityId: selectedUniId,
        teamName: teamName.trim(),
        leaderName: leaderName.trim(),
        leaderEmail: 'no-email@example.com',
        category: teamCategory,
        groupName: teamGroup,
        players: players.map((p) => ({
          fullName: p.fullName.trim(),
          indexNumber: p.indexNumber.trim(),
          isLeader: p.isLeader
        }))
      });

      setStage('success');
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getUniDisplay = () => {
    const found = universities.find((u) => u.id === selectedUniId);
    return found ? found.name : 'Choose University';
  };

  return (
    <div className="space-y-6">
      {/* Stage Tracker */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider px-1">
        <span className={stage === 'edit' ? 'text-[#22c55e]' : 'text-slate-400'}>Form Details</span>
        <span>/</span>
        <span className={stage === 'confirm' ? 'text-[#22c55e]' : 'text-slate-400'}>Review Setup</span>
        <span>/</span>
        <span className={stage === 'success' ? 'text-[#22c55e]' : 'text-slate-400'}>Confirmation</span>
      </div>

      <AnimatePresence mode="wait">
        {stage === 'edit' && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-6"
          >
            <form onSubmit={handleProceedToConfirm} className="md:col-span-3 space-y-5 bg-white/5 border border-white/5 p-5 rounded-2xl">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#22c55e]" /> Team Registration
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Register players from your university to enter the draw.</p>
              </div>

              {submitError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{submitError}</span>
                </div>
              )}

              {/* University */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase">University</label>
                <select
                    value={selectedUniId}
                    onChange={(e) => setSelectedUniId(e.target.value)}
                    required
                    className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-[#22c55e] focus:outline-none transition-all"
                  >
                    <option value="" disabled className="bg-[#0a160c]">Select your institution</option>
                    {universities.map((uni) => (
                      <option key={uni.id} value={uni.id} className="bg-[#0a160c] text-white">
                        {uni.name}
                      </option>
                    ))}
                  </select>
              </div>

              {/* Team Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE Strikers"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#22c55e] focus:outline-none transition-all"
                />
              </div>

              {/* Category and Group */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Gender</label>
                  <select 
                    value={teamCategory}
                    onChange={(e) => setTeamCategory(e.target.value as 'boys' | 'girls')}
                    className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#22c55e] focus:outline-none transition-all appearance-none"
                  >
                    <option value="boys" className="bg-[#0a160c] text-white">Boys</option>
                    <option value="girls" className="bg-[#0a160c] text-white">Girls</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Group</label>
                  <select 
                    value={teamGroup}
                    onChange={(e) => setTeamGroup(e.target.value as 'group_a' | 'group_b')}
                    className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#22c55e] focus:outline-none transition-all appearance-none"
                  >
                    <option value="group_a" className="bg-[#0a160c] text-white">Group A</option>
                    <option value="group_b" className="bg-[#0a160c] text-white">Group B</option>
                  </select>
                </div>
              </div>

              {/* Roster */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase">Players Roster</span>
                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    className="text-[10px] font-bold uppercase tracking-wider text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#22c55e]/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Player
                  </button>
                </div>

                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div key={index} className="p-3.5 bg-slate-950/30 rounded-xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                          Player #{index + 1}
                        </span>
                        
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold cursor-pointer select-none">
                            <input
                              type="radio"
                              name="leaderRadio"
                              checked={player.isLeader}
                              onChange={() => handlePlayerChange(index, 'isLeader', true)}
                              className="accent-[#22c55e]"
                            />
                            Team Leader
                          </label>

                          {players.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePlayer(index)}
                              className="text-rose-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={player.fullName}
                          onChange={(e) => handlePlayerChange(index, 'fullName', e.target.value)}
                          className="bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-[#22c55e] focus:outline-none transition-all"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Index Number"
                          value={player.indexNumber}
                          onChange={(e) => handlePlayerChange(index, 'indexNumber', e.target.value)}
                          className="bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-[#22c55e] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#22c55e]/90 hover:to-[#16a34a]/90 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,242,254,0.15)] hover:scale-[1.01]"
                >
                  Review Team Registration
                </button>
              </div>
            </form>

            {/* Glowing Holographic Badge Card */}
            <div className="md:col-span-2 hidden md:block">
              <div className="sticky top-20 bg-gradient-to-br from-[#0c1f0f] to-[#0f2d17] border border-white/15 p-5 rounded-2xl relative overflow-hidden shadow-2xl shadow-[#22c55e]/5 group">
                <div className="absolute -top-12 -left-12 w-28 h-28 bg-[#22c55e] opacity-10 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-[#16a34a] opacity-10 rounded-full blur-2xl"></div>

                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#22c55e]">
                      TEAM PREVIEW CARD
                    </span>
                    <h4 className="font-bold text-white text-base truncate max-w-[150px]">
                      {teamName || 'Strikers United'}
                    </h4>
                  </div>
                  <Sparkles className="w-5 h-5 text-[#22c55e] animate-pulse" />
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Institution</span>
                    <p className="text-xs font-semibold text-white truncate">{getUniDisplay()}</p>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Contact Leader</span>
                    <p className="text-xs font-semibold text-slate-200 truncate">{leaderName || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Category</span>
                    <p className="text-xs font-semibold text-slate-200 truncate uppercase">{teamCategory}</p>
                    <p className="text-[9px] text-slate-500 truncate uppercase">{teamGroup.replace('_', ' ')}</p>
                  </div>

                  <div className="border-t border-white/5 pt-3">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Registered Roster</span>
                    <div className="space-y-1">
                      {players.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] text-slate-300">
                          <span className="truncate max-w-[120px] font-medium">
                            {p.fullName || `Player #${idx + 1}`}
                            {p.isLeader && <span className="text-[8px] font-extrabold text-[#22c55e] ml-1">(L)</span>}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px]">{p.indexNumber || 'Index'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[8px] text-slate-500 font-bold border-t border-white/5 pt-3">
                  <span>MORA SLAMS 2026</span>
                  <span className="bg-[#22c55e]/10 text-[#22c55e] px-1.5 py-0.5 rounded border border-[#22c55e]/15 uppercase tracking-wider font-extrabold">
                    Pending Seed
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STAGE 2: CONFIRMATION SCREEN */}
        {stage === 'confirm' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-lg mx-auto bg-white/5 border border-white/5 p-6 rounded-2xl space-y-6"
          >
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Review Registration Details</h3>
              <p className="text-xs text-slate-400">Please confirm all information is correct before submitting your entry.</p>
            </div>

            <div className="space-y-4 bg-slate-950/45 p-4 rounded-xl border border-white/5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400 font-medium">University:</span>
                <span className="text-white font-bold">{getUniDisplay()}</span>
              </div>
              
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400 font-medium">Team Name:</span>
                <span className="text-white font-bold">{teamName}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400 font-medium">Leader Name:</span>
                <span className="text-white font-bold">{leaderName}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block mb-1">Roster:</span>
                <div className="space-y-1.5">
                  {players.map((p, idx) => (
                    <div key={idx} className="flex justify-between py-1 bg-white/5 px-2 rounded">
                      <span className="font-semibold text-slate-200">
                        {p.fullName} {p.isLeader && <span className="text-[9px] text-[#22c55e] font-black">(Leader)</span>}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">{p.indexNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {submitError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs text-center font-medium">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStage('edit')}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#22c55e]/90 hover:to-[#16a34a]/90 text-slate-950 rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.25)]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Submit Entry
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-white/5 border border-white/5 p-6 rounded-3xl text-center space-y-5"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <BookmarkCheck className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-white">Registration Submitted!</h3>
              <p className="text-xs text-slate-400">Your team has been logged successfully and enters the queue.</p>
            </div>

            <div className="bg-slate-950/45 p-4 rounded-2xl border border-white/5 space-y-3.5 max-w-sm mx-auto text-left text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f59e0b] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Status: Pending Approval
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tournament administrators will review your credentials. Once approved, the team leader will receive an automated confirmation email containing match details, and your players will appear in the schedule and brackets draw.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setTeamName('');
                  setSelectedUniId('');
                  setLeaderName('');
                  setPlayers([{ fullName: '', indexNumber: '', isLeader: true }]);
                  setStage('edit');
                }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all"
              >
                Register Another Team
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Pending Queue Section under Team Registration */}
      {isAdmin && stage === 'edit' && (
        <div className="border-t border-white/10 pt-8 mt-12 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f5a623] animate-pulse"></span>
              Admin Queue: Pending Registrations
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Review and approve incoming university team entries before they enter the draw.</p>
          </div>

          {pendingRegs.length === 0 ? (
            <div className="glass-panel border-dashed border-white/10 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Roster queue is empty. No pending registrations.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRegs.map((reg) => {
                const team = reg.team;
                const uni = team?.university?.name || 'N/A';
                const roster = team?.players || [];

                return (
                  <div 
                    key={reg.id}
                    className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-white/5 pb-2">
                        <div>
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#f5a623]">
                            {uni}
                          </span>
                          <h4 className="font-bold text-white text-sm leading-tight mt-0.5">{team?.name}</h4>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReject(reg.id)}
                            disabled={processingId === reg.id}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 p-1.5 rounded-lg transition-all"
                            title="Reject Team"
                          >
                            {processingId === reg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleApprove(reg.id)}
                            disabled={processingId === reg.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 shadow-md"
                          >
                            {processingId === reg.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" /> Approve
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 mt-2 text-[10px] text-slate-300">
                        <p>Leader: <strong className="text-white">{team?.leader_name}</strong></p>
                      </div>

                      <div className="bg-slate-950/45 p-2.5 rounded-xl border border-white/5 space-y-1.5 mt-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">
                          ROSTER MEMBERS:
                        </span>
                        
                        <div className="space-y-1 text-[10px]">
                          {roster.map((player: any) => (
                            <div key={player.id} className="flex justify-between items-center py-0.5 border-b border-white/5 pb-0.5 last:border-b-0 last:pb-0">
                              <span className="font-semibold text-slate-200">
                                {player.full_name} {player.is_leader && <span className="text-[8px] text-[#22c55e] font-black">(Leader)</span>}
                              </span>
                              <span className="text-slate-500 font-mono text-[9px]">{player.index_number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

