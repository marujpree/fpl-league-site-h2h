import { NextRequest, NextResponse } from "next/server";
import { getManagerGameweekLineup } from "@/lib/data";

// GET /api/lineup?manager=<slug>&gameweek=<id>
//
// The "View team" page's live counterpart to /api/live. Both go through
// lib/live-points.ts, so the total this returns for a manager is the same
// number their matchup card shows — the two screens used to drift because
// this page was server-rendered once and then sat there while the matchup
// cards kept polling.
export async function GET(request: NextRequest) {
  const managerId = request.nextUrl.searchParams.get("manager");
  const gameweek = Number(request.nextUrl.searchParams.get("gameweek"));

  if (!managerId || !Number.isInteger(gameweek) || gameweek < 1) {
    return NextResponse.json({ error: "manager and gameweek are required" }, { status: 400 });
  }

  try {
    const lineup = await getManagerGameweekLineup(managerId, gameweek);
    return NextResponse.json({ manager: managerId, gameweek, lineup });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
