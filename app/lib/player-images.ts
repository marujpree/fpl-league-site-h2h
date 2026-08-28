// Official Premier League image CDN, no auth required — the same URLs
// fantasy.premierleague.com itself uses. Keyed by `element.code` from
// bootstrap-static (NOT `element.id`, which is season-scoped).
//
// About stale kits: these are the PL's own studio headshots, and the PL
// only reshoots a player after their new club's media day. A summer signing
// can therefore sit in their old club's shirt on the official CDN for weeks
// into the season — that's upstream, not something this app can compute
// away. `PHOTO_OVERRIDES` below is the escape hatch for the handful of
// players where that's worth fixing by hand.
//
// (There is no usable public alternative: Futbin/FUT and the FIFA/EA card
// databases have no public API, license their artwork, and key off EA's own
// player ids with no published mapping from FPL's. Anything built on them
// means scraping plus hand-maintaining a ~600-row id map, and it breaks
// every time either side renumbers.)

const CDN = "https://resources.premierleague.com/premierleague";

/** Manual pins for players whose official photo is wrong or missing.
 * Keyed by FPL `element.code`; the value is any absolute image URL.
 * Anything listed here wins over the CDN. */
export const PHOTO_OVERRIDES: Record<number, string> = {};

/**
 * Photo URLs to try, best first. 250x250 is the current-season asset the
 * PL refreshes; 110x140 is the older archive, which is sometimes the only
 * size present for a fringe player. PlayerAvatar walks this list and falls
 * back to a position tile if every source fails.
 */
export function playerPhotoSources(photoCode: number): string[] {
  const override = PHOTO_OVERRIDES[photoCode];
  return [
    ...(override ? [override] : []),
    `${CDN}/photos/players/250x250/p${photoCode}.png`,
    `${CDN}/photos/players/110x140/p${photoCode}.png`,
  ];
}

/** The single best photo URL for a player — use playerPhotoSources() where
 * you can fall back on error. */
export function playerPhotoUrl(photoCode: number): string {
  return playerPhotoSources(photoCode)[0];
}

export function clubBadgeUrl(clubCode: number): string {
  return `${CDN}/badges/70/t${clubCode}.png`;
}
