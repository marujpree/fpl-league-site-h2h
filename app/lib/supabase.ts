import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Browser/anon client — safe to use in Client Components. No per-user auth
// (PRD §10: site is public-by-link, only a single admin login exists and
// that's handled separately, not via Supabase auth here).
export function getBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  }
  return createClient(url, anonKey);
}

// Server-only client using the service role key — bypasses RLS. Only ever
// import this from Route Handlers / Server Components / the cron job, never
// from client code (the service key must not reach the browser).
export function getServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ---- Row shapes (mirrors supabase/schema.sql — PRD §3) ----

export interface ManagerRow {
  id: string;
  fpl_entry_id: number;
  display_name: string;
  team_name: string;
  draft_order: number | null;
}

export interface GameweekRow {
  id: number;
  deadline_time: string | null;
  is_current: boolean;
  is_finished: boolean;
}

export interface H2HMatchRow {
  id: string;
  gameweek_id: number;
  manager_1_id: string;
  manager_2_id: string;
  score_1: number | null;
  score_2: number | null;
  winner_id: string | null;
}

export interface StandingsSnapshotRow {
  manager_id: string;
  gameweek_id: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  league_rank: number;
}

export interface LivePointsCacheRow {
  manager_id: string;
  gameweek_id: number;
  current_points: number;
  last_updated: string;
}

// ---- Query helpers ----
// Generic on purpose: table/column names come straight from PRD §3 /
// supabase/schema.sql. Pass a client in (browser client for pages, server
// client for the cron route / admin actions).

export async function getManagers(client: SupabaseClient): Promise<ManagerRow[]> {
  const { data, error } = await client
    .from("managers")
    .select("*")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return data as ManagerRow[];
}

export async function getCurrentGameweek(
  client: SupabaseClient
): Promise<GameweekRow | null> {
  const { data, error } = await client
    .from("gameweeks")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  return data as GameweekRow | null;
}

// Full-season standings table (PRD §4.1) — latest snapshot per manager,
// ordered by league rank.
export async function getStandings(
  client: SupabaseClient,
  gameweekId?: number
): Promise<StandingsSnapshotRow[]> {
  let query = client.from("standings_snapshot").select("*");
  if (gameweekId !== undefined) {
    query = query.eq("gameweek_id", gameweekId);
  } else {
    // Latest snapshot overall: highest gameweek_id per manager. Supabase
    // JS client can't do window functions, so this assumes a DB view or
    // the caller passing the current gameweek id explicitly is preferred.
    query = query.order("gameweek_id", { ascending: false });
  }
  const { data, error } = await query.order("league_rank", { ascending: true });
  if (error) throw error;
  return data as StandingsSnapshotRow[];
}

export async function getMatchesForGameweek(
  client: SupabaseClient,
  gameweekId: number
): Promise<H2HMatchRow[]> {
  const { data, error } = await client
    .from("h2h_matches")
    .select("*")
    .eq("gameweek_id", gameweekId);
  if (error) throw error;
  return data as H2HMatchRow[];
}

export async function getFullSchedule(
  client: SupabaseClient
): Promise<H2HMatchRow[]> {
  const { data, error } = await client
    .from("h2h_matches")
    .select("*")
    .order("gameweek_id", { ascending: true });
  if (error) throw error;
  return data as H2HMatchRow[];
}

export async function getLiveScores(
  client: SupabaseClient,
  gameweekId: number
): Promise<LivePointsCacheRow[]> {
  const { data, error } = await client
    .from("live_points_cache")
    .select("*")
    .eq("gameweek_id", gameweekId);
  if (error) throw error;
  return data as LivePointsCacheRow[];
}

// Used by the cron poll route (server client only) to write the latest
// live points per manager for a gameweek. Upsert on (manager_id,
// gameweek_id) — see the unique constraint in supabase/schema.sql.
export async function upsertLiveScores(
  client: SupabaseClient,
  rows: Array<Pick<LivePointsCacheRow, "manager_id" | "gameweek_id" | "current_points">>
): Promise<number> {
  if (rows.length === 0) return 0;
  const payload = rows.map((r) => ({
    ...r,
    last_updated: new Date().toISOString(),
  }));
  const { error } = await client
    .from("live_points_cache")
    .upsert(payload, { onConflict: "manager_id,gameweek_id" });
  if (error) throw error;
  return payload.length;
}
