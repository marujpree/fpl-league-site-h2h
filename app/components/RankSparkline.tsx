import type { RankHistoryPoint } from "@/lib/fpl-types";

type RankSparklineProps = {
  history: RankHistoryPoint[];
  color: string;
  leagueSize: number;
  width?: number;
  height?: number;
};

/**
 * Lightweight inline-SVG line chart for "rank over time" -- no charting
 * library. Rank 1 (best) is plotted at the top; higher rank numbers sink
 * toward the bottom.
 */
export default function RankSparkline({
  history,
  color,
  leagueSize,
  width = 560,
  height = 180,
}: RankSparklineProps) {
  if (history.length === 0) return null;

  const paddingX = 28;
  const paddingY = 20;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const xFor = (i: number) =>
    paddingX + (history.length === 1 ? innerWidth / 2 : (i / (history.length - 1)) * innerWidth);
  const yFor = (rank: number) =>
    paddingY + ((rank - 1) / Math.max(1, leagueSize - 1)) * innerHeight;

  const points = history.map((point, i) => ({
    x: xFor(i),
    y: yFor(point.rank),
    ...point,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${paddingY + innerHeight} L${points[0].x},${paddingY + innerHeight} Z`;

  const gradientId = `rank-sparkline-fill-${color.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Rank over time, from rank ${history[0].rank} in gameweek ${history[0].gameweek} to rank ${history[history.length - 1].rank} in gameweek ${history[history.length - 1].gameweek}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Reference gridlines: 1st place and last place */}
      <line x1={paddingX} x2={width - paddingX} y1={paddingY} y2={paddingY} stroke="var(--card-border)" strokeWidth="1" />
      <line
        x1={paddingX}
        x2={width - paddingX}
        y1={paddingY + innerHeight}
        y2={paddingY + innerHeight}
        stroke="var(--card-border)"
        strokeWidth="1"
      />
      <text x={0} y={paddingY + 4} className="fill-muted text-[10px]">
        1st
      </text>
      <text x={0} y={paddingY + innerHeight + 4} className="fill-muted text-[10px]">
        {leagueSize}th
      </text>

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p) => (
        <g key={p.gameweek}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} stroke="var(--card)" strokeWidth="1.5" />
          <text x={p.x} y={height - 2} textAnchor="middle" className="fill-muted text-[10px]">
            GW{p.gameweek}
          </text>
        </g>
      ))}
    </svg>
  );
}
