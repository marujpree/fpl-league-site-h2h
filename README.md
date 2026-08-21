# FPL H2H League Dashboard

Live dashboard for the "Sigma Chi FC" Draft league (FPL league ID `49277`).
Next.js + TypeScript + Tailwind, data in Supabase, pulled from the public
FPL Draft API (`draft.premierleague.com/api`, no auth required). See
`fpl-h2h-dashboard-prd.pdf` for the full product spec.

**For the full step-by-step setup (Supabase → GitHub → Vercel → live
polling), see [`SETUP.md`](./SETUP.md).** This file is just an overview.

## Project layout

- `app/` — the Next.js app (App Router). Vercel's **Root Directory** must
  point here.
- `supabase/schema.sql` — table definitions (PRD §3).
- `supabase/seed.sql` — seeds the 10 real league managers, all 38 real
  gameweek deadlines, and the full 190-fixture H2H schedule.
- `app/lib/fpl.ts` / `app/lib/fpl-types.ts` — typed FPL Draft API client.
- `app/lib/schedule.ts` — the H2H round-robin scheduler (PRD §7).
- `app/lib/supabase.ts` — DB client + typed query helpers.
- `app/app/api/poll/route.ts` — secret-protected route that pulls live FPL
  scores and writes `live_points_cache`.
- `app/app/api/live/route.ts` — public read route the frontend polls for
  auto-updating scores.

## Current status

The season hasn't started yet (GW1 deadline 2026-08-21), so the UI is
currently wired to `app/components/mock-data.ts` (clearly labeled,
fabricated GW1-6 state) rather than live Supabase data, so the pages aren't
empty while there's nothing real to show yet. `app/lib/fpl.ts`,
`app/lib/schedule.ts`, and `supabase/schema.sql` / `seed.sql` are the real
data layer, ready to wire in — swapping the pages from mock data to
Supabase queries (via `app/lib/supabase.ts`'s helpers) is the next step
once you've provisioned Supabase per `SETUP.md`.

**Note on live polling:** Vercel's free Hobby plan only allows daily cron
jobs, not the sub-minute polling PRD §5 wants during a live gameweek.
`SETUP.md` part 4 covers the workaround (a free external pinger).
