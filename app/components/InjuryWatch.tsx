import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import type { InjuryWatchEntry } from "@/lib/data";

const STATUS_LABEL: Record<string, string> = {
  i: "Injured",
  d: "Doubtful",
  s: "Suspended",
  u: "Unavailable",
};

export default function InjuryWatch({ entries }: { entries: InjuryWatchEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
        Clean bill of health — nobody&apos;s squad has an injury flag right now.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border">
      <ul className="divide-y divide-card-border">
        {entries.map(({ manager, players }) => (
          <li key={manager.id} className="bg-card px-4 py-3">
            <Link href={`/manager/${manager.id}`} className="mb-2 flex items-center gap-2 hover:text-accent-strong">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: manager.accentColor }}
              />
              <span className="text-sm font-semibold text-foreground">{manager.teamName}</span>
            </Link>
            <ul className="flex flex-col gap-2">
              {players.map((player) => (
                <li key={player.id} className="flex items-center gap-2.5 pl-4">
                  <PlayerAvatar photoCode={player.photoCode} position={player.position} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{player.name}</span>
                  <span className="shrink-0 rounded-full bg-loss/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-loss">
                    {STATUS_LABEL[player.status] ?? player.status}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
