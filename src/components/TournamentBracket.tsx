import React, { useMemo } from 'react';
import { Match } from '@/types/database.types';
import { Trophy } from 'lucide-react';

interface TournamentBracketProps {
  matches: Match[];
}

export default function TournamentBracket({ matches }: TournamentBracketProps) {
  // Group matches by stage_index
  const rounds = useMemo(() => {
    const map = new Map<number, Match[]>();
    matches.forEach(m => {
      // Handle legacy matches without stage_index by defaulting to 0 or sorting them later if needed.
      // But our generator always sets stage_index.
      const idx = m.stage_index ?? 0;
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx)!.push(m);
    });
    
    // Sort keys descending so highest stage_index (first round) is on the left, finals on the right.
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b - a);
    return sortedKeys.map(k => map.get(k)!);
  }, [matches]);

  if (matches.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto overflow-y-auto bg-gradient-to-br from-[#060a13] to-[#0c1f0f] border border-[#22c55e]/10 rounded-3xl p-8 shadow-2xl custom-scrollbar mb-10 max-h-[75vh]">
      <div className="flex items-stretch gap-14 min-w-max">
        {rounds.map((roundMatches, roundIdx) => (
          <div key={roundIdx} className="flex flex-col justify-around gap-6 min-w-[260px] relative">
            {roundMatches.map(match => (
              <div 
                key={match.id} 
                className={`relative bg-[#081216] border ${
                  match.status === 'finished' ? 'border-[#22c55e]/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-white/5'
                } rounded-2xl p-3.5 z-10 transition-all duration-300 hover:border-[#22c55e]/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]`}
              >
                {/* Round Label */}
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">
                    {match.round.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {match.status === 'finished' ? 'Completed' : 'Pending'}
                  </span>
                </div>
                
                {/* Player A */}
                <div className={`flex items-center justify-between p-2 rounded-xl mb-1.5 transition-colors ${
                  match.winner_id === match.player_a_id 
                    ? 'bg-gradient-to-r from-[#22c55e]/20 to-transparent border-l-2 border-[#22c55e]' 
                    : 'bg-white/5 border-l-2 border-transparent'
                }`}>
                   <div className="flex flex-col overflow-hidden mr-2">
                     <span className={`text-xs font-extrabold truncate flex items-center gap-1 ${
                       match.winner_id === match.player_a_id ? 'text-[#22c55e]' : 'text-slate-200'
                     }`}>
                       {match.player_a?.full_name || 'TBD'}
                       {match.winner_id === match.player_a_id && <Trophy className="w-3 h-3 text-[#22c55e]" />}
                     </span>
                     <span className="text-[9px] text-slate-500 truncate uppercase mt-0.5">
                       {match.player_a ? (match.player_a.team as any)?.university?.name || 'N/A' : 'Waiting...'}
                     </span>
                   </div>
                   <span className={`text-sm font-black ${
                     match.winner_id === match.player_a_id ? 'text-[#22c55e]' : 'text-white'
                   }`}>
                     {match.score_a}
                   </span>
                </div>

                {/* Player B */}
                <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                  match.winner_id === match.player_b_id 
                    ? 'bg-gradient-to-r from-[#22c55e]/20 to-transparent border-l-2 border-[#22c55e]' 
                    : 'bg-white/5 border-l-2 border-transparent'
                }`}>
                   <div className="flex flex-col overflow-hidden mr-2">
                     <span className={`text-xs font-extrabold truncate flex items-center gap-1 ${
                       match.winner_id === match.player_b_id ? 'text-[#22c55e]' : 'text-slate-200'
                     }`}>
                       {match.player_b?.full_name || 'TBD'}
                       {match.winner_id === match.player_b_id && <Trophy className="w-3 h-3 text-[#22c55e]" />}
                     </span>
                     <span className="text-[9px] text-slate-500 truncate uppercase mt-0.5">
                       {match.player_b ? (match.player_b.team as any)?.university?.name || 'N/A' : 'Waiting...'}
                     </span>
                   </div>
                   <span className={`text-sm font-black ${
                     match.winner_id === match.player_b_id ? 'text-[#22c55e]' : 'text-white'
                   }`}>
                     {match.score_b}
                   </span>
                </div>

                {/* Connecting Line to next match (Flow indicator) */}
                {roundIdx < rounds.length - 1 && (
                  <div className="absolute top-1/2 -right-14 w-14 h-[2px] bg-gradient-to-r from-[#22c55e]/30 to-transparent z-0"></div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
