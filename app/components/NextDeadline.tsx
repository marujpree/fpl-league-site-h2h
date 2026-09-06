"use client";

import { useEffect, useState } from "react";
import type { UpcomingDeadline } from "@/lib/data";

/** A date and time with the zone named, so it's unambiguous -- "Sat, Sep 12,
 * 7:30 AM CDT" rather than "6d 14h 26m". A countdown answers "how long?";
 * this answers "when?", which is the one you can plan around. */
function formatMoment(iso: string, timeZone?: string): string {
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

/** The three locks that matter in a draft league, not just the lineup one.
 * FPL hands us all three on the same request and only the deadline was ever
 * shown; in a draft league the trade and waiver cutoffs are arguably the
 * ones you can still act on. Sorted by time rather than hardcoded, since
 * FPL's ordering is its own business. */
function milestones(deadline: UpcomingDeadline) {
  return [
    { key: "trades", label: "Trades close", time: deadline.tradesTime },
    { key: "waivers", label: "Waivers process", time: deadline.waiversTime },
    { key: "lineups", label: "Lineups lock", time: deadline.deadlineTime },
  ]
    .filter((m) => Boolean(m.time))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export default function NextDeadline({ deadline }: { deadline: UpcomingDeadline | null }) {
  // Server and browser sit in different time zones, so formatting in local
  // time during render would hydrate mismatched text. Both sides render UTC
  // first -- deterministic, identical -- and the browser swaps in its own
  // zone on mount, which is also when it can safely know what's already
  // passed. Same shape either way, so nothing moves.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(id);
  }, []);

  if (!deadline) return null;
  const mounted = now !== null;

  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Gameweek {deadline.gameweek}
      </p>
      <ul className="flex flex-col gap-1.5">
        {milestones(deadline).map((m) => {
          const passed = mounted && new Date(m.time).getTime() <= now;
          return (
            <li
              key={m.key}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
            >
              <span className={passed ? "text-muted line-through" : "text-muted"}>
                {m.label}
                {passed && <span className="sr-only"> (already passed)</span>}
              </span>
              <time
                dateTime={m.time}
                className={`tabular-nums ${
                  passed ? "text-muted line-through" : "font-bold text-foreground"
                }`}
              >
                {formatMoment(m.time, mounted ? undefined : "UTC")}
              </time>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
