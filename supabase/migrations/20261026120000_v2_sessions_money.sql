-- Floodlight League v2
-- Idempotent. Safe to re-run on the existing players / matches tables.
-- Apply in the Supabase SQL editor, or with the Supabase CLI:
--   supabase db query --linked -f supabase/migrations/20261026120000_v2_sessions_money.sql
--
-- What changes:
--   * sessions (a FIFA night) and who was invited
--   * per-match stake, stored win probability, soft delete
--   * match_players: one row per participant, with a real foreign key,
--     Elo before/after, and shekel P&L
--   * league_settings (default stake, Elo K)
--   * audit_log for edits, deletes, and restores
--   * anon can read. Writes are revoked from anon/authenticated.
--     The app writes with the service role, which bypasses RLS.
--   * recompute_league() replays every live match in order and is the
--     source of truth for Elo, predictions, and P&L.

-- ---------------------------------------------------------------------------
-- Roles (already exist on Supabase; created here so a local Postgres
-- can apply the same grants)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Base tables from v1, created only when this is a fresh database.
-- ---------------------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz not null default now(),
  mode text not null check (mode in ('1v1', '2v2')),
  team_a_player_ids uuid[] not null,
  team_b_player_ids uuid[] not null,
  score_a integer not null check (score_a >= 0),
  score_b integer not null check (score_b >= 0)
);

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------
alter table players add column if not exists archived_at timestamptz;
alter table players add column if not exists elo numeric(12, 4) not null default 1500;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'players_name_len')
     and not exists (
       select 1 from players
       where char_length(btrim(name)) < 1 or char_length(btrim(name)) > 40
     ) then
    alter table players
      add constraint players_name_len check (char_length(btrim(name)) between 1 and 40);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'players_active_name_unique')
     and not exists (
       select lower(btrim(name))
       from players
       where archived_at is null
       group by 1
       having count(*) > 1
     ) then
    create unique index players_active_name_unique
      on players (lower(btrim(name)))
      where archived_at is null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Settings (one row)
-- ---------------------------------------------------------------------------
create table if not exists league_settings (
  id integer primary key default 1 check (id = 1),
  default_stake integer not null default 25 check (default_stake > 0 and default_stake <= 10000),
  currency text not null default 'ILS',
  elo_k integer not null default 32 check (elo_k between 1 and 128),
  elo_start integer not null default 1500 check (elo_start between 100 and 3000),
  updated_at timestamptz not null default now()
);

insert into league_settings (id, default_stake)
values (1, 25)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Sessions (one FIFA night / afternoon)
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  stake integer not null check (stake > 0 and stake <= 10000),
  rotation text not null default 'winner_stays'
    check (rotation in ('winner_stays', 'fair', 'pairs')),
  status text not null default 'live' check (status in ('live', 'closed')),
  locked_pairs jsonb,
  ai_recap text,
  ai_recap_source text check (ai_recap_source in ('model', 'fallback')),
  ai_model text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists session_players (
  session_id uuid not null references sessions (id) on delete cascade,
  player_id uuid not null references players (id) on delete restrict,
  primary key (session_id, player_id)
);

-- ---------------------------------------------------------------------------
-- Matches: stake, prediction, soft delete, optional session
-- team_*_player_ids stay as the roster the replay reads.
-- match_players is the relational copy (foreign keys, Elo, P&L).
-- ---------------------------------------------------------------------------
alter table matches add column if not exists created_at timestamptz not null default now();
alter table matches add column if not exists session_id uuid;
alter table matches add column if not exists stake integer;
alter table matches add column if not exists pred_a numeric(8, 5);
alter table matches add column if not exists model_version text;
alter table matches add column if not exists deleted_at timestamptz;

update matches set stake = 25 where stake is null;

alter table matches alter column stake set default 25;
alter table matches alter column stake set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_stake_positive') then
    alter table matches
      add constraint matches_stake_positive check (stake > 0 and stake <= 10000);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_session_id_fkey') then
    alter table matches
      add constraint matches_session_id_fkey
      foreign key (session_id) references sessions (id) on delete restrict;
  end if;
end $$;

-- Only add the no-draw constraint when existing rows already satisfy it.
-- New draws are rejected either way by matches_guard().
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_no_draw')
     and not exists (select 1 from matches where score_a = score_b) then
    alter table matches
      add constraint matches_no_draw check (score_a <> score_b);
  end if;
end $$;

create table if not exists match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  player_id uuid not null references players (id) on delete restrict,
  side text not null check (side in ('a', 'b')),
  elo_before numeric(12, 4) not null,
  elo_after numeric(12, 4) not null,
  pnl integer not null,
  unique (match_id, player_id)
);

create index if not exists match_players_player_idx on match_players (player_id);
create index if not exists matches_session_idx on matches (session_id);
create index if not exists matches_active_played_idx on matches (played_at desc) where deleted_at is null;
create index if not exists sessions_live_idx on sessions (started_at desc) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
create or replace function public.matches_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  n_a integer;
  n_b integer;
  distinct_n integer;
  found_n integer;
begin
  n_a := cardinality(new.team_a_player_ids);
  n_b := cardinality(new.team_b_player_ids);

  if n_a not in (1, 2) or n_b not in (1, 2) then
    raise exception 'בכל קבוצה צריך שחקן אחד או שניים';
  end if;

  if new.score_a = new.score_b then
    raise exception 'אין תיקו. ממשיכים לשער זהב';
  end if;

  if new.stake is null or new.stake <= 0 or new.stake > 10000 then
    raise exception 'ההימור חייב להיות סכום חיובי';
  end if;

  select count(distinct x) into distinct_n
  from unnest(new.team_a_player_ids || new.team_b_player_ids) as x;

  if distinct_n <> n_a + n_b then
    raise exception 'אי אפשר לשים את אותו שחקן פעמיים';
  end if;

  select count(*) into found_n
  from players
  where id = any (new.team_a_player_ids || new.team_b_player_ids);

  if found_n <> n_a + n_b then
    raise exception 'שחקן לא קיים בקבוצה';
  end if;

  return new;
end;
$$;

drop trigger if exists matches_guard on matches;
create trigger matches_guard
before insert or update of team_a_player_ids, team_b_player_ids, score_a, score_b, stake
on matches
for each row
execute function public.matches_guard();

-- ---------------------------------------------------------------------------
-- Rating replay.
-- Team strength = average Elo of the players on that side.
-- P(A wins) = 1 / (1 + 10 ^ ((Rb - Ra) / 400))
-- Each player on a side moves by K * (result - expected), K from settings.
-- Result is 1 for a win and 0 for a loss. Draws are skipped.
-- P&L is +stake for each winner and -stake for each loser.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_league()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  m record;
  pid uuid;
  k numeric;
  start_elo numeric;
  ra numeric;
  rb numeric;
  exp_a numeric;
  actual_a numeric;
  delta_a numeric;
  before_elo numeric;
  after_elo numeric;
  n_a integer;
  n_b integer;
  distinct_n integer;
  found_n integer;
  stake integer;
begin
  select s.elo_k::numeric, s.elo_start::numeric
    into k, start_elo
  from league_settings s
  where s.id = 1;

  if k is null then
    k := 32;
    start_elo := 1500;
  end if;

  update players set elo = start_elo;
  delete from match_players;

  for m in
    select *
    from matches
    where deleted_at is null
    order by played_at asc, created_at asc, id asc
  loop
    if m.score_a = m.score_b then
      continue;
    end if;

    n_a := cardinality(m.team_a_player_ids);
    n_b := cardinality(m.team_b_player_ids);
    if n_a is null or n_b is null or n_a < 1 or n_b < 1 then
      continue;
    end if;

    select count(distinct x) into distinct_n
    from unnest(m.team_a_player_ids || m.team_b_player_ids) as x;
    if distinct_n <> n_a + n_b then
      continue;
    end if;

    select count(*) into found_n
    from players p
    where p.id = any (m.team_a_player_ids || m.team_b_player_ids);
    if found_n <> n_a + n_b then
      continue;
    end if;

    select avg(p.elo) into ra from players p where p.id = any (m.team_a_player_ids);
    select avg(p.elo) into rb from players p where p.id = any (m.team_b_player_ids);

    exp_a := 1 / (1 + power(10::numeric, (rb - ra) / 400));
    actual_a := case when m.score_a > m.score_b then 1 else 0 end;
    delta_a := k * (actual_a - exp_a);
    stake := coalesce(m.stake, 25);

    update matches
      set pred_a = round(exp_a, 5),
          model_version = 'elo-avg-v1'
      where id = m.id;

    foreach pid in array m.team_a_player_ids
    loop
      select p.elo into before_elo from players p where p.id = pid;
      after_elo := round(before_elo + delta_a, 4);
      update players set elo = after_elo where id = pid;
      insert into match_players (match_id, player_id, side, elo_before, elo_after, pnl)
      values (
        m.id,
        pid,
        'a',
        before_elo,
        after_elo,
        case when actual_a = 1 then stake else -stake end
      );
    end loop;

    foreach pid in array m.team_b_player_ids
    loop
      select p.elo into before_elo from players p where p.id = pid;
      after_elo := round(before_elo - delta_a, 4);
      update players set elo = after_elo where id = pid;
      insert into match_players (match_id, player_id, side, elo_before, elo_after, pnl)
      values (
        m.id,
        pid,
        'b',
        before_elo,
        after_elo,
        case when actual_a = 1 then -stake else stake end
      );
    end loop;
  end loop;
end;
$$;

comment on function public.recompute_league() is
  'Replay live matches in chronological order. Rewrites player Elo, match pred_a, and match_players (Elo path and shekel P&L).';

revoke all on function public.recompute_league() from public;
revoke all on function public.matches_guard() from public;
grant execute on function public.recompute_league() to service_role;

-- ---------------------------------------------------------------------------
-- RLS: public read, no public write
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'players', 'matches', 'sessions', 'session_players',
        'match_players', 'league_settings', 'audit_log'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table players enable row level security;
alter table matches enable row level security;
alter table sessions enable row level security;
alter table session_players enable row level security;
alter table match_players enable row level security;
alter table league_settings enable row level security;
alter table audit_log enable row level security;

create policy public_read_players on players for select to anon, authenticated using (true);
create policy public_read_matches on matches for select to anon, authenticated using (true);
create policy public_read_sessions on sessions for select to anon, authenticated using (true);
create policy public_read_session_players on session_players for select to anon, authenticated using (true);
create policy public_read_match_players on match_players for select to anon, authenticated using (true);
create policy public_read_league_settings on league_settings for select to anon, authenticated using (true);
create policy public_read_audit_log on audit_log for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated, service_role;

revoke insert, update, delete, truncate on
  players, matches, sessions, session_players, match_players, league_settings, audit_log
  from anon, authenticated;

grant select on
  players, matches, sessions, session_players, match_players, league_settings, audit_log
  to anon, authenticated;

grant select, insert, update, delete on
  players, matches, sessions, session_players, match_players, league_settings, audit_log
  to service_role;

-- Bring any matches that already exist onto the new rating book.
select public.recompute_league();
