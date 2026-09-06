import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getBrowserClient,
  getCurrentGameweek,
  getFullSchedule,
  getLiveScores,
  getManagers,
  getServerClient,
} from "@/lib/supabase";
import { computeManagerScores, type ManagerLiveScore } from "@/lib/live-points";
import { finalizeGameweeks, pendingFinalization } from "@/lib/finalize";
import { getAllFixtures } from "@/lib/fpl";

// GET /api/live
//
// The one number the matchup cards show, and the site's safety net for
// getting a finished gameweek written down.
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

// ---------------------------------------------------------------------------
// Backfilling missed results.
//
// `h2h_matches` is what standings, form and head-to-head records are built
// from, and it only gets written when something notices a gameweek is over.
// That used to be /api/poll alone, which only runs if an external cron keeps
// pinging it — so when that pinger stopped after GW1, GW2 finished, was
// never written, and the standings table simply skipped a week.
//
// This route is the natural second trigger: every visitor's browser hits it,
// so "somebody opened the site" is enough to get results saved, with no cron
// in the loop. It has to be *this* route rather than the page renders that
// need the data, because finalizing reads FPL uncached and an uncached fetch
// inside those ISR-cached renders aborts them ("Page changed from static to
// dynamic at runtime"). Route handlers are always dynamic, so it's legal
// here and only here.
// ---------------------------------------------------------------------------

/** Checking costs a schedule read plus a cached fixture list; at one request
 * per visitor per minute that's worth collapsing to one check per window. */
const HEAL_CHECK_INTERVAL_MS = 60 * 1000;

let lastHealCheck = 0;
let healInFlight: Promise<void> | null = null;

async function backfillMissedResults(): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  if (Date.now() - lastHealCheck < HEAL_CHECK_INTERVAL_MS || healInFlight) return;
  lastHealCheck = Date.now();

  const [matches, fixtures] = await Promise.all([
    getFullSchedule(getBrowserClient()),
    getAllFixtures().catch(() => []),
  ]);
  const pending = pendingFinalization(matches, fixtures);
  if (pending.length === 0) return;

  healInFlight = (async () => {
    const server = getServerClient();
    const written = await finalizeGameweeks(server, pending, await getManagers(server));
    if (written.length === 0) return;
    console.warn(`[finalize] backfilled gameweek results: ${written.join(", ")}`);
    // The pages that read these rows are ISR-cached, so without this the
    // repaired table waits out the revalidate window before anyone sees it.
    for (const path of ["/", "/fixtures", "/gameweek", "/stats", "/news"]) {
      revalidatePath(path);
    }
  })().finally(() => {
    healInFlight = null;
  });
  await healInFlight;
}

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
  // Before serving scores: if a finished gameweek was never written to the
  // permanent record, write it now. Deliberately awaited rather than left
  // dangling — a serverless instance can be frozen the moment the response
  // is sent, which is how a fire-and-forget repair silently never happens.
  // Never fatal: this route's own job is reporting live scores.
  try {
    await backfillMissedResults();
  } catch (err) {
    console.error("[finalize] backfill failed", err);
  }

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
