// Typed client for the public FPL Draft API. No auth required. All
// functions are plain `fetch` wrappers meant to be called from Server
// Components / Route Handlers (Next.js dedupes/caches `fetch` per request
// automatically; explicit `next.revalidate` below controls cross-request
// caching).

import type {
  FplBootstrap,
  FplElementStatus,
  FplFixture,
  FplGameState,
  FplLeagueDetails,
  FplTransaction,
} from "./fpl-types";

const BASE = "https://draft.premierleague.com/api";

// Draft's own bootstrap-static only exposes a rolling few-gameweek window of
// fixtures (not the full season, and finished gameweeks drop out of it), so
// the full 380-fixture schedule with kickoff times/scores comes from classic
// FPL's public fixtures endpoint instead. Same underlying team IDs as the
// Draft API, so it joins cleanly against getBootstrap()'s teams list.
const FIXTURES_BASE = "https://fantasy.premierleague.com/api";

/** This dashboard is built for a single fixed league (PRD §12: single
 * season, single league, no multi-tenancy) — league 49277, "Sigma Chi FC". */
export const LEAGUE_ID = 49277;

async function getJson<T>(path: string, revalidateSeconds: number): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`FPL Draft API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** League metadata, the 10 managers, and season-total standings. Changes
 * rarely outside of waiver/trade moves — cache for a few minutes. */
export function getLeagueDetails(leagueId: number): Promise<FplLeagueDetails> {
  return getJson<FplLeagueDetails>(`/league/${leagueId}/details`, 300);
}

/** Players, teams, gameweeks, fixtures. Static-ish; safe to cache longer. */
export function getBootstrap(): Promise<FplBootstrap> {
  return getJson<FplBootstrap>(`/bootstrap-static`, 3600);
}

/** Who owns which player right now (permanent Draft ownership, not
 * per-gameweek picks) — reflects trades/waivers as soon as they're
 * confirmed on FPL's side. Cached 5min so a trade shows up promptly
 * without re-fetching ~600 players on every page view. */
export function getElementStatus(leagueId: number): Promise<{ element_status: FplElementStatus[] }> {
  return getJson<{ element_status: FplElementStatus[] }>(`/league/${leagueId}/element-status`, 300);
}

/** Whether a gameweek is currently live. Poll this frequently. */
export function getGameState(): Promise<FplGameState> {
  return getJson<FplGameState>(`/game`, 60);
}

// Per-player live stats and per-manager picks deliberately do NOT live
// here: they're the numbers that have to agree between the matchup cards
// and a manager's own page, so they go through lib/live-points.ts, which
// fetches them uncached and does the scoring arithmetic in one place.

/** Full 38-gameweek Premier League fixture schedule — kickoff times, live
 * state, and scores for all 380 matches. Poll-frequency cache since this is
 * what shows live scorelines during a live gameweek. */
export async function getAllFixtures(): Promise<FplFixture[]> {
  const res = await fetch(`${FIXTURES_BASE}/fixtures/`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`FPL fixtures API failed: ${res.status}`);
  }
  return res.json();
}

/** Waiver/free-agent pickups and trades for this league, accepted and
 * pending alike -- caller filters by `result`/`kind`. */
export async function getTransactions(leagueId: number): Promise<FplTransaction[]> {
  const res = await fetch(`${BASE}/draft/league/${leagueId}/transactions`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`FPL transactions API failed: ${res.status}`);
  }
  const body = (await res.json()) as { transactions: FplTransaction[] };
  return body.transactions ?? [];
}
