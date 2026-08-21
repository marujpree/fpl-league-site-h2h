"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import HeadToHeadSummary from "./HeadToHeadSummary";
import type { FixtureEntry } from "@/lib/fpl-types";

type FixturesViewProps = {
  fixtures: FixtureEntry[];
  currentGw: number | null;
  totalGameweeks: number;
};

type Selection = number | "all";

export default function FixturesView({ fixtures, currentGw, totalGameweeks }: FixturesViewProps) {
  const [selected, setSelected] = useState<Selection>(currentGw ?? 1);

  const gwFixtures = useMemo(
    () => (selected === "all" ? [] : fixtures.filter((f) => f.gameweek === selected)),
    [fixtures, selected]
  );

  const byGw = useMemo(() => {
    const map = new Map<number, FixtureEntry[]>();
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
              {gw === currentGw ? " (current)" : ""}
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
        <div className="flex flex-col gap-4">
          {Array.from({ length: totalGameweeks }, (_, i) => i + 1).map((gw) => (
            <GameweekSection key={gw} gw={gw} fixtures={byGw.get(gw) ?? []} isCurrent={gw === currentGw} />
          ))}
        </div>
      ) : (
        <GameweekSection gw={selected} fixtures={gwFixtures} isCurrent={selected === currentGw} />
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
  fixtures: FixtureEntry[];
  isCurrent: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border ${isCurrent ? "border-live/50" : "border-card-border"}`}>
      <div
        className={`flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${
          isCurrent ? "bg-live/10 text-live" : "bg-background-elevated text-muted"
        }`}
      >
        <span>Gameweek {gw}</span>
        {isCurrent && (
          <span className="inline-flex items-center gap-1.5">
            <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
            In play
          </span>
        )}
      </div>
      <ul className="divide-y divide-card-border">
        {fixtures.map((fixture) => (
          <FixtureRow key={`${fixture.manager1.id}-${fixture.manager2.id}`} fixture={fixture} />
        ))}
      </ul>
    </section>
  );
}

function FixtureRow({ fixture }: { fixture: FixtureEntry }) {
  const [expanded, setExpanded] = useState(false);
  const { manager1, manager2, played, score1, score2, isLive, headToHead } = fixture;

  return (
    <li className="bg-card">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-background-elevated"
      >
        <ManagerLabel manager={manager1} align="left" />
        <span className="shrink-0 tabular-nums font-semibold text-foreground">
          {played ? (
            <span className="inline-flex items-center gap-1.5">
              {isLive && <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />}
              {score1} <span className="text-muted">&ndash;</span> {score2}
            </span>
          ) : (
            <span className="text-xs font-medium uppercase text-muted">vs</span>
          )}
        </span>
        <ManagerLabel manager={manager2} align="right" />
      </div>

      {expanded && headToHead && (
        <div className="border-t border-card-border px-4 py-3">
          <HeadToHeadSummary manager1={manager1} manager2={manager2} record={headToHead} />
        </div>
      )}
    </li>
  );
}

function ManagerLabel({
  manager,
  align,
}: {
  manager: FixtureEntry["manager1"];
  align: "left" | "right";
}) {
  return (
    <Link
      href={`/manager/${manager.id}`}
      onClick={(e) => e.stopPropagation()}
      className={`flex min-w-0 flex-1 items-center gap-2 hover:text-accent-strong ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: manager.accentColor }} />
      <span className="flex min-w-0 items-baseline gap-1.5 truncate">
        <span className="truncate">{manager.teamName}</span>
        <span className="shrink-0 text-[10px] font-semibold uppercase text-muted">{manager.initials}</span>
      </span>
    </Link>
  );
}
