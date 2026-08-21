/**
 * Deterministic manager accent-color hashing.
 *
 * Reserves pure red / pure green for live win/lose glow states elsewhere in
 * the UI, so the manager-identity palette intentionally avoids both. Any
 * manager id (or name) always hashes to the same color, so accent colors
 * stay consistent across every page without needing a stored color field.
 */

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
  { name: "lime", hex: "#a3e635" },
  { name: "sky", hex: "#38bdf8" },
  { name: "rose", hex: "#fb7185" },
  { name: "indigo", hex: "#818cf8" },
];

/** Simple, stable djb2-style string hash (no external deps, no Math.random). */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Maps a manager id/name to one of the fixed accent colors, deterministically. */
export function getManagerAccent(idOrName: string): ManagerAccent {
  const index = hashString(idOrName) % MANAGER_ACCENT_PALETTE.length;
  return MANAGER_ACCENT_PALETTE[index];
}

/** Convenience helper returning just the hex string. */
export function getManagerColor(idOrName: string): string {
  return getManagerAccent(idOrName).hex;
}
