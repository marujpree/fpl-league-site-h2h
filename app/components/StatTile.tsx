type StatTileProps = {
  label: string;
  value: string | number;
  detail?: string;
  accent?: string;
};

export default function StatTile({ label, value, detail, accent }: StatTileProps) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className="mt-1 text-2xl font-extrabold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </div>
  );
}
