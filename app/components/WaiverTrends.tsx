import { clubBadgeUrl } from "@/lib/player-images";
import type { WaiverTrendPlayer, WaiverTrends as WaiverTrendsData } from "@/lib/data";

export default function WaiverTrends({ trends }: { trends: WaiverTrendsData }) {
  if (trends.gameweek === null || (trends.mostAdded.length === 0 && trends.mostDropped.length === 0)) {
    return null;
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Waiver Wire Trends &middot; Gameweek {trends.gameweek}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrendList label="Most added" players={trends.mostAdded} accentClass="text-win" />
        <TrendList label="Most dropped" players={trends.mostDropped} accentClass="text-loss" />
      </div>
    </div>
  );
}

function TrendList({
  label,
  players,
  accentClass,
}: {
  label: string;
  players: WaiverTrendPlayer[];
  accentClass: string;
}) {
  if (players.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium text-muted">{label}</p>
        <p className="text-xs text-muted">Nothing yet</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">{label}</p>
      <ul className="flex flex-col gap-1.5">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <img src={clubBadgeUrl(p.clubCode)} alt="" width={14} height={14} loading="lazy" className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
            <span className={`shrink-0 text-xs font-semibold tabular-nums ${accentClass}`}>
              {p.count}&times;
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
