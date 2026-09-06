"use client";

import { useEffect, useState } from "react";
import type { UpcomingDeadline } from "@/lib/data";

/** The deadline as an actual date and time, with the zone named so it's
 * unambiguous -- "Sat, Sep 12, 1:30 PM CDT" rather than "6d 14h 26m". */
function formatDeadline(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...(timeZone ? { timeZone } : {}),
  });
}

export default function NextDeadline({ deadline }: { deadline: UpcomingDeadline | null }) {
  // Server and browser sit in different time zones, so formatting in local
  // time during render would hydrate mismatched text. Both sides render UTC
  // first -- deterministic, identical -- and the browser swaps in its own
  // zone on mount. Same shape either way, so nothing moves.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  if (!deadline) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-card-border bg-card px-4 py-3">
      <span className="text-sm text-muted">Gameweek {deadline.gameweek} deadline</span>
      <time
        dateTime={deadline.deadlineTime}
        className="text-base font-extrabold tabular-nums text-foreground sm:text-lg"
      >
        {formatDeadline(deadline.deadlineTime, mounted ? undefined : "UTC")}
      </time>
    </div>
  );
}
