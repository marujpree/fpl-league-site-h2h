import GameweekProgress from "@/components/GameweekProgress";
import LiveGameweekView from "@/components/LiveGameweekView";
import { getCurrentGameweek, getCurrentGameweekMatchups } from "@/lib/data";

export default async function GameweekPage() {
  const [matchups, gameweek] = await Promise.all([getCurrentGameweekMatchups(), getCurrentGameweek()]);

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          This Gameweek
        </h1>
        <p className="text-sm text-muted">
          {gameweek
            ? `Gameweek ${gameweek.id} matchups${gameweek.status.isComplete ? " · completed" : ""}`
            : "Season hasn't started yet"}
        </p>
      </div>

      {gameweek && <GameweekProgress status={gameweek.status} />}

      {matchups.length === 0 ? (
        <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
          No matchups yet — check back once the season kicks off.
        </p>
      ) : (
        <LiveGameweekView
          matchups={matchups}
          gameweekId={gameweek?.id ?? null}
          gameweekFinished={gameweek?.status.isComplete ?? false}
        />
      )}
    </div>
  );
}
