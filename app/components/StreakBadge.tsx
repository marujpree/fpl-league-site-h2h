type StreakBadgeProps = {
  streak: { type: "W" | "D" | "L"; count: number } | null;
};

const STREAK_STYLES: Record<"W" | "D" | "L", { label: string; className: string }> = {
  W: { label: "Winning", className: "border-win/40 bg-win/10 text-win" },
  D: { label: "Drawing", className: "border-card-border bg-background-elevated text-muted" },
  L: { label: "Losing", className: "border-loss/40 bg-loss/10 text-loss" },
};

export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (!streak) {
    return (
      <span className="inline-flex items-center rounded-full border border-card-border px-3 py-1 text-xs font-semibold text-muted">
        No results yet
      </span>
    );
  }

  const style = STREAK_STYLES[streak.type];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${style.className}`}
    >
      {style.label} streak &middot; {streak.count} GW
    </span>
  );
}
