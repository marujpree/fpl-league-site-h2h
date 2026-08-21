import Link from "next/link";
import { CURRENT_GAMEWEEK, FIXTURES, TOTAL_GAMEWEEKS, type FixtureEntry } from "@/components/mock-data";

// NOTE: mock data -- see components/mock-data.ts. Full 38-gameweek schedule
// is generated from a double round-robin; only gameweeks before the
// fabricated "current" GW6 carry results.

function groupByGameweek(fixtures: FixtureEntry[]): Map<number, FixtureEntry[]> {
  const map = new Map<number, FixtureEntry[]>();
  for (const fixture of fixtures) {
    const list = map.get(fixture.gameweek) ?? [];
    list.push(fixture);
    map.set(fixture.gameweek, list);
  }
  return map;
}

export default function FixturesPage() {
  const grouped = groupByGameweek(FIXTURES);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Fixtures
        </h1>
        <p className="text-sm text-muted">
          Full {TOTAL_GAMEWEEKS}-gameweek schedule &middot; Gameweek {CURRENT_GAMEWEEK} in progress
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {Array.from({ length: TOTAL_GAMEWEEKS }, (_, i) => i + 1).map((gw) => {
          const fixtures = grouped.get(gw) ?? [];
          const isCurrent = gw === CURRENT_GAMEWEEK;
          return (
            <section
              key={gw}
              id={`gw-${gw}`}
              className={`overflow-hidden rounded-xl border ${
                isCurrent ? "border-live/50" : "border-card-border"
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${
                  isCurrent ? "bg-live/10 text-live" : "bg-background-elevated text-muted"
                }`}
              >
                <span>Gameweek {gw}</span>
                {isCurrent && <span>Live</span>}
              </div>
              <ul className="divide-y divide-card-border">
                {fixtures.map((fixture) => (
                  <li
                    key={`${fixture.manager1.id}-${fixture.manager2.id}`}
                    className="flex items-center justify-between gap-3 bg-card px-4 py-3 text-sm"
                  >
                    <ManagerLabel id={fixture.manager1.id} name={fixture.manager1.teamName} color={fixture.manager1.accentColor} align="left" />
                    <span className="shrink-0 tabular-nums font-semibold text-foreground">
                      {fixture.played ? (
                        <>
                          {fixture.score1} <span className="text-muted">&ndash;</span> {fixture.score2}
                        </>
                      ) : (
                        <span className="text-xs font-medium uppercase text-muted">vs</span>
                      )}
                    </span>
                    <ManagerLabel id={fixture.manager2.id} name={fixture.manager2.teamName} color={fixture.manager2.accentColor} align="right" />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ManagerLabel({
  id,
  name,
  color,
  align,
}: {
  id: string;
  name: string;
  color: string;
  align: "left" | "right";
}) {
  return (
    <Link
      href={`/manager/${id}`}
      className={`flex min-w-0 flex-1 items-center gap-2 hover:text-accent-strong ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </Link>
  );
}
