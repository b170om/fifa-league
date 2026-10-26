import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import pg from 'pg'

const sql = readFileSync(new URL('../supabase/migrations/20261026120000_v2_sessions_money.sql', import.meta.url), 'utf8')

execSync(`sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DO \\$\\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ubuntu') THEN CREATE ROLE ubuntu SUPERUSER LOGIN; END IF; END \\$\\$;"`)
execSync(`sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'floodlight_v2' AND pid <> pg_backend_pid();" || true`)
execSync(`sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS floodlight_v2;"`)
execSync(`sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE floodlight_v2 OWNER ubuntu;"`)

const client = new pg.Client({ host: '/var/run/postgresql', database: 'floodlight_v2', user: 'ubuntu' })
await client.connect()

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

await client.query(sql)
await client.query(sql)

const ids = {}
for (const name of ['Yuval', 'Ofir', 'Dani', 'Noam']) {
  const { rows } = await client.query('insert into players (name) values ($1) returning id', [name])
  ids[name] = rows[0].id
}

const session = await client.query(
  `insert into sessions (title, stake, rotation, status) values ('night', 25, 'winner_stays', 'live') returning id`,
)
const sessionId = session.rows[0].id
for (const id of Object.values(ids)) {
  await client.query('insert into session_players (session_id, player_id) values ($1, $2)', [sessionId, id])
}

await client.query(
  `insert into matches (mode, session_id, team_a_player_ids, team_b_player_ids, score_a, score_b, stake)
   values ('2v2', $1, $2, $3, 2, 0, 25)`,
  [sessionId, [ids.Yuval, ids.Ofir], [ids.Dani, ids.Noam]],
)
await client.query('select public.recompute_league()')

const after = await client.query('select name, elo from players order by name')
const elo = Object.fromEntries(after.rows.map((row) => [row.name, Number(row.elo)]))
assert(elo.Yuval === 1516, `Yuval elo ${elo.Yuval}`)
assert(elo.Ofir === 1516, `Ofir elo ${elo.Ofir}`)
assert(elo.Dani === 1484, `Dani elo ${elo.Dani}`)
assert(elo.Noam === 1484, `Noam elo ${elo.Noam}`)

const parts = await client.query(
  `select p.name, mp.side, mp.pnl, mp.elo_before, mp.elo_after
   from match_players mp join players p on p.id = mp.player_id order by p.name`,
)
assert(parts.rows.length === 4, 'four participants')
assert(parts.rows.reduce((sum, row) => sum + Number(row.pnl), 0) === 0, 'pnl is zero-sum')
assert(parts.rows.find((row) => row.name === 'Yuval').pnl === 25, 'winner pnl')
assert(parts.rows.find((row) => row.name === 'Dani').pnl === -25, 'loser pnl')

const pred = await client.query('select pred_a, model_version from matches')
assert(Number(pred.rows[0].pred_a) === 0.5, `opening pred ${pred.rows[0].pred_a}`)
assert(pred.rows[0].model_version === 'elo-avg-v1', 'model version')

await client.query(
  `insert into matches (mode, session_id, team_a_player_ids, team_b_player_ids, score_a, score_b, stake, played_at)
   values ('2v2', $1, $2, $3, 1, 3, 40, now() + interval '1 minute')`,
  [sessionId, [ids.Dani, ids.Noam], [ids.Yuval, ids.Ofir]],
)
await client.query('select public.recompute_league()')
const second = await client.query(
  `select pred_a from matches order by played_at asc, created_at asc`,
)
assert(Number(second.rows[1].pred_a) < 0.5, 'underdogs were not the favorite')
const pnl = await client.query('select coalesce(sum(pnl), 0)::int as total from match_players')
assert(pnl.rows[0].total === 0, 'books balance after two matches')

let drew = false
try {
  await client.query(
    `insert into matches (mode, team_a_player_ids, team_b_player_ids, score_a, score_b, stake)
     values ('2v2', $1, $2, 1, 1, 25)`,
    [[ids.Yuval, ids.Ofir], [ids.Dani, ids.Noam]],
  )
} catch (error) {
  drew = /שער זהב/.test(error.message)
}
assert(drew, 'draws are rejected')

let blocked = false
try {
  await client.query('delete from players where id = $1', [ids.Yuval])
} catch (error) {
  blocked = error.code === '23503'
}
assert(blocked, 'player delete is blocked by foreign key')

await client.query('begin')
await client.query('set local role anon')
let anonBlocked = false
try {
  await client.query(`insert into players (name) values ('sneaky')`)
} catch {
  anonBlocked = true
}
await client.query('rollback')
assert(anonBlocked, 'anon cannot insert')

const before = await client.query('select name, elo::text from players order by name')
await client.query('select public.recompute_league()')
const again = await client.query('select name, elo::text from players order by name')
assert(JSON.stringify(before.rows) === JSON.stringify(again.rows), 'recompute is idempotent')

await client.end()

execSync(`sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS floodlight_v1;"`)
execSync(`sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE floodlight_v1 OWNER ubuntu;"`)
const legacy = new pg.Client({ host: '/var/run/postgresql', database: 'floodlight_v1', user: 'ubuntu' })
await legacy.connect()
await legacy.query(`
  create table players (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
  create table matches (
    id uuid primary key default gen_random_uuid(),
    played_at timestamptz not null default now(),
    mode text not null check (mode in ('1v1','2v2')),
    team_a_player_ids uuid[] not null,
    team_b_player_ids uuid[] not null,
    score_a integer not null check (score_a >= 0),
    score_b integer not null check (score_b >= 0)
  );
  alter table players enable row level security;
  alter table matches enable row level security;
  create policy "public read players" on players for select using (true);
  create policy "public insert players" on players for insert with check (true);
  create policy "public delete matches" on matches for delete using (true);
`)
const a = await legacy.query(`insert into players (name) values ('A') returning id`)
const b = await legacy.query(`insert into players (name) values ('B') returning id`)
const c = await legacy.query(`insert into players (name) values ('C') returning id`)
const d = await legacy.query(`insert into players (name) values ('D') returning id`)
await legacy.query(
  `insert into matches (mode, team_a_player_ids, team_b_player_ids, score_a, score_b)
   values ('2v2', $1, $2, 1, 1)`,
  [[a.rows[0].id, b.rows[0].id], [c.rows[0].id, d.rows[0].id]],
)
await legacy.query(
  `insert into matches (mode, team_a_player_ids, team_b_player_ids, score_a, score_b, played_at)
   values ('2v2', $1, $2, 3, 1, now() + interval '1 minute')`,
  [[a.rows[0].id, b.rows[0].id], [c.rows[0].id, d.rows[0].id]],
)
await legacy.query(sql)
const constraint = await legacy.query(`select 1 from pg_constraint where conname = 'matches_no_draw'`)
assert(constraint.rowCount === 0, 'existing draw blocks the hard constraint, trigger still guards new rows')
const replayed = await legacy.query(`select count(*)::int as n from match_players`)
assert(replayed.rows[0].n === 4, 'only the decisive legacy match was replayed')
const policies = await legacy.query(`select policyname from pg_policies where tablename = 'players'`)
assert(policies.rows.length === 1 && policies.rows[0].policyname === 'public_read_players', 'old write policies are gone')
await legacy.end()
console.log('sql migration ok')
