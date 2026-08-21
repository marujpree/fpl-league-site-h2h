"use client";

import { useEffect, useState } from "react";
import MatchupCard from "./MatchupCard";
import type { MatchupSummary } from "@/lib/fpl-types";

const POLL_INTERVAL_MS = 60_000;

type LiveGameweekViewProps = {
  matchups: MatchupSummary[];
  gameweekId: number | null;
  gameweekFinished: boolean;
};

type LiveScoresResponse = {
  gameweek: number | null;
  scores: { manager_id: string; current_points: number }[];
};

export default function LiveGameweekView({ matchups, gameweekId, gameweekFinished }: LiveGameweekViewProps) {
  const [liveScores, setLiveScores] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!gameweekId || gameweekFinished) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/live?gameweek=${gameweekId}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: LiveScoresResponse = await res.json();
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const row of data.scores) next[row.manager_id] = row.current_points;
        setLiveScores(next);
        setLastUpdated(new Date());
      } catch {
        // Network hiccup — next poll will retry. Not worth surfacing to the UI.
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [gameweekId, gameweekFinished]);

  const liveMatchups: MatchupSummary[] = matchups.map((m) => {
    const live1 = liveScores[m.manager1.id];
    const live2 = liveScores[m.manager2.id];
    if (live1 === undefined && live2 === undefined) return m;
    return {
      ...m,
      score1: live1 ?? m.score1,
      score2: live2 ?? m.score2,
      isLive: true,
    };
  });

  const hasLiveData = Object.keys(liveScores).length > 0;

  return (
    <div className="flex flex-col gap-3">
      {hasLiveData && lastUpdated && (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="pl-pulse-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
          Live scores updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {liveMatchups.map((matchup) => (
          <MatchupCard key={`${matchup.manager1.id}-${matchup.manager2.id}`} matchup={matchup} />
        ))}
      </div>
    </div>
  );
}
