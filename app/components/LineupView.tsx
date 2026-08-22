"use client";

import { useState } from "react";
import PitchView from "./PitchView";
import PlayerAvatar from "./PlayerAvatar";
import { clubBadgeUrl } from "@/lib/player-images";
import type { GameweekLineup, LineupPlayer } from "@/lib/fpl-types";

const STATUS_LABEL: Record<string, string> = {
  i: "Injured",
  d: "Doubtful",
  s: "Suspended",
  u: "Unavailable",
};

export default function LineupView({ lineup, gameweek }: { lineup: GameweekLineup | null; gameweek: number | null }) {
  const [view, setView] = useState<"pitch" | "list">("pitch");

  if (!gameweek) {
    return (
      <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
        Season hasn&apos;t started yet.
      </p>
    );
  }

  if (!lineup) {
    return (
      <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
        Lineup for Gameweek {gameweek} isn&apos;t locked in yet — check back after the deadline.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-accent-strong px-6 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Latest Points</p>
        <p className="text-4xl font-extrabold tabular-nums text-white">{lineup.totalPoints}</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-card-border bg-background-elevated p-1">
        <button
          type="button"
          onClick={() => setView("pitch")}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            view === "pitch" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          Pitch View
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          List View
        </button>
      </div>

      {view === "pitch" ? (
        <PitchView lineup={lineup} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-card-border">
            <div className="bg-background-elevated px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Starting XI
            </div>
            <ul className="divide-y divide-card-border">
              {lineup.starting.map((player) => (
                <PlayerRow key={player.id} player={player} />
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl border border-card-border">
            <div className="bg-background-elevated px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Bench
            </div>
            <ul className="divide-y divide-card-border">
              {lineup.bench.map((player) => (
                <PlayerRow key={player.id} player={player} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player }: { player: LineupPlayer }) {
  const fixture = player.fixtures[0];
  const isLive = fixture ? fixture.started && !fixture.finished : false;

  return (
    <li className="flex items-center gap-3 bg-card px-4 py-2 text-sm">
      <PlayerAvatar photoCode={player.photoCode} position={player.position} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span className="w-9 shrink-0 text-xs font-semibold uppercase text-muted">{player.position}</span>
          <span className="truncate font-medium text-foreground">{player.name}</span>
          <img
            src={clubBadgeUrl(player.clubCode)}
            alt=""
            width={14}
            height={14}
            loading="lazy"
            className="h-3.5 w-3.5 shrink-0"
          />
          {player.isCaptain && (
            <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-strong">
              C
            </span>
          )}
          {player.isViceCaptain && (
            <span className="shrink-0 rounded-full border border-card-border px-1.5 py-0.5 text-[10px] font-bold text-muted">
              VC
            </span>
          )}
          {player.status !== "a" && (
            <span className="shrink-0 rounded-full bg-loss/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-loss">
              {STATUS_LABEL[player.status] ?? player.status}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 pl-11 text-xs text-muted">
          {isLive && <span className="pl-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />}
          {fixture ? `${fixture.opponentShortName} (${fixture.isHome ? "H" : "A"})` : "No fixture"}
        </span>
      </span>
      <span className="shrink-0 tabular-nums text-sm font-bold text-foreground">{player.livePoints} pts</span>
    </li>
  );
}
