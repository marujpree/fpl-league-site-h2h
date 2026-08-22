import PlayerAvatar from "./PlayerAvatar";
import type { CaptainTip as CaptainTipData } from "@/lib/data";

export default function CaptainTip({ tip }: { tip: CaptainTipData | null }) {
  if (!tip) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3">
      <PlayerAvatar photoCode={tip.photoCode} position="?" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Captain tip</p>
        <p className="truncate text-sm font-semibold text-foreground">
          {tip.name} <span className="font-normal text-muted">({tip.club})</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-extrabold tabular-nums text-foreground">{tip.form}</p>
        <p className="text-[10px] text-muted">pts/match</p>
      </div>
    </div>
  );
}
