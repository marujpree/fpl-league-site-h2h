# Setup runbook — Sigma Chi FC dashboard

Copy-pasteable, in order. Assumes you already have GitHub, Vercel, and
Supabase accounts but haven't done anything project-specific yet. Anything
that needs a logged-in browser session is a step *you* run — nothing here
was pushed, deployed, or authenticated on your behalf.

Repo layout referenced below:

```
FPL SITE/                  <- repo root (this file lives here)
  app/                     <- the Next.js project (what Vercel builds)
  supabase/                <- schema.sql / seed.sql (pasted into Supabase's web UI, not run via CLI)
  SETUP.md                 <- this file
```

---

## 1. Supabase project + database

1. Go to [supabase.com](https://supabase.com), sign in, click **New
   project**. Pick any name (e.g. `sigma-chi-fc`), a strong database
   password (you won't need to remember it — Supabase stores it), and the
   region closest to your league.
2. Wait ~2 minutes for provisioning, then open **SQL Editor** (left
   sidebar) → **New query**.
3. Open `supabase/schema.sql` from this project in a text editor, copy the
   whole file, paste it into the SQL editor, click **Run**. This creates
   the 5 tables (`managers`, `gameweeks`, `h2h_matches`,
   `standings_snapshot`, `live_points_cache`).
4. New query again → open `supabase/seed.sql`, copy, paste, **Run**. This
   loads the real 10 Sigma Chi FC managers.
   - If either file doesn't exist yet in your checkout, another workstream
     is still adding it — wait for it, then come back to this step.
5. Go to **Project Settings** (gear icon, bottom left) → **API**. You need
   three values off this page:
   - **Project URL** — looks like `https://xxxxxxxx.supabase.co`
   - **Project API keys → `anon` `public`** — a long JWT-looking string
   - **Project API keys → `service_role`** — another JWT-looking string,
     labeled "secret". **Never share this one or put it in frontend code —
     it bypasses all database access rules.**
6. Back in your project, run:
   ```bash
   cd "app"
   cp .env.local.example .env.local
   ```
   Open `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<Project URL from step 5>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key from step 5>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from step 5>
   POLL_SECRET=<any random string — see step 4 below for how it's used>
   ```
   Generate a random string for `POLL_SECRET` with:
   ```bash
   openssl rand -hex 32
   ```
7. Sanity check locally (Node 20 active):
   ```bash
   export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use 20
   cd "app"
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000` — the site should load without Supabase
   connection errors in the terminal.

---

## 2. Push this project to GitHub

You need to run these yourself — this environment has no GitHub
credentials.

Note: `app/` already has its own git history from `create-next-app`
(one "Initial commit" commit). To keep the whole project — `app/`,
`supabase/`, this `SETUP.md`, the PRD — in a single repo, the cleanest path
is to fold that into one repo at the `FPL SITE` root rather than nesting
two git repos. That means dropping app/'s standalone git history (it's
just the create-next-app scaffold commit, nothing you'll miss).

```bash
# from inside "FPL SITE" (the folder containing app/ and supabase/)
rm -rf app/.git

git init
git add .
git commit -m "Initial commit: Sigma Chi FC dashboard"
git branch -M main

# Create an empty repo on github.com first (no README/gitignore/license —
# keep it empty so this push isn't rejected), then:
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

If you'd rather keep `app/`'s existing git history instead, that's fine
too — just push `app/` alone as its own repo (`cd app && git remote add
origin ... && git push -u origin main`) and skip the `supabase/` /
`SETUP.md` files being in version control; you already have local copies of
schema.sql/seed.sql, and by this point you don't need to touch them again.
Whichever you choose, remember which one you picked for step 3.

---

## 3. Import into Vercel and deploy

1. Go to [vercel.com](https://vercel.com), sign in, click **Add New… →
   Project**, and select the GitHub repo you just pushed. Authorize
   Vercel's GitHub App if prompted (one-time, in your browser).
2. **If you pushed the whole `FPL SITE` root** (the `rm -rf app/.git`
   path above): before deploying, expand **Root Directory** in the import
   screen and set it to `app` — that's where `package.json` lives. If you
   pushed `app/` alone as its own repo, skip this; the default root is
   already correct.
3. Framework preset should auto-detect as **Next.js**. Leave build/output
   settings on their defaults.
4. Expand **Environment Variables** and add the same four from your
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `POLL_SECRET` (use the same random value you generated in step 1, or a
     new one — just keep whatever you use here in sync with step 4 below)
5. Click **Deploy**. First build takes 1-2 minutes. When it finishes you'll
   land on a project dashboard with a **Visit** button — that's your live
   URL (see part 5).
6. Every future `git push` to `main` auto-redeploys. No further manual
   deploy steps needed.

---

## 4. Keep live gameweek scores fresh (the sub-daily polling workaround)

**The constraint:** Vercel's free Hobby plan only allows Cron Jobs to run
once per day at minimum — it flatly does not support the every-60-90-second
schedule this PRD wants for live gameweek tracking. `app/vercel.json`
already includes a **daily** cron hitting `/api/poll` as a bare-minimum
fallback (so the cache is never more than a day stale even if nothing else
pings it) — that daily cron is explicitly NOT the live-tracking mechanism,
just a safety net.

**The standard workaround** for this exact, well-known Vercel Hobby
limitation is a free external scheduler that pings your endpoint far more
often than Vercel's own cron allows. Two options, pick one:

### Option A — external pinger (cron-job.org), keeps data fresh 24/7

1. Go to [cron-job.org](https://cron-job.org), create a free account.
2. Create a new cron job:
   - **URL**: `https://<your-vercel-domain>/api/poll` (find your domain in
     part 5 below)
   - **Schedule**: every 1 minute (or 2, to be conservative)
   - **Request method**: GET
   - **Custom headers**: add `x-poll-secret: <your POLL_SECRET value>`
3. Save and enable it. It'll now hit `/api/poll` continuously — that route
   checks `current_event` from FPL's `/api/game` endpoint and only does
   real work when a gameweek is actually live, so pinging it when nothing's
   happening is cheap and harmless.
4. Your `/api/live` route (public, no secret needed) is what the frontend
   itself polls in the browser every 60-90s to show updating scores without
   a manual refresh — that's the actual PRD "auto-updating" UX. `/api/poll`
   only needs to run often enough to keep the data `/api/live` reads from
   being stale.

**Tradeoff of Option A**: data stays fresh even with zero visitors on the
site (e.g. you can check scores the moment a gameweek goes live, before
anyone's loaded the page). Costs nothing, takes 5 minutes to set up.

### Option B — client-side polling only, no external service

Skip cron-job.org entirely. `/api/live` gets polled by any browser that has
a live-gameweek page open, but nothing calls `/api/poll` to *refresh* the
cache except the once-a-day Vercel fallback — so scores only update once
some visitor's session (or a future manual trigger) causes a poll. This
project's frontend is designed so the first browser to load the live
gameweek page during an active GW can also kick off a poll, so in practice
data "wakes up" shortly after the first person checks the site each
gameweek, then stays reasonably fresh for as long as at least one person
keeps a tab open.

**Tradeoff of Option B**: zero setup, but data can be stale by up to a day
if literally nobody visits during a live gameweek, and the very first
visitor of a gameweek may see slightly stale numbers for a few seconds
until their own page load triggers a fresh poll.

For a 10-person league checking scores on Saturday afternoons, Option A
(cron-job.org) is worth the 5 minutes — it's the standard fix for this
Vercel Hobby limitation and means nobody has to be the one who "wakes up"
the data.

---

## 5. Finding your live Vercel URL

- On your Vercel project's dashboard (vercel.com → your project), the
  **Domains** section on the Overview tab lists it — usually
  `https://<project-name>.vercel.app` by default.
- The **Visit** button on any successful deployment opens it directly.
- Every push to `main` also gets its own preview-turned-production
  deployment; the stable link to bookmark and share with the league is the
  one under **Domains**, not a per-deployment preview URL (those look like
  `https://<project-name>-<random>.vercel.app` and can change).
- Optional: **Project Settings → Domains** lets you attach a custom domain
  if you own one — not required, the default `.vercel.app` URL works fine
  for sharing with 10 people.
