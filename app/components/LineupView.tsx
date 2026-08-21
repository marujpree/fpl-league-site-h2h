import PlayerAvatar from "./PlayerAvatar";
import { clubBadgeUrl } from "@/lib/player-images";
import type { GameweekLineup, LineupPlayer } from "@/lib/fpl-types";

export default function LineupView({ lineup, gameweek }: { lineup: GameweekLineup | null; gameweek: number | null }) {
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
  );
}

function PlayerRow({ player }: { player: LineupPlayer }) {
  return (
    <li className="flex items-center gap-3 bg-card px-4 py-2 text-sm">
      <PlayerAvatar photoCode={player.photoCode} position={player.position} />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
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
        <span className="shrink-0 text-xs text-muted">{player.club}</span>
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
      </span>
      <span className="shrink-0 tabular-nums text-xs text-muted">{player.seasonPoints} pts</span>
    </li>
  );
}
