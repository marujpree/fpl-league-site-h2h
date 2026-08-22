import { NextRequest, NextResponse } from "next/server";
import {
  getServerClient,
  getManagers,
  upsertLiveScores,
  type ManagerRow,
} from "@/lib/supabase";

// POST/GET /api/poll
//
// Pulls live gameweek points straight from FPL Draft's public API and
// upserts them into `live_points_cache` so the frontend can show
// "auto-updating" scores without hitting FPL directly from the browser.
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

interface GameState {
  current_event: number | null;
  current_event_finished: boolean;
  next_event: number | null;
}

interface LiveEventElementStats {
  total_points: number;
}

interface LiveEventResponse {
  elements: Record<string, { stats: LiveEventElementStats }>;
}

interface EntryEventPick {
  element: number;
  position: number; // 1-11 = starting XI, 12-15 = bench (see fpl-types.ts FplEntryEventPick)
  multiplier: number;
}

interface EntryEventResponse {
  picks: EntryEventPick[];
}

async function fetchGameState(): Promise<GameState> {
  const res = await fetch(`${FPL_DRAFT_API}/game`, { cache: "no-store" });
  if (!res.ok) throw new Error(`FPL /game failed: ${res.status}`);
  return res.json();
}

async function fetchEventLive(eventId: number): Promise<LiveEventResponse> {
  const res = await fetch(`${FPL_DRAFT_API}/event/${eventId}/live`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`FPL /event/${eventId}/live failed: ${res.status}`);
  }
  return res.json();
}

async function fetchEntryPicks(
  entryId: number,
  eventId: number
): Promise<EntryEventPick[] | null> {
  const res = await fetch(`${FPL_DRAFT_API}/entry/${entryId}/event/${eventId}`, {
    cache: "no-store",
  });
  // Picks 404/empty until the manager's squad is locked for this GW — that's
  // expected pre-deadline, not an error worth failing the whole poll over.
  if (!res.ok) return null;
  const body = (await res.json()) as EntryEventResponse;
  return body.picks ?? null;
}

async function pollOnce() {
  const game = await fetchGameState();
  const gameweek = game.current_event;

  if (!gameweek) {
    return { polled: false, gameweek, managersUpdated: 0, reason: "no current_event" };
  }

  const live = await fetchEventLive(gameweek);
  const supabase = getServerClient();
  const managers: ManagerRow[] = await getManagers(supabase);

  const rows: Array<{
    manager_id: string;
    gameweek_id: number;
    current_points: number;
  }> = [];

  for (const manager of managers) {
    const picks = await fetchEntryPicks(manager.fpl_entry_id, gameweek);
    if (!picks || picks.length === 0) continue;

    let total = 0;
    for (const pick of picks) {
      if (pick.position > 11) continue; // bench doesn't count toward the score
      const elementStats = live.elements[String(pick.element)]?.stats;
      if (!elementStats) continue;
      total += elementStats.total_points * pick.multiplier;
    }

    rows.push({
      manager_id: manager.id,
      gameweek_id: gameweek,
      current_points: total,
    });
  }

  const managersUpdated = await upsertLiveScores(supabase, rows);
  return { polled: true, gameweek, managersUpdated };
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
    const message = err instanceof Error ? err.message : "Unknown poll error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
