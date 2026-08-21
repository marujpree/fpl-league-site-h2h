import StandingsTable from "@/components/StandingsTable";
import { CURRENT_GAMEWEEK, CURRENT_GW_MATCHUPS, STANDINGS } from "@/components/mock-data";

// NOTE: mock data -- the real 2026/27 season hasn't started yet. See
// components/mock-data.ts for details. This page renders a fabricated
// mid-season (GW6) state so the standings table isn't empty.

export default function StandingsPage() {
  const liveManagerIds = new Set(
    CURRENT_GW_MATCHUPS.filter((m) => m.isLive).flatMap((m) => [m.manager1.id, m.manager2.id])
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          League Standings
        </h1>
        <p className="text-sm text-muted">
          Through Gameweek {CURRENT_GAMEWEEK - 1} &middot; Gameweek {CURRENT_GAMEWEEK} live scores shown in the GW column
        </p>
      </div>

      <StandingsTable rows={STANDINGS} liveManagerIds={liveManagerIds} />
    </div>
  );
}
