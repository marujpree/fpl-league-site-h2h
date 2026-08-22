"use client";

import { useState } from "react";
import { playerPhotoUrl } from "@/lib/player-images";

type PlayerAvatarProps = {
  photoCode: number;
  position: string;
  size?: "sm" | "lg";
};

const SIZE_CLASSES: Record<"sm" | "lg", string> = {
  sm: "h-9 w-7",
  lg: "h-16 w-12 sm:h-20 sm:w-16",
};

/** Some players (recent transfers, new signings) don't have a photo
 * uploaded to the PL's CDN yet -- that endpoint 403s for them. Falls back
 * to a plain position-badge tile instead of a broken image icon. */
export default function PlayerAvatar({ photoCode, position, size = "sm" }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (failed) {
    return (
      <span
        aria-hidden
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded bg-background-elevated text-[9px] font-semibold uppercase text-muted`}
      >
        {position}
      </span>
    );
  }

  return (
    <img
      src={playerPhotoUrl(photoCode)}
      alt=""
      width={28}
      height={36}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${sizeClass} shrink-0 rounded bg-background-elevated object-cover object-top`}
    />
  );
}
