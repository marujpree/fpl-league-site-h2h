import Link from "next/link";
import type { Manager, PairRecord } from "@/lib/fpl-types";

type HeadToHeadSummaryProps = {
  manager1: Manager;
  manager2: Manager;
  record: PairRecord;
};

export default function HeadToHeadSummary({ manager1, manager2, record }: HeadToHeadSummaryProps) {
  const { manager1Wins, draws, manager2Wins, meetings } = record;

  if (meetings === 0) {
    return (
      <p className="py-1 text-center text-xs text-muted">
        No previous meetings between {manager1.teamName} and {manager2.teamName} this season.
      </p>
    );
  }

  let headline: string;
  if (manager1Wins === manager2Wins) {
    headline = `Level at ${manager1Wins}-${draws}-${manager2Wins}`;
  } else if (manager1Wins > manager2Wins) {
    headline = `${manager1.initials} leads ${manager1Wins}-${draws}-${manager2Wins}`;
  } else {
    headline = `${manager2.initials} leads ${manager2Wins}-${draws}-${manager1Wins}`;
  }

  return (
    <div className="flex flex-col items-center gap-1 py-1 text-center">
      <p className="text-sm font-semibold text-foreground">{headline}</p>
      <p className="text-xs text-muted">
        {meetings} meeting{meetings === 1 ? "" : "s"} this season &middot;{" "}
        <Link href={`/manager/${manager1.id}`} className="hover:text-accent-strong">
          {manager1.teamName}
        </Link>{" "}
        vs{" "}
        <Link href={`/manager/${manager2.id}`} className="hover:text-accent-strong">
          {manager2.teamName}
        </Link>
      </p>
    </div>
  );
}
