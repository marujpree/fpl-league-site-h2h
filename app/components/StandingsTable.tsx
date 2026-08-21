import Link from "next/link";
import type { StandingsRow } from "@/lib/fpl-types";

const RANK_ACCENT: Record<number, string> = {
  1: "#eab308", // gold
  2: "#cbd5e1", // silver
  3: "#d97706", // bronze
};

type StandingsTableProps = {
  rows: StandingsRow[];
  liveManagerIds: Set<string>;
};

export default function StandingsTable({ rows, liveManagerIds }: StandingsTableProps) {
  return (
    <div>
      {/* Mobile: stacked cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <StandingsCard key={row.manager.id} row={row} isLive={liveManagerIds.has(row.manager.id)} />
        ))}
      </ul>

      {/* Wider screens: PL-style table */}
      <div className="hidden overflow-hidden rounded-xl border border-card-border md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-background-elevated text-left text-xs uppercase tracking-wide text-muted">
              <th className="w-12 px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Manager</th>
              <th className="w-14 px-2 py-3 text-center font-medium">P</th>
              <th className="w-14 px-2 py-3 text-center font-medium">W</th>
              <th className="w-14 px-2 py-3 text-center font-medium">D</th>
              <th className="w-14 px-2 py-3 text-center font-medium">L</th>
              <th className="w-20 px-2 py-3 text-center font-medium">GW</th>
              <th className="w-20 px-3 py-3 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isLive = liveManagerIds.has(row.manager.id);
              const rankColor = RANK_ACCENT[row.rank];
              return (
                <tr
                  key={row.manager.id}
                  className="border-t border-card-border transition-colors hover:bg-card"
                  style={{
                    borderLeft: `3px solid ${rankColor ?? "transparent"}`,
                    backgroundColor: isLive ? "color-mix(in oklab, var(--live) 8%, transparent)" : undefined,
                  }}
                >
                  <td className="px-3 py-3 font-semibold text-muted">{row.rank}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/manager/${row.manager.id}`}
                      className="group flex items-center gap-2.5"
                    >
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.manager.accentColor }}
                      />
                      <span className="flex flex-col leading-tight">
                        <span className="font-semibold text-foreground group-hover:text-accent-strong">
                          {row.manager.teamName}
                        </span>
                        <span className="text-xs text-muted">{row.manager.displayName}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-center text-muted">{row.played}</td>
                  <td className="px-2 py-3 text-center text-muted">{row.wins}</td>
                  <td className="px-2 py-3 text-center text-muted">{row.draws}</td>
                  <td className="px-2 py-3 text-center text-muted">{row.losses}</td>
                  <td className="px-2 py-3 text-center">
                    {row.gwPoints !== undefined ? (
                      <span className="inline-flex items-center gap-1.5">
                        {isLive && (
                          <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
                        )}
                        <span className="text-muted">{row.gwPoints}</span>
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-base font-bold text-foreground">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandingsCard({ row, isLive }: { row: StandingsRow; isLive: boolean }) {
  const rankColor = RANK_ACCENT[row.rank];
  return (
    <li>
      <Link
        href={`/manager/${row.manager.id}`}
        className="flex items-center gap-3 rounded-lg border border-card-border bg-card p-3 transition-colors hover:border-accent"
        style={{
          borderLeft: `3px solid ${rankColor ?? "var(--card-border)"}`,
          backgroundColor: isLive ? "color-mix(in oklab, var(--live) 8%, var(--card))" : undefined,
        }}
      >
        <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted">{row.rank}</span>
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: row.manager.accentColor }}
        />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate font-semibold text-foreground">{row.manager.teamName}</span>
          <span className="truncate text-xs text-muted">
            {row.played}P {row.wins}W {row.draws}D {row.losses}L
            {row.gwPoints !== undefined && (
              <>
                {" "}
                &middot; GW {row.gwPoints}
                {isLive && (
                  <span className="pl-pulse-dot ml-1 inline-block h-1.5 w-1.5 rounded-full bg-live align-middle" aria-hidden />
                )}
              </>
            )}
          </span>
        </span>
        <span className="shrink-0 text-lg font-bold text-foreground">{row.points}</span>
      </Link>
    </li>
  );
}
