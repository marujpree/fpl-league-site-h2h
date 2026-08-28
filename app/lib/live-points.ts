// The single implementation of "what is this manager scoring right now".
//
// This used to exist twice -- once inside /api/poll (which writes
// live_points_cache, the number the matchup cards show) and once inside
// lib/data.ts's getManagerGameweekLineup (the number the "View team" page
// shows). Same formula, but two copies reading two differently-cached
// snapshots, which is why the two screens could disagree by a few points
// mid-gameweek. Both now go through here.

import type { FplEntryEventPick } from "./fpl-types";

const FPL_DRAFT_API = "https://draft.premierleague.com/api";

export interface ManagerEntry {
  id: string;
  fpl_entry_id: number;
}

export interface ManagerLiveScore {
  manager_id: string;
  gameweek_id: number;
  current_points: number;
}

/** Route handlers want the newest possible numbers; Server Components
 * rendering a page that's allowed to be statically generated can't use
 * `no-store` without forcing the whole route dynamic, so they pass a short
 * revalidate window instead. Either way the arithmetic downstream is the
 * same, which is what actually keeps the screens in agreement. */
export type Freshness = { revalidateSeconds: number } | "no-store";

function fetchInit(freshness: Freshness): RequestInit {
  return freshness === "no-store"
    ? { cache: "no-store" }
    : { next: { revalidate: freshness.revalidateSeconds } };
}

/** Live points per FPL element id for one gameweek. */
export async function fetchLivePointsByElement(
  gameweek: number,
  freshness: Freshness = "no-store"
): Promise<Map<number, number>> {
  const res = await fetch(`${FPL_DRAFT_API}/event/${gameweek}/live`, fetchInit(freshness));
  if (!res.ok) throw new Error(`FPL /event/${gameweek}/live failed: ${res.status}`);
  const body = (await res.json()) as {
    elements: Record<string, { stats: { total_points: number } }>;
  };
  const map = new Map<number, number>();
  for (const [elementId, entry] of Object.entries(body.elements ?? {})) {
    map.set(Number(elementId), entry.stats?.total_points ?? 0);
  }
  return map;
}

/** A manager's picks for one gameweek, or null before their lineup locks --
 * FPL answers with a non-JSON "No pick history" body in that case. */
export async function fetchPicks(
  entryId: number,
  gameweek: number,
  freshness: Freshness = "no-store"
): Promise<FplEntryEventPick[] | null> {
  const res = await fetch(
    `${FPL_DRAFT_API}/entry/${entryId}/event/${gameweek}`,
    fetchInit(freshness)
  );
  if (!res.ok) return null;
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
  const body = (await res.json()) as { picks?: FplEntryEventPick[] };
  return body.picks ?? null;
}

/** Points contributed by one pick. Draft doesn't zero out `multiplier` for
 * benched players (see FplEntryEventPick), so `position` is what decides
 * whether a pick counts -- bench never does. */
export function pickPoints(
  pick: FplEntryEventPick,
  livePoints: Map<number, number>
): number {
  if (pick.position > 11) return 0;
  return (livePoints.get(pick.element) ?? 0) * pick.multiplier;
}

/** The number shown as a manager's gameweek score: starting XI only,
 * captain doubled. Identical math everywhere it's displayed. */
export function startingXiTotal(
  picks: FplEntryEventPick[],
  livePoints: Map<number, number>
): number {
  return picks.reduce((total, pick) => total + pickPoints(pick, livePoints), 0);
}

/** Every manager's live score for a gameweek, straight from FPL. Managers
 * without a locked lineup yet are omitted rather than reported as 0. */
export async function computeManagerScores(
  managers: ManagerEntry[],
  gameweek: number,
  freshness: Freshness = "no-store"
): Promise<ManagerLiveScore[]> {
  const livePoints = await fetchLivePointsByElement(gameweek, freshness);
  const results = await Promise.all(
    managers.map(async (manager) => {
      const picks = await fetchPicks(manager.fpl_entry_id, gameweek, freshness);
      if (!picks || picks.length === 0) return null;
      return {
        manager_id: manager.id,
        gameweek_id: gameweek,
        current_points: startingXiTotal(picks, livePoints),
      };
    })
  );
  return results.filter((r): r is ManagerLiveScore => r !== null);
}
