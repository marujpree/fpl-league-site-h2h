"use client";

import { useState } from "react";
import Link from "next/link";
import HeadToHeadSummary from "./HeadToHeadSummary";
import type { MatchupSummary } from "@/lib/fpl-types";

type MatchupCardProps = {
  matchup: MatchupSummary;
  /** True for ~2s right after this matchup's live lead changes hands --
   * plays a one-shot highlight ring instead of a static re-render. */
  leadJustFlipped?: boolean;
};

export default function MatchupCard({ matchup, leadJustFlipped }: MatchupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { manager1, manager2, score1, score2, isLive, isProvisional, headToHead } = matchup;
  const played = score1 !== undefined && score2 !== undefined;

  const manager1Winning = played && isLive && score1! > score2!;
  const manager2Winning = played && isLive && score2! > score1!;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-card-border bg-card ${leadJustFlipped ? "pl-flip-flash" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 sm:px-4 sm:pt-3">
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
        <ScoreSide teamName={manager1.teamName} ownerName={manager1.displayName} color={manager1.accentColor} winning={manager1Winning} align="right" />

        {played ? (
          <div className="flex items-center gap-1.5 px-1 text-xl font-extrabold tabular-nums sm:gap-2 sm:text-3xl">
            <span className={manager1Winning ? "pl-glow-win" : "text-foreground"}>{score1}</span>
            <span className="text-muted">&ndash;</span>
            <span className={manager2Winning ? "pl-glow-win" : "text-foreground"}>{score2}</span>
          </div>
        ) : (
          <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">vs</div>
        )}

        <ScoreSide teamName={manager2.teamName} ownerName={manager2.displayName} color={manager2.accentColor} winning={manager2Winning} align="left" />
      </div>

      <div className="flex justify-center gap-4 px-3 pb-1 text-xs sm:px-4">
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
        {expanded ? "Hide" : "Show"} head-to-head
        <svg
          aria-hidden
          viewBox="0 0 12 8"
          className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
        >
          <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && headToHead && (
        <div className="border-t border-card-border px-4 py-3">
          <HeadToHeadSummary manager1={manager1} manager2={manager2} record={headToHead} />
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
      style={winning ? { filter: "drop-shadow(0 0 8px rgba(22,163,74,0.4))" } : undefined}
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

