-- Run this in the Supabase SQL Editor

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz not null default now(),
  mode text not null check (mode in ('1v1','2v2')),
  team_a_player_ids uuid[] not null,
  team_b_player_ids uuid[] not null,
  score_a integer not null check (score_a >= 0),
  score_b integer not null check (score_b >= 0)
);

-- Enable Row Level Security (allow all for anon since there's no auth)
alter table players enable row level security;
alter table matches enable row level security;

create policy "public read players" on players for select using (true);
create policy "public insert players" on players for insert with check (true);
create policy "public update players" on players for update using (true);
create policy "public delete players" on players for delete using (true);

create policy "public read matches" on matches for select using (true);
create policy "public insert matches" on matches for insert with check (true);
create policy "public update matches" on matches for update using (true);
create policy "public delete matches" on matches for delete using (true);
