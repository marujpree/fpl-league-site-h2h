// Promoting a finished gameweek into the permanent record.
//
// `h2h_matches` is the source of truth for standings, form, head-to-head
// records -- everything except the live ticker. Nothing computes it on the
// fly: a gameweek's scores are written there once, when its matches are
// over, and read back forever after.
//
// That made the write the single point of failure for the whole site's
// history. It used to live inside /api/poll and nowhere else, so the
// permanent record only existed if an *external* cron kept pinging that
// route -- and when that pinger stopped after GW1, GW2 finished, its scores
// were never written, and the standings table simply dropped the week. The
// site looked fine; it was just missing a gameweek.
//
// So the logic lives here instead, and two things drive it: the poller, and
// /api/live on ordinary visitor traffic. Deciding whether anything needs
// writing is pure and takes data the caller already has, which is what makes
// it cheap enough to check on every request.
//
// Both callers are route handlers, and that isn't incidental. Finalizing
// reads FPL uncached, and an uncached fetch inside the ISR-cached page
// renders that consume this data aborts them outright ("Page changed from
// static to dynamic at runtime") -- so the repair has to be driven from a
// dynamic route, never from the render that wants the result.

import type { SupabaseClient } from "@supabase/supabase-js";
import { completedGameweeks } from "./gameweek-state";
import { computeManagerScores, type ManagerLiveScore } from "./live-points";
import {
  getFullSchedule,
  markGameweekFinished,
  updateMatchResults,
  type H2HMatchRow,
  type ManagerRow,
} from "./supabase";
import type { FplFixture } from "./fpl-types";

/**
 * Gameweeks that have finished playing but whose scores were never written
 * into `h2h_matches`.
 *
 * Pure, and takes both inputs from what the caller already loaded, so
 * asking "is anything missing?" costs no extra requests -- that's what lets
 * every page render check rather than trusting a cron to have run.
 *
 * Deliberately has no lookback window. An earlier version only reconsidered
 * the last six gameweeks, which quietly turned any longer outage into
 * permanently missing history.
 */
export function pendingFinalization(
  matches: H2HMatchRow[],
  fixtures: FplFixture[],
  now: number = Date.now()
): number[] {
  if (matches.length === 0 || fixtures.length === 0) return [];
  const complete = new Set(completedGameweeks(fixtures, now));
  const pending = new Set<number>();
  for (const match of matches) {
    if (!complete.has(match.gameweek_id)) continue;
    if (match.score_1 === null || match.score_2 === null) pending.add(match.gameweek_id);
  }
  return [...pending].sort((a, b) => a - b);
}

/**
 * Writes one completed gameweek's final scores into `h2h_matches` and flags
 * the gameweek finished.
 *
 * Idempotent: re-reads the gameweek's rows and no-ops if they already carry
 * scores, so two callers racing (a poll and a page render, say) settle on
 * the same values rather than fighting.
 *
 * `knownScores` lets a caller reuse scores it just computed for this
 * gameweek; pass null to fetch them.
 *
 * Scores are always fetched uncached, and there is deliberately no knob to
 * change that. This is a write that happens once and is read as fact
 * forever, so it has to come from live FPL data -- when the backfill first
 * ran from inside a page render it inherited Next's on-disk fetch cache and
 * stamped nine-day-old mid-gameweek numbers into GW2 as the final result.
 * A stale *display* self-corrects on the next render; a stale permanent
 * record never does, because the "already finalized" check above then
 * treats the wrong scores as done.
 */
export async function finalizeGameweek(
  supabase: SupabaseClient,
  gameweek: number,
  managers: ManagerRow[],
  knownScores: ManagerLiveScore[] | null
): Promise<boolean> {
  const matches = (await getFullSchedule(supabase)).filter((m) => m.gameweek_id === gameweek);
  if (matches.length === 0) return false;
  if (matches.every((m) => m.score_1 !== null && m.score_2 !== null)) return false;

  const scoreRows = knownScores ?? (await computeManagerScores(managers, gameweek, "no-store"));
  // Nobody had a locked lineup for this gameweek (e.g. it predates the
  // league). Don't stamp a table full of 0-0 draws over it.
  if (scoreRows.length === 0) return false;

  const scoreByManager = new Map(scoreRows.map((r) => [r.manager_id, r.current_points]));

  const updates = matches.map((m) => {
    const score1 = scoreByManager.get(m.manager_1_id) ?? 0;
    const score2 = scoreByManager.get(m.manager_2_id) ?? 0;
    const winner_id = score1 === score2 ? null : score1 > score2 ? m.manager_1_id : m.manager_2_id;
    return { id: m.id, score_1: score1, score_2: score2, winner_id };
  });

  await updateMatchResults(supabase, updates);
  await markGameweekFinished(supabase, gameweek);
  return true;
}

/** Every gameweek in `gameweeks`, oldest first. Returns the ones actually
 * written, so callers can log/report a backfill without inferring it. */
export async function finalizeGameweeks(
  supabase: SupabaseClient,
  gameweeks: number[],
  managers: ManagerRow[],
  knownScores: { gameweek: number; scores: ManagerLiveScore[] } | null = null
): Promise<number[]> {
  const written: number[] = [];
  for (const gameweek of gameweeks) {
    const reuse = knownScores && knownScores.gameweek === gameweek ? knownScores.scores : null;
    if (await finalizeGameweek(supabase, gameweek, managers, reuse)) {
      written.push(gameweek);
    }
  }
  return written;
}
