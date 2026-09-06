import NextDeadline from "@/components/NextDeadline";
import GameweekProgress from "@/components/GameweekProgress";
import StandingsTable from "@/components/StandingsTable";
import { getCurrentGameweek, getLiveStandings, getUpcomingDeadline } from "@/lib/data";

export default async function StandingsPage() {
  const [{ rows: standings, isLive, liveManagerIds }, gameweek, upcomingDeadline] = await Promise.all([
    getLiveStandings(),
    getCurrentGameweek(),
    getUpcomingDeadline(),
  ]);

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <NextDeadline deadline={upcomingDeadline} />

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          League Standings
        </h1>
        <p className="text-sm text-muted">
          {gameweek
            ? `Gameweek ${gameweek.id}${gameweek.status.isComplete ? " complete" : ""}`
            : "Season hasn't started yet"}
        </p>
      </div>

      {gameweek && <GameweekProgress status={gameweek.status} />}

      {isLive && (
        <p className="flex items-center gap-1.5 rounded-lg bg-live/10 px-3 py-2 text-xs font-medium text-live">
          <span className="pl-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />
          Live projection &mdash; this is how standings would look if Gameweek {gameweek?.id} ended right
          now. Locks in once the gameweek finishes.
        </p>
      )}

      <StandingsTable rows={standings} liveManagerIds={liveManagerIds} />
    </div>
  );
}
