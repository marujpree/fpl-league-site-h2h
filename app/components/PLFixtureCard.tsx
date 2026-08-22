"use client";

import { useState } from "react";
import { clubBadgeUrl } from "@/lib/player-images";
import type { PLFixtureRow, PLFixtureTeam } from "@/lib/data";

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PLFixtureCard({ fixture }: { fixture: PLFixtureRow }) {
  const { home, away, homeScore, awayScore, started, finished, kickoff } = fixture;
  const played = homeScore !== null && awayScore !== null;
  const isLive = started && !finished;

  const homeWinning = played && isLive && homeScore! > awayScore!;
  const awayWinning = played && isLive && awayScore! > homeScore!;

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card">
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 sm:px-4 sm:pt-3">
        <span className="text-xs font-medium text-muted">{formatKickoff(kickoff)}</span>
        {finished ? (
          <span className="rounded-full border border-card-border bg-background-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            FT
          </span>
        ) : isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-live">
            <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
            Live
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
        <TeamSide team={home} winning={homeWinning} align="right" />

        {played ? (
          <div className="flex items-center gap-1.5 px-1 text-xl font-extrabold tabular-nums sm:gap-2 sm:text-3xl">
            <span className={homeWinning ? "pl-glow-win" : "text-foreground"}>{homeScore}</span>
            <span className="text-muted">&ndash;</span>
            <span className={awayWinning ? "pl-glow-win" : "text-foreground"}>{awayScore}</span>
          </div>
        ) : (
          <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">vs</div>
        )}

        <TeamSide team={away} winning={awayWinning} align="left" />
      </div>
    </div>
  );
}

function TeamSide({
  team,
  winning,
  align,
}: {
  team: PLFixtureTeam;
  winning: boolean;
  align: "left" | "right";
}) {
  const [badgeFailed, setBadgeFailed] = useState(false);

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : "text-left"}`}
      style={winning ? { filter: "drop-shadow(0 0 8px rgba(22,163,74,0.4))" } : undefined}
    >
      {badgeFailed ? (
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background-elevated text-[9px] font-semibold uppercase text-muted sm:h-7 sm:w-7"
        >
          {team.shortName.slice(0, 3)}
        </span>
      ) : (
        <img
          src={clubBadgeUrl(team.code)}
          alt=""
          aria-hidden
          width={28}
          height={28}
          loading="lazy"
          onError={() => setBadgeFailed(true)}
          className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
        />
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-bold text-foreground sm:text-base">{team.shortName}</span>
        <span className="hidden truncate text-[11px] text-muted sm:block">{team.name}</span>
      </div>
    </div>
  );
}
