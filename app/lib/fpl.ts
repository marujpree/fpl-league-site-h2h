// Typed client for the public FPL Draft API. No auth required. All
// functions are plain `fetch` wrappers meant to be called from Server
// Components / Route Handlers (Next.js dedupes/caches `fetch` per request
// automatically; explicit `next.revalidate` below controls cross-request
// caching).

import type {
  FplBootstrap,
  FplEntryEventPick,
  FplEventLive,
  FplGameState,
  FplLeagueDetails,
} from "./fpl-types";

const BASE = "https://draft.premierleague.com/api";

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

/** Whether a gameweek is currently live. Poll this frequently. */
export function getGameState(): Promise<FplGameState> {
  return getJson<FplGameState>(`/game`, 60);
}

/** Per-player live stats for one gameweek. Poll frequently during a live GW. */
export function getEventLive(gameweek: number): Promise<FplEventLive> {
  return getJson<FplEventLive>(`/event/${gameweek}/live`, 60);
}

/**
 * A manager's squad + multipliers for one gameweek. Returns `null` before
 * that manager has ever had a squad locked for this GW — the API answers
 * with the literal string "No pick history" (not JSON) in that case, which
 * is expected/normal pre-deadline, not an error.
 */
export async function getEntryPicks(
  entryId: number,
  gameweek: number
): Promise<FplEntryEventPick[] | null> {
  const res = await fetch(`${BASE}/entry/${entryId}/event/${gameweek}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  const body = (await res.json()) as { picks?: FplEntryEventPick[] };
  return body.picks ?? null;
}
