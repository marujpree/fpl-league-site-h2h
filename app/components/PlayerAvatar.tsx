"use client";

import { useState } from "react";
import { clubBadgeUrl, playerPhotoSources } from "@/lib/player-images";

type PlayerAvatarProps = {
  photoCode: number;
  position: string;
  /** Falls back to this club's badge when the player has no photo on the
   * PL's CDN -- which is true of a surprising share of the squad (fringe
   * players, academy call-ups, mid-window signings). */
  clubCode?: number;
  size?: "sm" | "lg";
};

const SIZE_CLASSES: Record<"sm" | "lg", string> = {
  sm: "h-9 w-7",
  lg: "h-16 w-12 sm:h-20 sm:w-16",
};

/**
 * Player headshot, degrading gracefully: current-season 250x250 photo, then
 * the older 110x140 archive (the only size the PL kept for some players),
 * then the club badge, then a plain position tile. Every step of that chain
 * is load-tested at runtime via `onError` rather than assumed, because the
 * CDN answers 403 — not 404 — for players it has no image for.
 */
export default function PlayerAvatar({ photoCode, position, clubCode, size = "sm" }: PlayerAvatarProps) {
  const photos = playerPhotoSources(photoCode);
  const sources = clubCode ? [...photos, clubBadgeUrl(clubCode)] : photos;
  const [attempt, setAttempt] = useState(0);
  const sizeClass = SIZE_CLASSES[size];

  if (attempt >= sources.length) {
    return (
      <span
        aria-hidden
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded bg-background-elevated text-[9px] font-semibold uppercase text-muted`}
      >
        {position}
      </span>
    );
  }

  const isBadge = attempt >= photos.length;

  return (
    <img
      // Keyed by source so a failed load actually re-requests the next URL
      // rather than React reusing the element with a swapped src.
      key={sources[attempt]}
      src={sources[attempt]}
      alt=""
      width={28}
      height={36}
      loading="lazy"
      onError={() => setAttempt((n) => n + 1)}
      className={`${sizeClass} shrink-0 rounded bg-background-elevated ${
        isBadge ? "object-contain p-1.5" : "object-cover object-top"
      }`}
    />
  );
}
