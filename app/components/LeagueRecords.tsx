import Link from "next/link";
import type { LeagueRecords as LeagueRecordsData } from "@/lib/data";

export default function LeagueRecords({ records }: { records: LeagueRecordsData }) {
  const { highestGwScore, longestWinStreak, biggestBlowout } = records;

  if (!highestGwScore && !longestWinStreak && !biggestBlowout) {
    return (
      <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
        No finished gameweeks yet — records will show up once results start rolling in.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {highestGwScore && (
        <RecordTile
          label="Highest GW score"
          value={`${highestGwScore.points} pts`}
          detail={`${highestGwScore.manager.teamName} · GW${highestGwScore.gameweek}`}
          managerId={highestGwScore.manager.id}
        />
      )}
      {longestWinStreak && (
        <RecordTile
          label="Longest win streak"
          value={`${longestWinStreak.count} GW${longestWinStreak.count === 1 ? "" : "s"}`}
          detail={longestWinStreak.manager.teamName}
          managerId={longestWinStreak.manager.id}
        />
      )}
      {biggestBlowout && (
        <RecordTile
          label="Biggest blowout"
          value={`${biggestBlowout.margin} pts`}
          detail={`${biggestBlowout.winner.teamName} over ${biggestBlowout.loser.teamName} · GW${biggestBlowout.gameweek}`}
          managerId={biggestBlowout.winner.id}
        />
      )}
    </div>
  );
}

function RecordTile({
  label,
  value,
  detail,
  managerId,
}: {
  label: string;
  value: string;
  detail: string;
  managerId: string;
}) {
  return (
    <Link
      href={`/manager/${managerId}`}
      className="rounded-xl border border-card-border bg-card p-4 transition-colors hover:border-accent"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{detail}</p>
    </Link>
  );
}
