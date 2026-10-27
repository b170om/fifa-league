# Floodlight League

פלאדלייט is a mobile-first scorebook for a friends' FIFA league that is played mostly as 2v2, for small stakes, with no draws. It is also a small, explainable rating project: every match stores a pre-match win probability, and a model page reports how often that call was right.

Anyone with the link can enter a result. There is no login and no PIN. Mistakes are fixed by editing or soft-deleting a match; both are written to an audit log, and ratings are replayed from scratch afterwards.

## How a night works

1. Pick 4, 5, or 6 players and a stake. The default is ₪25 per player per game, and it can be changed for the night or for one game.
2. The app suggests a pairing. **Winner stays** keeps the winning pair and rotates the bench. **Fair** sits whoever has sat least. **Pairs** locks strongest-with-weakest pairs (4 or 6 players only). One game can also be shuffled or balanced by rating.
3. Enter the score. Equal scores are rejected: ties go to a golden goal, so every match has a winner.
4. Each winner nets `+stake` and each loser nets `−stake`. It is not a split pot.
5. Close the night. The summary has the results, that night's profit and loss, an MVP, the biggest upset (a winner the model gave under 50%), the minimum set of transfers that settles the table, and a short Hebrew recap. The card exports as a PNG for WhatsApp.

## Stack

- Next.js 16 (App Router) and React 19
- Tailwind CSS 4
- TypeScript
- Supabase Postgres for storage, with Row Level Security
- Vercel AI SDK through Vercel AI Gateway for the night recap
- Vitest for the rating, money, and rotation logic

The UI is Hebrew and right-to-left. Dates use `Asia/Jerusalem`.

## Architecture

Reads and writes go through Next.js route handlers. The browser never holds the service-role key.

| Path | Role |
| --- | --- |
| `GET /api/bootstrap` | One payload for the whole UI: players, matches, sessions, settings, audit |
| `/api/sessions`, `/api/matches`, `/api/players`, `/api/settings` | Validated writes |
| `POST /api/sessions/:id/close` | Builds the night facts, asks for a recap, closes the night |
| `src/lib/elo.ts` | The same formula as the database, used for the pre-match preview and the evaluation metrics |
| `public.recompute_league()` | Source of truth for stored Elo, the stored prediction, and shekel P&L |

`recompute_league()` is `security invoker`, locked to `search_path = public`, and executable only by `service_role`. After every write that can change a result, the API calls it. Replay order is `played_at`, then `created_at`, then `id`. Editing an old match therefore recomputes every later rating and every later prediction. That is path-dependent on purpose, and the model page says so.

If the AI Gateway is unavailable, closing a night still works. The recap falls back to a template built from that night's facts (`ai_recap_source = fallback`).

### Data model

`supabase/migrations/20261026120000_v2_sessions_money.sql` is idempotent. On a fresh database it creates the v1 `players` and `matches` tables and then upgrades them. On the existing project it only adds what is missing.

- `players` — name, `elo`, `archived_at`. Active names are unique case-insensitively. A player who already has matches cannot be hard-deleted; they are archived, so history keeps a real foreign key.
- `sessions` — a FIFA night: title, stake, rotation (`winner_stays`, `fair`, `pairs`), status (`live` or `closed`), locked pairs, recap text and source.
- `session_players` — who was invited.
- `matches` — the v1 score columns and team uuid arrays, plus `session_id`, `stake`, `pred_a`, `model_version`, `deleted_at`.
- `match_players` — one row per participant: side, Elo before and after, and P&L. This is the relational record. The uuid arrays stay so a replay can rebuild `match_players`.
- `league_settings` — singleton: default stake (25), currency (`ILS`), Elo K (32), starting Elo (1500).
- `audit_log` — Hebrew summary plus before/after JSON for edits, soft deletes, and restores.

Anon and authenticated roles can `select`. Insert, update, and delete are revoked from them. The app writes with `SUPABASE_SERVICE_ROLE_KEY`.

A `matches_guard` trigger rejects a new draw, a non-positive stake, a duplicated player, a team that is not 1 or 2 people, and a player id that does not exist. The no-draw check constraint is added only when the existing table has no equal scores, so a leftover v1 draw does not block the migration. Replay skips draws either way.

## Money

Stakes are integer shekels. A match with four players and a stake of 25 moves `+25, +25, −25, −25`. The books of a match sum to zero, and so does a night.

Settle-up uses a greedy minimum-transfer pass: the largest debt pays the largest credit, then the lists are updated. The same view exists for one night and for the whole league. "Paid" is not tracked yet; the screen is a suggestion, not a ledger of completed transfers.

## Rating model

Model version: `elo-avg-v1`.

Each player starts at 1500. A team's strength is the average of its two ratings. The pre-match probability that team A wins is

```
P(A) = 1 / (1 + 10 ^ ((Rb − Ra) / 400))
```

After the match every player on a side moves by the same amount:

```
delta = K × (actual − expected)
```

`actual` is 1 for a win and 0 for a loss. Default `K` is 32. Two even sides (1500 vs 1500) are a 50% call, and a win moves each winner to 1516 and each loser to 1484. Ratings are stored to 4 decimal places and `pred_a` to 5.

The prediction is stored on the match at replay time. It is not recomputed from the players' current ratings when you look at an old game.

### Evaluation

The model page is computed in the client from stored predictions, with the same definitions as `src/lib/elo.ts`.

- **Hit rate.** Share of matches where the side given more than 50% actually won. Exact 50/50 calls are labeled חצי-חצי and are excluded from the hit rate, because there was no favorite.
- **Brier score.** Mean squared error of `pred_a` against the outcome (1 if A won, 0 otherwise). A coin flip scores 0.250. Lower is better.
- **Brier skill.** `1 − Brier / 0.25`. Zero matches a coin, one is perfect, negative is worse than a coin.
- **Calibration.** Five bins of predicted P(A), each compared with how often A actually won.

A handful of nights will not produce a stable hit rate. The page says the sample is noisy, and the model is a scoreboard aid, not a betting system.

Individual stats (wins, win %, goals, form, streaks, best and worst partner, the pair table, and head-to-head) are derived from 2v2 games, not only from 1v1. Goals are the team score while that player was on the pitch. The table page says so. Head-to-head counts opponents, and a separate strip counts games played as partners.

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev
```

```bash
npm test          # rating, settle-up, rotation, night summary, validation
npm run verify:sql  # applies the migration twice, on a fresh DB and on a v1-shaped DB
npm run lint
npm run build
```

`verify:sql` expects local Postgres with a `postgres` superuser via `sudo -u postgres psql`. It creates scratch databases `floodlight_v2` and `floodlight_v1` and drops them only at the start of a run.

## Environment

| Variable | Required | Where |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | browser and server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | browser reads; public select only after the migration |
| `SUPABASE_SERVICE_ROLE_KEY` | yes, for writes | server only. Never prefix with `NEXT_PUBLIC` |
| `AI_GATEWAY_API_KEY` | no | local recaps. On Vercel, AI Gateway uses OIDC and this can stay empty |
| `AI_GATEWAY_MODEL` | no | defaults to `google/gemini-3.5-flash`. Use an id from `https://ai-gateway.vercel.sh/v1/models` |

## Deploying the migration

Apply `supabase/migrations/20261026120000_v2_sessions_money.sql` in the Supabase SQL editor **together with** the v2 deploy, and set `SUPABASE_SERVICE_ROLE_KEY` on Vercel at the same time.

The migration drops the old public write policies. The currently deployed app writes with the anon key, so applying the SQL before v2 is live will stop that app from saving results. Existing `players` and `matches` rows are kept. There is nothing to import; a league with no matches simply starts at 1500.

Order that works:

1. Set `SUPABASE_SERVICE_ROLE_KEY` (and the two existing public vars) on the Vercel project.
2. Deploy this branch.
3. Run the migration in the SQL editor.

Re-running the file is safe.

## Later

Not in this version, on purpose:

- a PIN or login
- individual goal scorers
- push notifications
- more than one league
- marking a settle-up transfer as paid
- CSV import or export
