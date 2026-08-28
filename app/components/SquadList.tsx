import PlayerAvatar from "./PlayerAvatar";
import { clubBadgeUrl } from "@/lib/player-images";
import type { SquadPlayer } from "@/lib/fpl-types";

const STATUS_LABEL: Record<string, string> = {
  i: "Injured",
  d: "Doubtful",
  s: "Suspended",
  u: "Unavailable",
};

const POSITION_LABEL: Record<SquadPlayer["position"], string> = {
  GKP: "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

export default function SquadList({ players }: { players: SquadPlayer[] }) {
  if (players.length === 0) {
    return (
      <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
        No squad data available.
      </p>
    );
  }

  const byPosition = new Map<SquadPlayer["position"], SquadPlayer[]>();
  for (const player of players) {
    const list = byPosition.get(player.position) ?? [];
    list.push(player);
    byPosition.set(player.position, list);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border">
      {(["GKP", "DEF", "MID", "FWD"] as const).map((position) => {
        const group = byPosition.get(position);
        if (!group || group.length === 0) return null;
        return (
          <div key={position}>
            <div className="bg-background-elevated px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {POSITION_LABEL[position]}
            </div>
            <ul className="divide-y divide-card-border">
              {group.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 bg-card px-4 py-2 text-sm"
                >
                  <PlayerAvatar photoCode={player.photoCode} position={player.position} clubCode={player.clubCode} />
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
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
                    {player.status !== "a" && (
                      <span className="shrink-0 rounded-full bg-loss/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-loss">
                        {STATUS_LABEL[player.status] ?? player.status}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-muted">{player.seasonPoints} pts</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
