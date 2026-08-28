"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import { clubBadgeUrl } from "@/lib/player-images";
import type { PlayerListEntry } from "@/lib/fpl-types";

const POSITIONS = ["ALL", "GKP", "DEF", "MID", "FWD"] as const;
type PositionFilter = (typeof POSITIONS)[number];

const PAGE_SIZE_OPTIONS = [25, 50, 100, "all"] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export default function PlayersView({ players }: { players: PlayerListEntry[] }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<PositionFilter>("ALL");
  const [freeAgentsOnly, setFreeAgentsOnly] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(50);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => (position === "ALL" ? true : p.position === position))
      .filter((p) => (freeAgentsOnly ? p.owner === null : true))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.seasonPoints - a.seasonPoints);
  }, [players, query, position, freeAgentsOnly]);

  // Any change to what's being filtered should reset back to page 1 rather
  // than leaving the user stranded on a now-out-of-range page. Adjusting
  // state during render (React's documented pattern for this) instead of
  // an effect, so it happens in the same commit as the filter change.
  const filterKey = `${query}|${position}|${freeAgentsOnly}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const visible =
    pageSize === "all" ? filtered : filtered.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search players…"
        className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-card-border bg-card p-1">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPosition(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                position === p ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <input
            type="checkbox"
            checked={freeAgentsOnly}
            onChange={(e) => setFreeAgentsOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-card-border accent-[var(--accent)]"
          />
          Free agents only
        </label>

        <div className="flex items-center gap-1 rounded-lg border border-card-border bg-card p-1">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setPageSize(size)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                pageSize === size ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {size === "all" ? "All" : size}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted">{filtered.length} players</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-card-border">
        <ul className="divide-y divide-card-border">
          {visible.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
        </ul>
        {filtered.length === 0 && (
          <p className="bg-card p-6 text-center text-sm text-muted">No players match.</p>
        )}
      </div>

      {pageSize !== "all" && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage <= 0}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-card-border text-muted transition-colors hover:bg-background-elevated hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            &larr;
          </button>
          <span className="text-xs text-muted">
            Page {clampedPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clampedPage >= totalPages - 1}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-card-border text-muted transition-colors hover:bg-background-elevated hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player }: { player: PlayerListEntry }) {
  return (
    <li className="flex items-center gap-3 bg-card px-4 py-2 text-sm">
      <PlayerAvatar photoCode={player.photoCode} position={player.position} clubCode={player.clubCode} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span className="w-9 shrink-0 text-xs font-semibold uppercase text-muted">{player.position}</span>
          <span className="truncate font-medium text-foreground">{player.name}</span>
          <img
            src={clubBadgeUrl(player.clubCode)}
            alt=""
            width={14}
            height={14}
            loading="lazy"
            className="h-3.5 w-3.5 shrink-0"
          />
          <span className="shrink-0 text-xs text-muted">{player.club}</span>
        </span>
        <span className="pl-11">
          {player.owner ? (
            <Link href={`/manager/${player.owner.id}`} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: player.owner.accentColor }}
              />
              <span className="truncate text-xs font-medium text-muted hover:text-accent-strong">
                {player.owner.teamName}
              </span>
            </Link>
          ) : (
            <span className="text-xs font-medium text-muted">Free agent</span>
          )}
        </span>
      </span>
      <span className="shrink-0 tabular-nums text-xs font-semibold text-foreground">{player.seasonPoints} pts</span>
    </li>
  );
}
