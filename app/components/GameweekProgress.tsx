"use client";

import { useEffect, useState } from "react";
import type { GameweekStatus } from "@/lib/gameweek-state";

/** How many Premier League matches are left in this gameweek, and what
 * that means for the scores on screen. Answers "is this number still going
 * to move?" without making anyone go and check the fixture list. */
export default function GameweekProgress({ status }: { status: GameweekStatus }) {
  // Kickoff times render in UTC until mount, then in the viewer's own
  // timezone -- same trick as DeadlineCountdown, so the server and client
  // first render agree and there's no hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  if (status.totalMatches === 0) return null;

  const toPlay = status.remainingMatches + status.inPlayMatches;
  const { tone, headline, detail } = describe(status, mounted);

  const toneClasses =
    tone === "live"
      ? "border-live/30 bg-live/10 text-live"
      : tone === "done"
        ? "border-win/30 bg-win/10 text-win"
        : "border-card-border bg-card text-muted";

  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border px-3 py-2.5 text-xs font-medium sm:px-4 ${toneClasses}`}>
      <span className="flex items-center gap-1.5">
        {tone === "live" && <span className="pl-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />}
        {headline}
      </span>
      {detail && <span className="opacity-80">{detail}</span>}

      {/* Matches played, as a bar. Reads at a glance on mobile where the
          text above wraps. */}
      <span className="flex w-full items-center gap-2" aria-hidden>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-current/15">
          <span
            className="block h-full rounded-full bg-current transition-[width] duration-500"
            style={{ width: `${(status.finishedMatches / status.totalMatches) * 100}%` }}
          />
        </span>
        <span className="shrink-0 tabular-nums opacity-80">
          {status.finishedMatches}/{status.totalMatches}
        </span>
      </span>

      <span className="sr-only">
        {toPlay} of {status.totalMatches} matches still to play.
      </span>
    </div>
  );
}

function describe(status: GameweekStatus, mounted: boolean) {
  const toPlay = status.remainingMatches + status.inPlayMatches;
  const plural = (n: number) => (n === 1 ? "match" : "matches");

  if (status.isComplete) {
    return {
      tone: "done" as const,
      headline: `Gameweek complete — all ${status.totalMatches} ${plural(status.totalMatches)} played`,
      detail: "Scores are final.",
    };
  }

  if (!status.hasStarted) {
    return {
      tone: "idle" as const,
      headline: `${status.totalMatches} ${plural(status.totalMatches)} to play`,
      detail: status.firstKickoff
        ? `First kickoff ${formatTime(status.firstKickoff, mounted)}`
        : undefined,
    };
  }

  if (status.allMatchesFinished) {
    return {
      tone: "live" as const,
      headline: `All ${status.totalMatches} ${plural(status.totalMatches)} played`,
      detail: status.completesAt
        ? `Bonus points still settling — final ${formatTime(status.completesAt, mounted)}`
        : "Bonus points still settling.",
    };
  }

  return {
    tone: "live" as const,
    headline: `${toPlay} ${plural(toPlay)} still to play`,
    detail:
      status.inPlayMatches > 0
        ? `${status.inPlayMatches} in play now`
        : status.completesAt
          ? undefined
          : `${status.finishedMatches} of ${status.totalMatches} finished`,
  };
}

function formatTime(iso: string, mounted: boolean): string {
  const date = new Date(iso);
  if (!mounted) {
    // Server render: no locale/timezone to work with, so keep it stable.
    return date.toISOString().slice(11, 16) + " UTC";
  }
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
