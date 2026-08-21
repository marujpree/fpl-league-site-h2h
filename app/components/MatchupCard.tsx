"use client";

import { useState } from "react";
import Link from "next/link";
import { getMockSquad, type Manager, type MatchupSummary, type MockPlayerLine } from "./mock-data";

type MatchupCardProps = {
  matchup: MatchupSummary;
};

export default function MatchupCard({ matchup }: MatchupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { manager1, manager2, score1, score2, isLive, isProvisional } = matchup;

  const manager1Winning = isLive && score1 > score2;
  const manager2Winning = isLive && score2 > score1;

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Gameweek {matchup.gameweek}
        </span>
        <div className="flex items-center gap-2">
          {isProvisional && (
            <span className="rounded-full border border-card-border bg-background-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Provisional
            </span>
          )}
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-live">
              <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
        <ScoreSide teamName={manager1.teamName} ownerName={manager1.displayName} color={manager1.accentColor} winning={manager1Winning} align="right" />

        <div className="flex items-center gap-2 px-1 text-2xl font-extrabold tabular-nums sm:text-3xl">
          <span className={manager1Winning ? "pl-glow-win" : "text-foreground"}>{score1}</span>
          <span className="text-muted">&ndash;</span>
          <span className={manager2Winning ? "pl-glow-win" : "text-foreground"}>{score2}</span>
        </div>

        <ScoreSide teamName={manager2.teamName} ownerName={manager2.displayName} color={manager2.accentColor} winning={manager2Winning} align="left" />
      </div>

      <div className="flex justify-center gap-4 px-4 pb-1 text-xs">
        <Link href={`/manager/${manager1.id}`} className="text-muted hover:text-accent-strong">
          View {manager1.teamName}
        </Link>
        <Link href={`/manager/${manager2.id}`} className="text-muted hover:text-accent-strong">
          View {manager2.teamName}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-center gap-1.5 border-t border-card-border py-2.5 text-xs font-semibold text-muted transition-colors hover:bg-background-elevated hover:text-foreground"
      >
        {expanded ? "Hide" : "Show"} player breakdown
        <svg
          aria-hidden
          viewBox="0 0 12 8"
          className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
        >
          <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-px bg-card-border">
          <SquadTable manager={manager1} total={score1} />
          <SquadTable manager={manager2} total={score2} />
        </div>
      )}
    </div>
  );
}

function ScoreSide({
  teamName,
  ownerName,
  color,
  winning,
  align,
}: {
  teamName: string;
  ownerName: string;
  color: string;
  winning: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 flex-col ${align === "right" ? "items-end text-right" : "items-start text-left"}`}
      style={winning ? { filter: "drop-shadow(0 0 8px rgba(34,197,94,0.45))" } : undefined}
    >
      <span
        className="mb-1 h-1 w-8 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="truncate text-sm font-bold text-foreground sm:text-base">{teamName}</span>
      <span className="truncate text-[11px] text-muted">{ownerName}</span>
    </div>
  );
}

function SquadTable({ manager, total }: { manager: Manager; total: number }) {
  const players: MockPlayerLine[] = getMockSquad(manager, total);

  return (
    <div className="bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: manager.accentColor }} />
        <span className="truncate text-xs font-semibold text-foreground">{manager.teamName}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {players.map((player) => (
          <li key={player.name} className="flex items-center justify-between text-xs">
            <span className="text-muted">
              <span className="mr-1.5 inline-block w-8 text-[10px] font-semibold uppercase text-foreground/50">
                {player.position}
              </span>
              {player.name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">{player.points}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
