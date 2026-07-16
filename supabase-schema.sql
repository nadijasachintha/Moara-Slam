-- Supabase Database Schema for University Carrom Tournament Management System

-- 1. UNIVERSITIES TABLE
create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TEAMS TABLE
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  university_id uuid references public.universities(id) on delete cascade not null,
  leader_name text not null,
  leader_email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. PLAYERS TABLE
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  full_name text not null,
  index_number text not null,
  is_leader boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. REGISTRATIONS TABLE
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade unique not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. MATCHES TABLE
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid references public.players(id) on delete set null,
  player_b_id uuid references public.players(id) on delete set null,
  winner_id uuid references public.players(id) on delete set null,
  table_number integer not null,
  scheduled_time timestamp with time zone not null,
  status text check (status in ('scheduled', 'live', 'finished')) default 'scheduled' not null,
  score_a integer default 0 not null,
  score_b integer default 0 not null,
  current_frame integer default 1 not null,
  
  -- Local Timer State
  match_start_time timestamp with time zone,
  total_duration_minutes integer default 45 not null,
  paused_at_timestamp timestamp with time zone,
  pause_duration_seconds integer default 0 not null,
  is_paused boolean default false not null,
  
  -- Tournament Bracket structure (Single Elimination)
  round text not null, -- 'round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'finals'
  stage_index integer not null, -- 1 for Round 1, 2 for Round 2, etc.
  next_match_id uuid references public.matches(id) on delete set null,
  next_match_player_slot text check (next_match_player_slot in ('A', 'B')),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. TOURNAMENT SETTINGS TABLE
create table if not exists public.tournament_settings (
  id uuid primary key default gen_random_uuid(),
  start_time time not null default '09:00:00',
  tables_count integer not null default 10,
  break_duration_minutes integer not null default 10,
  match_duration_minutes integer not null default 45,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. AUDIT LOGS TABLE
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. ADMINS TABLE
-- Links directly to Supabase Auth users
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ====================================================
-- SEED DATA
-- ====================================================
-- Insert default settings row if not exists
insert into public.tournament_settings (start_time, tables_count, break_duration_minutes, match_duration_minutes)
values ('09:00:00', 10, 10, 45)
on conflict do nothing;

-- Pre-seed some default universities
insert into public.universities (name) values
  ('Stanford University'),
  ('MIT'),
  ('Harvard University'),
  ('UC Berkeley'),
  ('Oxford University'),
  ('Cambridge University')
on conflict do nothing;


-- ====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================

-- Enable RLS
alter table public.universities enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.registrations enable row level security;
alter table public.matches enable row level security;
alter table public.tournament_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admins enable row level security;

-- Create helper function to check if the current user is an admin
create or replace function public.is_admin()
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.admins where id = auth.uid()
  );
end;
$$ language plpgsql;

-- 1. Universities Policies
create policy "Allow public read on universities" on public.universities
  for select using (true);
create policy "Allow admin write on universities" on public.universities
  for all using (public.is_admin());

-- 2. Teams Policies
create policy "Allow public read on teams" on public.teams
  for select using (true);
create policy "Allow public insert on teams" on public.teams
  for insert with check (true);
create policy "Allow admin write on teams" on public.teams
  for all using (public.is_admin());

-- 3. Players Policies
create policy "Allow public read on players" on public.players
  for select using (true);
create policy "Allow public insert on players" on public.players
  for insert with check (true);
create policy "Allow admin write on players" on public.players
  for all using (public.is_admin());

-- 4. Registrations Policies
create policy "Allow public read on registrations" on public.registrations
  for select using (true);
create policy "Allow public insert on registrations" on public.registrations
  for insert with check (true);
create policy "Allow admin write on registrations" on public.registrations
  for all using (public.is_admin());

-- 5. Matches Policies
create policy "Allow public read on matches" on public.matches
  for select using (true);
create policy "Allow admin write on matches" on public.matches
  for all using (public.is_admin());

-- 6. Tournament Settings Policies
create policy "Allow public read on tournament_settings" on public.tournament_settings
  for select using (true);
create policy "Allow admin write on tournament_settings" on public.tournament_settings
  for all using (public.is_admin());

-- 7. Audit Logs Policies
create policy "Allow admin read on audit_logs" on public.audit_logs
  for select using (public.is_admin());
create policy "Allow admin insert on audit_logs" on public.audit_logs
  for insert with check (public.is_admin());

-- 8. Admins Policies
create policy "Allow admin read on admins" on public.admins
  for select using (public.is_admin());
create policy "Allow admin insert/delete on admins" on public.admins
  for all using (public.is_admin());


-- ====================================================
-- REALTIME ENABLEMENT
-- ====================================================
-- Add tables to the Supabase Realtime publication
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.registrations;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
