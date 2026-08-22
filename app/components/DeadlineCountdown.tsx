"use client";

import { useEffect, useState } from "react";
import type { UpcomingDeadline } from "@/lib/data";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Locked";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DeadlineCountdown({ deadline }: { deadline: UpcomingDeadline | null }) {
  // Stays null until after mount -- avoids calling Date.now() during render
  // (which would differ between the server and client render) and shows a
  // deterministic absolute time in the meanwhile instead.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;

    function tick() {
      setNow(Date.now());
    }

    const deadlineMs = new Date(deadline.deadlineTime).getTime();
    const msRemaining = deadlineMs - Date.now();
    // Tick every second once inside the final hour so it feels alive right
    // before lock, otherwise once a minute is plenty.
    const intervalMs = msRemaining < 60 * 60 * 1000 ? 1000 : 60_000;

    const immediate = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, [deadline]);

  if (!deadline) return null;

  const deadlineMs = new Date(deadline.deadlineTime).getTime();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-card-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="pl-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />
        <span className="text-sm text-muted">Gameweek {deadline.gameweek} deadline</span>
      </div>
      <span className="text-lg font-extrabold tabular-nums text-foreground">
        {now === null ? formatAbsolute(deadline.deadlineTime) : formatRemaining(deadlineMs - now)}
      </span>
    </div>
  );
}
