import Link from "next/link";
import InjuryWatch from "@/components/InjuryWatch";
import LeagueRecords from "@/components/LeagueRecords";
import ManagerBadge from "@/components/ManagerBadge";
import StreakBadge from "@/components/StreakBadge";
import { getAllStreaks, getInjuryWatch, getLeagueRecords, getManagerOfTheWeek } from "@/lib/data";

export default async function StatsPage() {
  const [motw, streaks, records, injuryWatch] = await Promise.all([
    getManagerOfTheWeek(),
    getAllStreaks(),
    getLeagueRecords(),
    getInjuryWatch(),
  ]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Stats
        </h1>
        <p className="text-sm text-muted">League-wide highlights, updated as gameweeks finish</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Manager of the Week</h2>
        {motw ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-card-border bg-card p-5">
            <div className="flex items-center gap-3">
              <ManagerBadge manager={motw.manager} variant="bar" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold tabular-nums text-foreground">{motw.points} pts</p>
              <p className="text-xs text-muted">Gameweek {motw.gameweek}</p>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
            No gameweeks finished yet. Check back once GW1 wraps up.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">League records</h2>
        <LeagueRecords records={records} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Injury watch</h2>
        <InjuryWatch entries={injuryWatch} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Streaks</h2>
        <div className="overflow-hidden rounded-xl border border-card-border">
          <ul className="divide-y divide-card-border">
            {streaks.map(({ manager, streak }) => (
              <li
                key={manager.id}
                className="flex items-center justify-between gap-3 bg-card px-4 py-3"
              >
                <Link href={`/manager/${manager.id}`} className="min-w-0 hover:opacity-80">
                  <ManagerBadge manager={manager} />
                </Link>
                <StreakBadge streak={streak} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
