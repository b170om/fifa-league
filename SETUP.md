# FIFA League — Setup Guide

## 1. Supabase

1. Go to https://supabase.com and create a new project (free tier works).
2. Once created, go to **SQL Editor** and paste the contents of `supabase/schema.sql`, then run it.
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon / public` key

## 2. Local development

```bash
# Clone the repo
git clone <your-repo-url>
cd fifa-league

# Install dependencies
npm install

# Create env file
cp .env.example .env.local
# Edit .env.local and paste your Supabase URL and anon key

# Run dev server
npm run dev
```

Open http://localhost:3000

## 3. Deploy to Vercel via GitHub

1. Push this repo to GitHub (new repository).
2. Go to https://vercel.com → **New Project** → import from GitHub.
3. Select the `fifa-league` repo.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**. Done — Vercel auto-deploys on every push to `main`.

## 4. Share with friends

Everyone just visits the Vercel URL. No login needed — all data is shared via Supabase in real-time.

## Updating data
All stats (singles table, pairs table, H2H) are computed live from the `matches` table. Editing or deleting a match immediately updates all stats on next page load.
