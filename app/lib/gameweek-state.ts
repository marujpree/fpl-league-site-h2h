// When is a gameweek actually *over*?
//
// FPL's own "finished" signals are useless for display purposes here:
//
//   - `event.finished` / `game.current_event_finished` don't flip until
//     FPL runs its end-of-week processing, which can be most of a day after
//     the last whistle.
//   - `game.current_event` rolls forward to the *next* gameweek within
//     minutes of the last match ending, so by the time anything polls,
//     `current_event_finished` is already describing the new gameweek and
//     the one that just ended never reads as finished at all.
//
// So instead of trusting those flags, derive the state from the real
// Premier League fixture list, which is accurate to the minute: a gameweek
// is complete once every one of its matches reports `finished` -- the
// per-fixture flag FPL flips only once bonus points and stat corrections
// are locked in, as opposed to `finished_provisional` (full time blown, but
// bonus still provisional -- PRD §5).
//
// An earlier version declared a gameweek complete a flat SETTLE_MS after
// the last kickoff instead of waiting on `finished`. That guessed wrong
// for GW3-5: bonus/stat corrections sometimes take longer than the 30
// minutes it assumed, so /api/poll finalized those gameweeks -- writing
// their scores into h2h_matches for good -- while numbers were still
// provisional, permanently understating several managers' points. Reading
// `finished` instead of guessing a duration is what actually fixes that,
// since it waits on FPL's own confirmation however long that takes.

import type { FplFixture } from "./fpl-types";

/** Kickoff to final whistle: 90 minutes plus half-time and stoppage. Two
 * hours covers every normal match; only used as a fallback clock when a
 * fixture has no finish timestamp of its own (the API doesn't give one). */
export const MATCH_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Rough estimate of how long bonus points take to confirm, used only to
 * show a "final ~HH:MM" estimate in the UI while a gameweek is winding
 * down. Doesn't gate `isComplete` -- that waits on the real per-fixture
 * `finished` flag instead, since this is only ever a guess and guessing
 * wrong here previously froze wrong scores into permanent storage (see the
 * note above). */
export const SETTLE_MS = 30 * 60 * 1000;

/** FPL sets every gameweek's lineup deadline exactly 90 minutes before its
 * first kickoff (verified across all 38 gameweeks of the season), so the
 * fixture list alone is enough to know when a new gameweek takes over --
 * no need to plumb deadline times through as well. */
export const DEADLINE_LEAD_MS = 90 * 60 * 1000;

/** Safety valve: if a fixture is postponed mid-gameweek it may never report
 * `finished`, which would otherwise leave the gameweek stuck on "live"
 * forever. A day past the last scheduled kickoff, call it done. */
const STUCK_BACKSTOP_MS = 24 * 60 * 60 * 1000;

export interface GameweekStatus {
  gameweek: number;
  /** Premier League matches scheduled in this gameweek (usually 10). */
  totalMatches: number;
  /** Full time has been blown. */
  finishedMatches: number;
  /** Kicked off and still going. */
  inPlayMatches: number;
  /** Not kicked off yet -- "matches left to play". */
  remainingMatches: number;
  firstKickoff: string | null;
  lastKickoff: string | null;
  /** ISO timestamp this gameweek flips from "live" to "completed", or null
   * while matches are still outstanding. */
  completesAt: string | null;
  hasStarted: boolean;
  allMatchesFinished: boolean;
  /** Every match has bonus points confirmed (FPL's `finished`, not just
   * `finished_provisional`). Scores are final. */
  isComplete: boolean;
  /** Underway and not yet complete -- the only state that should render a
   * pulsing "Live" badge. */
  isLive: boolean;
}

function kickoffMs(fixture: FplFixture): number | null {
  if (!fixture.kickoff_time) return null;
  const ms = new Date(fixture.kickoff_time).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Status of one gameweek, derived from the full season fixture list.
 * `now` is injectable so this stays testable and so a single render can
 * evaluate every gameweek against one consistent clock.
 */
export function gameweekStatus(
  allFixtures: FplFixture[],
  gameweek: number,
  now: number = Date.now()
): GameweekStatus {
  const fixtures = allFixtures.filter((f) => f.event === gameweek);

  let finishedMatches = 0;
  let inPlayMatches = 0;
  let remainingMatches = 0;
  let bonusConfirmedMatches = 0;
  let firstKickoffMs: number | null = null;
  let lastKickoffMs: number | null = null;

  for (const fixture of fixtures) {
    // `finished_provisional` is the full-time whistle, used for the "X of Y
    // played" progress display; `finished` is FPL's own signal that bonus
    // points and stat corrections are locked in for that match, which is
    // what actually decides `isComplete` below.
    if (fixture.finished_provisional || fixture.finished) finishedMatches += 1;
    else if (fixture.started) inPlayMatches += 1;
    else remainingMatches += 1;

    if (fixture.finished) bonusConfirmedMatches += 1;

    const ko = kickoffMs(fixture);
    if (ko === null) continue;
    if (firstKickoffMs === null || ko < firstKickoffMs) firstKickoffMs = ko;
    if (lastKickoffMs === null || ko > lastKickoffMs) lastKickoffMs = ko;
  }

  const totalMatches = fixtures.length;
  const allMatchesFinished = totalMatches > 0 && finishedMatches === totalMatches;
  const hasStarted =
    fixtures.some((f) => f.started) ||
    (firstKickoffMs !== null && now >= firstKickoffMs);

  // Purely a display estimate (see SETTLE_MS) -- not what decides
  // `isComplete`.
  const completesAtMs =
    allMatchesFinished && lastKickoffMs !== null
      ? lastKickoffMs + MATCH_WINDOW_MS + SETTLE_MS
      : null;

  const allBonusConfirmed = totalMatches > 0 && bonusConfirmedMatches === totalMatches;

  const isComplete =
    totalMatches > 0 &&
    (allBonusConfirmed ||
      (lastKickoffMs !== null && now >= lastKickoffMs + STUCK_BACKSTOP_MS));

  return {
    gameweek,
    totalMatches,
    finishedMatches,
    inPlayMatches,
    remainingMatches,
    firstKickoff: firstKickoffMs === null ? null : new Date(firstKickoffMs).toISOString(),
    lastKickoff: lastKickoffMs === null ? null : new Date(lastKickoffMs).toISOString(),
    completesAt: completesAtMs === null ? null : new Date(completesAtMs).toISOString(),
    hasStarted,
    allMatchesFinished,
    isComplete,
    isLive: hasStarted && !isComplete,
  };
}

/**
 * Which gameweek the site should be showing.
 *
 * Not simply FPL's `current_event`: that rolls forward within minutes of a
 * gameweek's last whistle, which would yank the just-finished scores off
 * the page the moment people go looking for them. The real FPL site keeps
 * showing a finished gameweek right up until the next one's deadline, and
 * so does this -- which is also what gives "Gameweek complete" somewhere to
 * actually be seen, rather than it flashing past in the handover.
 */
export function resolveDisplayGameweek(
  allFixtures: FplFixture[],
  fplCurrentEvent: number | null,
  fallback: number | null,
  now: number = Date.now()
): number | null {
  const current = fplCurrentEvent ?? fallback;
  if (current === null) return null;
  const previous = current - 1;
  if (previous < 1) return current;

  const prevStatus = gameweekStatus(allFixtures, previous, now);
  if (!prevStatus.hasStarted) return current;

  // Hand over at the new gameweek's deadline (90 minutes before its first
  // kickoff), the same moment lineups lock.
  const currentStatus = gameweekStatus(allFixtures, current, now);
  const takeoverMs =
    currentStatus.firstKickoff === null
      ? null
      : new Date(currentStatus.firstKickoff).getTime() - DEADLINE_LEAD_MS;
  const currentHasTakenOver =
    currentStatus.hasStarted || (takeoverMs !== null && now >= takeoverMs);

  return currentHasTakenOver ? current : previous;
}

/** Every gameweek that has finished playing but might not have been written
 * to permanent storage yet -- what the poller needs to backfill. */
export function completedGameweeks(
  allFixtures: FplFixture[],
  now: number = Date.now()
): number[] {
  const gameweeks = [...new Set(allFixtures.map((f) => f.event))].sort((a, b) => a - b);
  return gameweeks.filter((gw) => gameweekStatus(allFixtures, gw, now).isComplete);
}
