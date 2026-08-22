import PitchPlayerCard from "./PitchPlayerCard";
import type { GameweekLineup, LineupPlayer } from "@/lib/fpl-types";

const ROW_ORDER = ["GKP", "DEF", "MID", "FWD"] as const;

function groupByPosition(players: LineupPlayer[]): Map<LineupPlayer["position"], LineupPlayer[]> {
  const map = new Map<LineupPlayer["position"], LineupPlayer[]>();
  for (const player of players) {
    const list = map.get(player.position) ?? [];
    list.push(player);
    map.set(player.position, list);
  }
  return map;
}

export default function PitchView({ lineup }: { lineup: GameweekLineup }) {
  const rows = groupByPosition(lineup.starting);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden rounded-xl border border-card-border"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #2f9e44 0, #2f9e44 12.5%, #279140 12.5%, #279140 25%)",
        }}
      >
        {/* Halfway line + centre circle -- purely decorative pitch markings */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/25" aria-hidden />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25"
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 px-2 py-6 sm:gap-6 sm:px-4 sm:py-8">
          {ROW_ORDER.map((position) => {
            const players = rows.get(position);
            if (!players || players.length === 0) return null;
            return (
              <div key={position} className="flex flex-wrap items-start justify-evenly gap-2">
                {players.map((player) => (
                  <PitchPlayerCard key={player.id} player={player} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-background-elevated p-3">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Bench</p>
        <div className="flex flex-wrap justify-evenly gap-3 sm:justify-start">
          {lineup.bench.map((player) => (
            <PitchPlayerCard key={player.id} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}
