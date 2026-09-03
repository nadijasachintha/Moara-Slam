export interface University {
  id: string;
  name: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  university_id: string;
  leader_name: string;
  leader_email: string;
  created_at: string;
  university?: University;
  players?: Player[];
  registrations?: Registration;
}

export interface Player {
  id: string;
  team_id: string;
  full_name: string;
  index_number: string;
  is_leader: boolean;
  created_at: string;
  team?: Team;
}

export interface Registration {
  id: string;
  team_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  team?: Team;
}

export interface Match {
  id: string;
  match_type: 'single' | 'double';
  player_a_id: string | null;
  player_a2_id: string | null;
  player_b_id: string | null;
  player_b2_id: string | null;
  winner_id: string | null;
  table_number: number;
  scheduled_time: string;
  status: 'scheduled' | 'live' | 'finished';
  score_a: number;
  score_b: number;
  current_frame: number;
  
  // Local Timer State fields
  match_start_time: string | null;
  total_duration_minutes: number;
  paused_at_timestamp: string | null;
  pause_duration_seconds: number;
  is_paused: boolean;
  
  // Tournament structure (Single Elimination)
  round: string; // 'round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'finals'
  stage_index: number; // e.g. 1, 2, 3, etc.
  next_match_id: string | null;
  next_match_player_slot: 'A' | 'B' | null;
  
  created_at: string;
  
  // Joined relation fields for UI
  player_a?: Player;
  player_a2?: Player;
  player_b?: Player;
  player_b2?: Player;
  winner?: Player;
}

export interface TournamentSettings {
  id: string;
  start_time: string; // "HH:MM:SS"
  tables_count: number;
  break_duration_minutes: number;
  match_duration_minutes: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_email: string;
  action: string;
  details: any;
  created_at: string;
}
