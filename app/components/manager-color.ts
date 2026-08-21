/**
 * Manager accent-color assignment.
 *
 * This is a fixed single-season, 10-manager league (PRD §12), so colors are
 * assigned by each manager's fixed position in LEAGUE_MANAGER_IDS rather
 * than hashed from their id string. A hash-mod-10 approach can (and for
 * this league's actual ids, did) collide -- multiple managers landing on
 * the same color -- since 10 arbitrary strings hashing into 10 buckets is
 * a birthday-paradox setup, not a guarantee. Indexing into a fixed,
 * pre-ordered list of exactly 10 ids against a 10-color palette is a
 * perfect 1:1 bijection instead: zero collisions, guaranteed.
 *
 * Reserves pure red / pure green for live win/lose glow states elsewhere in
 * the UI, so this palette intentionally avoids both.
 */

import { LEAGUE_MANAGER_IDS } from "@/lib/schedule";

export type ManagerAccent = {
  name: string;
  /** Hex color used for text, dots, borders, glows, etc. */
  hex: string;
};

export const MANAGER_ACCENT_PALETTE: ManagerAccent[] = [
  { name: "cyan", hex: "#22d3ee" },
  { name: "magenta", hex: "#ec4899" },
  { name: "amber", hex: "#f59e0b" },
  { name: "violet", hex: "#8b5cf6" },
  { name: "teal", hex: "#14b8a6" },
  { name: "orange", hex: "#f97316" },
  { name: "lime", hex: "#65a30d" },
  { name: "sky", hex: "#38bdf8" },
  { name: "rose", hex: "#fb7185" },
  { name: "indigo", hex: "#818cf8" },
];

/** Simple, stable djb2-style string hash -- only used as a fallback for ids
 * outside the known 10-manager list (shouldn't happen in normal use). */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Maps a manager id to one of the 10 accent colors. Guaranteed distinct
 * for every id in LEAGUE_MANAGER_IDS; falls back to a hash for anything else. */
export function getManagerAccent(id: string): ManagerAccent {
  const knownIndex = LEAGUE_MANAGER_IDS.indexOf(id);
  const index =
    knownIndex >= 0 ? knownIndex % MANAGER_ACCENT_PALETTE.length : hashString(id) % MANAGER_ACCENT_PALETTE.length;
  return MANAGER_ACCENT_PALETTE[index];
}

/** Convenience helper returning just the hex string. */
export function getManagerColor(id: string): string {
  return getManagerAccent(id).hex;
}
