import { notFound } from "next/navigation";
import HeadToHeadGrid from "@/components/HeadToHeadGrid";
import RankSparkline from "@/components/RankSparkline";
import StatTile from "@/components/StatTile";
import StreakBadge from "@/components/StreakBadge";
import {
  MANAGERS,
  getBestAndWorstGameweek,
  getCurrentStreak,
  getManagerById,
  getRankHistory,
} from "@/components/mock-data";

// NOTE: mock data -- see components/mock-data.ts. Rank history, streaks and
// best/worst gameweeks are all derived from the fabricated GW1-6 season.

export function generateStaticParams() {
  return MANAGERS.map((manager) => ({ id: manager.id }));
}

export default async function ManagerProfilePage(props: PageProps<"/manager/[id]">) {
  const { id } = await props.params;
  const manager = getManagerById(id);

  if (!manager) {
    notFound();
  }

  const rankHistory = getRankHistory(manager.id);
  const { best, worst } = getBestAndWorstGameweek(manager.id);
  const streak = getCurrentStreak(manager.id);

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
          <RankSparkline history={rankHistory} color={manager.accentColor} leagueSize={MANAGERS.length} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Best GW" value={best ? best.pointsFor : "-"} detail={best ? `GW${best.gameweek} vs ${best.opponent.teamName}` : undefined} accent="var(--win)" />
        <StatTile label="Worst GW" value={worst ? worst.pointsFor : "-"} detail={worst ? `GW${worst.gameweek} vs ${worst.opponent.teamName}` : undefined} accent="var(--loss)" />
        <StatTile label="Current rank" value={rankHistory[rankHistory.length - 1]?.rank ?? "-"} detail={`of ${MANAGERS.length}`} />
        <StatTile label="Starting rank" value={rankHistory[0]?.rank ?? "-"} detail={`GW${rankHistory[0]?.gameweek ?? 1}`} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Head-to-head record</h2>
        <HeadToHeadGrid manager={manager} />
      </section>
    </div>
  );
}
