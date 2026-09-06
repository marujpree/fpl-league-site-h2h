import { NextRequest, NextResponse } from "next/server";
import {
  getServerClient,
  getFullSchedule,
  getManagers,
  setCurrentGameweek,
  upsertLiveScores,
  type ManagerRow,
} from "@/lib/supabase";
import { computeManagerScores } from "@/lib/live-points";
import { finalizeGameweeks, pendingFinalization } from "@/lib/finalize";
import { gameweekStatus, resolveDisplayGameweek } from "@/lib/gameweek-state";
import type { FplFixture } from "@/lib/fpl-types";

// POST/GET /api/poll
//
// Pulls live gameweek points straight from FPL Draft's public API and
// upserts them into `live_points_cache` so the frontend can show
// "auto-updating" scores without hitting FPL directly from the browser.
// It also promotes finished gameweeks into `h2h_matches` (the permanent
// record) and keeps `gameweeks.is_current` pointed at the right week.
//
// Vercel Hobby's cron minimum is once per day (see vercel.json — that cron
// is only a once-a-day fallback so the cache is never *totally* stale).
// Real sub-minute freshness during an active gameweek comes from something
// external pinging this route every ~60s — see SETUP.md for the
// cron-job.org workaround. That's why this is a plain route handler
// protected by a shared secret rather than something wired only into
// Vercel's own cron invocation.
//
// Auth: compare the `x-poll-secret` header against process.env.POLL_SECRET.
// Missing/mismatched secret (including an unset POLL_SECRET, which would
// otherwise make an empty header "match") => 401.
//
// One wrinkle: vercel.json's `crons` config can't attach custom headers, so
// the once-a-day fallback cron in vercel.json can never send x-poll-secret.
// To let that fallback actually authenticate, this also accepts Vercel's
// own built-in cron auth: if you set an env var literally named
// CRON_SECRET in Vercel project settings, Vercel automatically sends
// `Authorization: Bearer <CRON_SECRET>` on its own cron-triggered requests
// only. CRON_SECRET is entirely optional and Vercel-only (no local/browser
// equivalent), which is why it's not in .env.local.example — see SETUP.md.
// External pingers (cron-job.org) and any manual calls should keep using
// x-poll-secret; there's no reason to give them the Vercel-only secret.

const FPL_DRAFT_API = "https://draft.premierleague.com/api";
const FPL_FIXTURES_API = "https://fantasy.premierleague.com/api";

interface GameState {
  current_event: number | null;
  current_event_finished: boolean;
  next_event: number | null;
}

async function fetchGameState(): Promise<GameState> {
  const res = await fetch(`${FPL_DRAFT_API}/game`, { cache: "no-store" });
  if (!res.ok) throw new Error(`FPL /game failed: ${res.status}`);
  return res.json();
}

async function fetchAllFixtures(): Promise<FplFixture[]> {
  const res = await fetch(`${FPL_FIXTURES_API}/fixtures/`, { cache: "no-store" });
  if (!res.ok) throw new Error(`FPL /fixtures failed: ${res.status}`);
  return res.json();
}

async function pollOnce() {
  const [game, fixtures] = await Promise.all([fetchGameState(), fetchAllFixtures()]);
  const supabase = getServerClient();
  const managers: ManagerRow[] = await getManagers(supabase);

  // Which gameweek the site should be showing. Note this is deliberately
  // NOT always `game.current_event`: FPL rolls that forward within minutes
  // of the last whistle, and we hold on the previous week through its
  // settle window so scores don't disappear mid-refresh.
  const displayGameweek = resolveDisplayGameweek(fixtures, game.current_event, null);

  if (displayGameweek === null) {
    return { polled: false, gameweek: null, managersUpdated: 0, finalized: [], reason: "no current_event" };
  }

  await setCurrentGameweek(supabase, displayGameweek);

  // Live cache for the gameweek on screen. Even once it's complete this
  // keeps being refreshed until finalization writes the permanent record,
  // so there's never a window where the page has nothing to show.
  const scores = await computeManagerScores(managers, displayGameweek);
  const managersUpdated = await upsertLiveScores(supabase, scores);

  // Promote anything that's actually done, however long ago. This is a
  // full-season sweep on purpose: an earlier version only reconsidered the
  // last six gameweeks, so a longer gap in polling lost that history for
  // good. /api/live runs the same sweep on ordinary visitor traffic, so the
  // permanent record no longer depends on this route being pinged at all.
  const pending = pendingFinalization(await getFullSchedule(supabase), fixtures);
  const finalized = await finalizeGameweeks(supabase, pending, managers, {
    gameweek: displayGameweek,
    scores,
  });

  const status = gameweekStatus(fixtures, displayGameweek);
  return {
    polled: true,
    gameweek: displayGameweek,
    managersUpdated,
    finalized,
    matchesRemaining: status.remainingMatches + status.inPlayMatches,
    isComplete: status.isComplete,
  };
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const { message, code, details, hint } = err as Record<string, unknown>;
    const parts = [message, code, details, hint].filter(Boolean).map(String);
    if (parts.length > 0) return parts.join(" | ");
  }
  return "Unknown poll error";
}

async function handle(request: NextRequest) {
  const secret = process.env.POLL_SECRET;
  const provided = request.headers.get("x-poll-secret");
  const secretOk = Boolean(secret) && provided === secret;

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!secretOk && !cronOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pollOnce();
    return NextResponse.json(result);
  } catch (err) {
    // Supabase throws plain `{ message, code, details, hint }` objects, not
    // Errors, so an `instanceof Error` check alone reduces every database
    // failure on this route to an unactionable "Unknown poll error".
    console.error("[poll] failed", err);
    return NextResponse.json({ error: describeError(err) }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
