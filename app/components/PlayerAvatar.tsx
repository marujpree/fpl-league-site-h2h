"use client";

import { useState } from "react";
import { playerPhotoUrl } from "@/lib/player-images";

type PlayerAvatarProps = {
  photoCode: number;
  position: string;
};

/** Some players (recent transfers, new signings) don't have a photo
 * uploaded to the PL's CDN yet -- that endpoint 403s for them. Falls back
 * to a plain position-badge tile instead of a broken image icon. */
export default function PlayerAvatar({ photoCode, position }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className="flex h-9 w-7 shrink-0 items-center justify-center rounded bg-background-elevated text-[9px] font-semibold uppercase text-muted"
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
      className="h-9 w-7 shrink-0 rounded bg-background-elevated object-cover object-top"
    />
  );
}
