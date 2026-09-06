"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import HeadToHeadSummary from "./HeadToHeadSummary";
import type { FixtureEntry } from "@/lib/fpl-types";

type FixturesViewProps = {
  fixtures: FixtureEntry[];
  currentGw: number | null;
  /** Whether `currentGw` has finished playing -- its scores are final and
   * there is nothing left to watch there. */
  currentGwFinal: boolean;
  totalGameweeks: number;
};

type Selection = number | "all";

/** "live" is the gameweek being played right now -- the only one that earns
 * a pulsing badge. "final" is that same gameweek once its scores are in. */
type SectionState = "live" | "final" | "scheduled";

export default function FixturesView({
  fixtures,
  currentGw,
  currentGwFinal,
  totalGameweeks,
}: FixturesViewProps) {
  // Once a gameweek's scores are final, looking at it is looking backwards:
  // the interesting page is the one being played next. The site as a whole
  // stays on the finished gameweek until the next deadline (so its results
  // don't vanish the moment the last whistle goes), but this tab is the
  // schedule, so it moves on as soon as there's nothing left to play.
  const nextGw = currentGw === null ? 1 : Math.min(totalGameweeks, currentGw + 1);
  const openAt = currentGw === null ? 1 : currentGwFinal ? nextGw : currentGw;

  const [selected, setSelected] = useState<Selection>(openAt);

  const gwFixtures = useMemo(
    () => (selected === "all" ? [] : fixtures.filter((f) => f.gameweek === selected)),
    [fixtures, selected]
  );

  const sectionState = (gw: number): SectionState =>
    gw !== currentGw ? "scheduled" : currentGwFinal ? "final" : "live";

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
              {gw === currentGw && !currentGwFinal ? " (current)" : ""}
              {currentGwFinal && gw === nextGw ? " (next)" : ""}
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
            <GameweekSection key={gw} gw={gw} fixtures={byGw.get(gw) ?? []} state={sectionState(gw)} />
          ))}
        </div>
      ) : (
        <GameweekSection gw={selected} fixtures={gwFixtures} state={sectionState(selected)} />
      )}
    </div>
  );
}

function GameweekSection({
  gw,
  fixtures,
  state,
}: {
  gw: number;
  fixtures: FixtureEntry[];
  state: SectionState;
}) {
  const isLive = state === "live";
  return (
    <section className={`overflow-hidden rounded-xl border ${isLive ? "border-live/50" : "border-card-border"}`}>
      <div
        className={`flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${
          isLive ? "bg-live/10 text-live" : "bg-background-elevated text-muted"
        }`}
      >
        <span>Gameweek {gw}</span>
        {isLive && (
          <span className="inline-flex items-center gap-1.5">
            <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
            In play
          </span>
        )}
        {state === "final" && <span>Final</span>}
      </div>
      <ul className="divide-y divide-card-border">
        {fixtures.map((fixture) => (
          <FixtureRow key={`${fixture.manager1.id}-${fixture.manager2.id}`} fixture={fixture} />
        ))}
      </ul>
    </section>
  );
}

/** Season-to-date record between these two, as a line you can read without
 * tapping. It was already computed for every fixture and only revealed on
 * expand, which left upcoming rows as two names either side of a lot of
 * whitespace. Null when they've never met, so gameweek 1 doesn't read
 * "0-0". */
function headToHeadHint(fixture: FixtureEntry): string | null {
  const h2h = fixture.headToHead;
  if (!h2h || h2h.meetings === 0) return null;
  const { manager1Wins, manager2Wins, draws } = h2h;
  if (manager1Wins === manager2Wins) {
    return draws > 0 && manager1Wins === 0 ? "All square" : `Level ${manager1Wins}-${manager2Wins}`;
  }
  const leader = manager1Wins > manager2Wins ? fixture.manager1 : fixture.manager2;
  const high = Math.max(manager1Wins, manager2Wins);
  const low = Math.min(manager1Wins, manager2Wins);
  return `${leader.teamName} leads ${high}-${low}`;
}

function FixtureRow({ fixture }: { fixture: FixtureEntry }) {
  const [expanded, setExpanded] = useState(false);
  const { manager1, manager2, played, score1, score2, isLive, headToHead } = fixture;
  const hint = headToHeadHint(fixture);
  // Who actually won, so the result reads at a glance instead of making
  // everyone compare two identically-weighted numbers.
  const winner =
    played && score1 !== undefined && score2 !== undefined && score1 !== score2
      ? score1 > score2
        ? 1
        : 2
      : 0;

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
        <ManagerLabel manager={manager1} align="left" dimmed={winner === 2} />
        <span className="flex shrink-0 flex-col items-center gap-0.5">
          <span className="tabular-nums font-semibold text-foreground">
            {played ? (
              <span className="inline-flex items-center gap-1.5">
                {isLive && <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />}
                <span className={winner === 2 ? "font-normal text-muted" : undefined}>{score1}</span>
                <span className="text-muted">&ndash;</span>
                <span className={winner === 1 ? "font-normal text-muted" : undefined}>{score2}</span>
              </span>
            ) : (
              <span className="text-xs font-medium uppercase text-muted">vs</span>
            )}
          </span>
          {!played && hint && (
            <span className="whitespace-nowrap text-[10px] leading-none text-muted">{hint}</span>
          )}
        </span>
        <ManagerLabel manager={manager2} align="right" dimmed={winner === 1} />
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
  dimmed = false,
}: {
  manager: FixtureEntry["manager1"];
  align: "left" | "right";
  /** The losing side of a finished fixture -- receded, not hidden. */
  dimmed?: boolean;
}) {
  return (
    <Link
      href={`/manager/${manager.id}`}
      onClick={(e) => e.stopPropagation()}
      className={`flex min-w-0 flex-1 items-center gap-2 hover:text-accent-strong ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      } ${dimmed ? "text-muted" : ""}`}
    >
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: manager.accentColor }} />
      <span className="flex min-w-0 items-baseline gap-1.5 truncate">
        <span className="truncate">{manager.teamName}</span>
        <span className="shrink-0 text-[10px] font-semibold uppercase text-muted">{manager.initials}</span>
      </span>
    </Link>
  );
}
