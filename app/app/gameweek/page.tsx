import CaptainTip from "@/components/CaptainTip";
import LiveGameweekView from "@/components/LiveGameweekView";
import { getCaptainTip, getCurrentGameweek, getCurrentGameweekMatchups } from "@/lib/data";

export default async function GameweekPage() {
  const [matchups, gameweek, captainTip] = await Promise.all([
    getCurrentGameweekMatchups(),
    getCurrentGameweek(),
    getCaptainTip(),
  ]);

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          This Gameweek
        </h1>
        <p className="text-sm text-muted">
          {gameweek ? `Gameweek ${gameweek.id} matchups` : "Season hasn't started yet"}
        </p>
      </div>

      <CaptainTip tip={captainTip} />

      {matchups.length === 0 ? (
        <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
          No matchups yet — check back once the season kicks off.
        </p>
      ) : (
        <LiveGameweekView
          matchups={matchups}
          gameweekId={gameweek?.id ?? null}
          gameweekFinished={gameweek?.is_finished ?? false}
        />
      )}
    </div>
  );
}
