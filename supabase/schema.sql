-- FPL H2H League Dashboard — schema (PRD §3).
-- Run this in the Supabase SQL editor before supabase/seed.sql.
--
-- Column/table names match app/lib/supabase.ts's ManagerRow / GameweekRow /
-- H2HMatchRow / StandingsSnapshotRow / LivePointsCacheRow exactly — keep
-- them in sync if either side changes.

create table if not exists managers (
  id           text primary key,              -- slug, e.g. 'reyes-fc'
  fpl_entry_id integer not null unique,        -- FPL Draft entry_id
  display_name text not null,                  -- manager's real name
  team_name    text not null,                  -- their FPL team name
  initials     text not null default '',       -- FPL league_entries.short_name
  draft_order  integer                         -- nullable; waiver_pick order
);

create table if not exists gameweeks (
  id            integer primary key,           -- FPL gameweek number, 1-38
  deadline_time timestamptz,
  is_current    boolean not null default false,
  is_finished   boolean not null default false
);

create table if not exists h2h_matches (
  id           uuid primary key default gen_random_uuid(),
  gameweek_id  integer not null references gameweeks(id),
  manager_1_id text not null references managers(id),
  manager_2_id text not null references managers(id),
  score_1      integer,                        -- null until the GW finishes
  score_2      integer,
  winner_id    text references managers(id),   -- null until finished; null on a draw
  constraint chk_distinct_managers check (manager_1_id <> manager_2_id)
);
create index if not exists idx_h2h_matches_gameweek on h2h_matches(gameweek_id);
create index if not exists idx_h2h_matches_manager_1 on h2h_matches(manager_1_id);
create index if not exists idx_h2h_matches_manager_2 on h2h_matches(manager_2_id);

-- One row per manager per gameweek, so the standings table can render a
-- historical rank-over-time chart (PRD §3 / Manager Profile page).
create table if not exists standings_snapshot (
  manager_id  text not null references managers(id),
  gameweek_id integer not null references gameweeks(id),
  points      integer not null default 0,      -- league points: 3/1/0
  wins        integer not null default 0,
  draws       integer not null default 0,
  losses      integer not null default 0,
  league_rank integer not null,
  primary key (manager_id, gameweek_id)
);
create index if not exists idx_standings_gameweek on standings_snapshot(gameweek_id);

-- Fast-changing table, overwritten on every poll during a live gameweek.
-- Unique (manager_id, gameweek_id) backs the upsert in
-- lib/supabase.ts's upsertLiveScores (`onConflict: "manager_id,gameweek_id"`).
create table if not exists live_points_cache (
  manager_id     text not null references managers(id),
  gameweek_id    integer not null references gameweeks(id),
  current_points integer not null default 0,
  last_updated   timestamptz not null default now(),
  primary key (manager_id, gameweek_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security — PRD §10: public-by-link viewing, admin-only writes.
-- The anon/public key (used by the browser client) may only SELECT. All
-- writes go through the service_role key (bypasses RLS entirely), used only
-- by /api/poll and any future admin actions — never exposed to the browser.
-- ---------------------------------------------------------------------------

alter table managers enable row level security;
alter table gameweeks enable row level security;
alter table h2h_matches enable row level security;
alter table standings_snapshot enable row level security;
alter table live_points_cache enable row level security;

create policy "public read managers" on managers for select using (true);
create policy "public read gameweeks" on gameweeks for select using (true);
create policy "public read h2h_matches" on h2h_matches for select using (true);
create policy "public read standings_snapshot" on standings_snapshot for select using (true);
create policy "public read live_points_cache" on live_points_cache for select using (true);

-- Intentionally no insert/update/delete policies for the anon role: without
-- a matching policy, RLS denies those by default. Only service_role
-- (which bypasses RLS) can write.
