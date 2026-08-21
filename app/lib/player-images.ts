// Official Premier League image CDN, no auth required (verified working —
// the same URLs the real fantasy.premierleague.com site itself uses).

export function playerPhotoUrl(photoCode: number): string {
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${photoCode}.png`;
}

export function clubBadgeUrl(clubCode: number): string {
  return `https://resources.premierleague.com/premierleague/badges/70/t${clubCode}.png`;
}
