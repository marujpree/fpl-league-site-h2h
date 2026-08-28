import { NextRequest, NextResponse } from "next/server";
import { getBrowserClient, getCurrentGameweek, getLiveScores, getManagers } from "@/lib/supabase";
import { computeManagerScores, type ManagerLiveScore } from "@/lib/live-points";

// GET /api/live
//
// The one number the matchup cards show. It never writes anything —
// /api/poll (secret-protected) is the only writer — so it's safe to leave
// open to anyone with the link, matching the site's public-by-link model.
//
// Normally this just reads `live_points_cache`, which /api/poll refreshes
// every ~60s. But that cache is only as good as the poller: if the external
// cron ping stops, the cache freezes and the scores silently go stale while
// still looking live. So when the cache is missing or too old, this
// computes the scores itself from FPL, through the same lib/live-points.ts
// used by the poller and by the "View team" lineup — so whichever path
// serves a request, every screen is showing the same arithmetic over the
// same upstream snapshot.

/** Older than this and the cache is treated as unusable rather than shown
 * as if it were current. Comfortably longer than the poller's ~60s cadence
 * so a single missed ping doesn't trigger a recompute. */
const CACHE_STALE_MS = 3 * 60 * 1000;

/** Recomputing means ~11 upstream FPL requests, and every open tab polls
 * this once a minute. A short in-process memo collapses that burst to one
 * fetch per instance per window without ever serving anything stale enough
 * to matter. */
const RECOMPUTE_TTL_MS = 45 * 1000;

let memo: { gameweek: number; at: number; scores: ManagerLiveScore[] } | null = null;

async function computeWithMemo(gameweek: number): Promise<ManagerLiveScore[]> {
  const now = Date.now();
  if (memo && memo.gameweek === gameweek && now - memo.at < RECOMPUTE_TTL_MS) {
    return memo.scores;
  }
  const supabase = getBrowserClient();
  const managers = await getManagers(supabase);
  const scores = await computeManagerScores(managers, gameweek);
  memo = { gameweek, at: now, scores };
  return scores;
}

// Query params:
//   ?gameweek=<id>  optional — defaults to whichever gameweek is currently
//                   flagged `is_current` in the `gameweeks` table.
export async function GET(request: NextRequest) {
  try {
    // Uses the anon client on purpose: this is a public read of a table
    // that should have a permissive SELECT policy, same trust level as any
    // other page data. No service-role key needed or wanted here.
    const supabase = getBrowserClient();

    const gwParam = request.nextUrl.searchParams.get("gameweek");
    let gameweekId: number | null = gwParam ? Number(gwParam) : null;

    if (gameweekId === null || Number.isNaN(gameweekId)) {
      const current = await getCurrentGameweek(supabase);
      if (!current) {
        return NextResponse.json({ gameweek: null, scores: [], source: "none" });
      }
      gameweekId = current.id;
    }

    const cached = await getLiveScores(supabase, gameweekId);
    const newest = cached.reduce<number>(
      (max, row) => Math.max(max, new Date(row.last_updated).getTime()),
      0
    );
    const cacheUsable = cached.length > 0 && Date.now() - newest < CACHE_STALE_MS;

    if (cacheUsable) {
      return NextResponse.json({
        gameweek: gameweekId,
        scores: cached,
        source: "cache",
        updatedAt: new Date(newest).toISOString(),
      });
    }

    try {
      const scores = await computeWithMemo(gameweekId);
      return NextResponse.json({
        gameweek: gameweekId,
        scores,
        source: "live",
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // FPL is having a moment. A stale cache still beats an empty page.
      return NextResponse.json({
        gameweek: gameweekId,
        scores: cached,
        source: "stale-cache",
        updatedAt: newest ? new Date(newest).toISOString() : null,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
