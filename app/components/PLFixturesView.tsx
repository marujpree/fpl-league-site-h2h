"use client";

import { useMemo, useState } from "react";
import PLFixtureCard from "./PLFixtureCard";
import type { PLFixtureRow } from "@/lib/data";

type PLFixturesViewProps = {
  fixtures: PLFixtureRow[];
  currentGameweek: number | null;
  totalGameweeks: number;
};

type Selection = number | "all";

export default function PLFixturesView({ fixtures, currentGameweek, totalGameweeks }: PLFixturesViewProps) {
  const [selected, setSelected] = useState<Selection>(currentGameweek ?? 1);

  const byGw = useMemo(() => {
    const map = new Map<number, PLFixtureRow[]>();
    for (const f of fixtures) {
      const list = map.get(f.gameweek) ?? [];
      list.push(f);
      map.set(f.gameweek, list);
    }
    return map;
  }, [fixtures]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected((gw) => (gw === "all" ? "all" : Math.max(1, gw - 1)))}
          disabled={selected === "all" || selected <= 1}
          aria-label="Previous gameweek"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-card-border text-muted transition-colors hover:bg-background-elevated hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          &larr;
        </button>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="flex-1 rounded-lg border border-card-border bg-card px-3 py-2 text-sm font-semibold text-foreground"
        >
          <option value="all">View all gameweeks</option>
          {Array.from({ length: totalGameweeks }, (_, i) => i + 1).map((gw) => (
            <option key={gw} value={gw}>
              Gameweek {gw}
              {gw === currentGameweek ? " (current)" : ""}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSelected((gw) => (gw === "all" ? "all" : Math.min(totalGameweeks, gw + 1)))}
          disabled={selected === "all" || selected >= totalGameweeks}
          aria-label="Next gameweek"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-card-border text-muted transition-colors hover:bg-background-elevated hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          &rarr;
        </button>
      </div>

      {selected === "all" ? (
        <div className="flex flex-col gap-5">
          {Array.from({ length: totalGameweeks }, (_, i) => i + 1)
            .filter((gw) => (byGw.get(gw) ?? []).length > 0)
            .map((gw) => (
              <GameweekSection key={gw} gw={gw} fixtures={byGw.get(gw) ?? []} isCurrent={gw === currentGameweek} />
            ))}
        </div>
      ) : (
        <GameweekSection gw={selected} fixtures={byGw.get(selected) ?? []} isCurrent={selected === currentGameweek} />
      )}
    </div>
  );
}

function GameweekSection({
  gw,
  fixtures,
  isCurrent,
}: {
  gw: number;
  fixtures: PLFixtureRow[];
  isCurrent: boolean;
}) {
  const anyLive = fixtures.some((f) => f.started && !f.finished);

  return (
    <section className="flex flex-col gap-3">
      <div
        className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
          isCurrent ? "text-live" : "text-muted"
        }`}
      >
        <span>Gameweek {gw}</span>
        {anyLive && (
          <span className="inline-flex items-center gap-1.5">
            <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
            In play
          </span>
        )}
      </div>

      {fixtures.length === 0 ? (
        <p className="rounded-xl border border-card-border bg-card p-4 text-center text-sm text-muted">
          Fixtures not scheduled yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {fixtures.map((fixture) => (
            <PLFixtureCard key={fixture.id} fixture={fixture} />
          ))}
        </div>
      )}
    </section>
  );
}
