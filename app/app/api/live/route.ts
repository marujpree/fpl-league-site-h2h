import { NextRequest, NextResponse } from "next/server";
import { getBrowserClient, getCurrentGameweek, getLiveScores } from "@/lib/supabase";

// GET /api/live
//
// Public, unauthenticated read of `live_points_cache`. This is what the
// frontend polls client-side (every 60-90s while a live gameweek page is
// open) to deliver the "auto-updating, no manual refresh" UX from the PRD.
// It never writes anything — /api/poll (secret-protected) is the only
// writer — so it's safe to leave open to anyone with the link, matching the
// site's public-by-link access model.
//
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
        return NextResponse.json({ gameweek: null, scores: [] });
      }
      gameweekId = current.id;
    }

    const scores = await getLiveScores(supabase, gameweekId);
    return NextResponse.json({ gameweek: gameweekId, scores });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
