import { notFound } from "next/navigation";
import HeadToHeadGrid from "@/components/HeadToHeadGrid";
import LineupView from "@/components/LineupView";
import RankSparkline from "@/components/RankSparkline";
import SquadList from "@/components/SquadList";
import StatTile from "@/components/StatTile";
import StreakBadge from "@/components/StreakBadge";
import {
  getBestAndWorstGameweek,
  getCurrentGameweek,
  getCurrentStreak,
  getManagerById,
  getManagers,
  getManagerGameweekLineup,
  getManagerSquad,
  getRankHistory,
} from "@/lib/data";

export async function generateStaticParams() {
  const managers = await getManagers();
  return managers.map((manager) => ({ id: manager.id }));
}

export default async function ManagerProfilePage(props: PageProps<"/manager/[id]">) {
  const { id } = await props.params;
  const manager = await getManagerById(id);

  if (!manager) {
    notFound();
  }

  const [rankHistory, { best, worst }, streak, managers, squad, currentGameweek] = await Promise.all([
    getRankHistory(manager.id),
    getBestAndWorstGameweek(manager.id),
    getCurrentStreak(manager.id),
    getManagers(),
    getManagerSquad(manager.id),
    getCurrentGameweek(),
  ]);
  const leagueSize = managers.length;
  const lineup = currentGameweek ? await getManagerGameweekLineup(manager.id, currentGameweek.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-card-border pb-5">
        <span
          className="h-1.5 w-16 rounded-full"
          style={{ backgroundColor: manager.accentColor }}
          aria-hidden
        />
        <h1
          className="text-3xl font-extrabold tracking-tight sm:text-4xl"
          style={{ color: manager.accentColor }}
        >
          {manager.teamName}
        </h1>
        <p className="text-sm text-muted">{manager.displayName}</p>
        <div className="mt-1">
          <StreakBadge streak={streak} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Rank over time</h2>
        <div className="rounded-xl border border-card-border bg-card p-4">
          {rankHistory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No games played yet this season.</p>
          ) : (
            <RankSparkline history={rankHistory} color={manager.accentColor} leagueSize={leagueSize} />
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Best GW" value={best ? best.pointsFor : "-"} detail={best ? `GW${best.gameweek} vs ${best.opponent.teamName}` : undefined} accent="var(--win)" />
        <StatTile label="Worst GW" value={worst ? worst.pointsFor : "-"} detail={worst ? `GW${worst.gameweek} vs ${worst.opponent.teamName}` : undefined} accent="var(--loss)" />
        <StatTile label="Current rank" value={rankHistory[rankHistory.length - 1]?.rank ?? "-"} detail={`of ${leagueSize}`} />
        <StatTile label="Starting rank" value={rankHistory[0]?.rank ?? "-"} detail={rankHistory[0] ? `GW${rankHistory[0].gameweek}` : undefined} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {currentGameweek ? `Gameweek ${currentGameweek.id} lineup` : "Gameweek lineup"}
        </h2>
        <LineupView lineup={lineup} gameweek={currentGameweek?.id ?? null} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Full squad</h2>
        <SquadList players={squad} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Head to head record</h2>
        <HeadToHeadGrid manager={manager} />
      </section>
    </div>
  );
}
