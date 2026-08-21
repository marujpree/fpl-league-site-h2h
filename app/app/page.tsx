import StandingsTable from "@/components/StandingsTable";
import { getCurrentGameweek, getCurrentGameweekMatchups, getStandings } from "@/lib/data";

export default async function StandingsPage() {
  const [standings, matchups, gameweek] = await Promise.all([
    getStandings(),
    getCurrentGameweekMatchups(),
    getCurrentGameweek(),
  ]);

  const liveManagerIds = new Set(
    matchups.filter((m) => m.isLive).flatMap((m) => [m.manager1.id, m.manager2.id])
  );

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          League Standings
        </h1>
        <p className="text-sm text-muted">
          {gameweek
            ? `Gameweek ${gameweek.id}${gameweek.is_finished ? " complete" : gameweek.deadline_time ? ` · deadline ${new Date(gameweek.deadline_time).toLocaleString()}` : ""}`
            : "Season hasn't started yet"}
        </p>
      </div>

      <StandingsTable rows={standings} liveManagerIds={liveManagerIds} />
    </div>
  );
}
