// Real data layer — reads the live Supabase tables (seeded from the actual
// FPL Draft league 49277) instead of components/mock-data.ts's fabricated
// scores. Same domain-type contract (lib/fpl-types.ts) so page code stays
// simple; the difference is everything here is `async` and most numbers
// come back as zero/null/empty right now because the real 2026/27 season
// hasn't started yet (GW1 deadline 2026-08-21T17:30:00Z) — that's expected,
// not a bug.

import { getBrowserClient } from "./supabase";
import { getManagerColor } from "@/components/manager-color";
import { getAllFixtures, getBootstrap, getElementStatus, getGameState, getTransactions, LEAGUE_ID } from "./fpl";
import { computeManagerScores, fetchLivePointsByElement, fetchPicks, startingXiTotal } from "./live-points";
import { gameweekStatus, resolveDisplayGameweek, type GameweekStatus } from "./gameweek-state";
import type {
  FixtureEntry,
  FormResult,
  FplElement,
  FplEntryEventPick,
  FplFixture,
  GameweekLineup,
  HeadToHeadRecord,
  LineupFixture,
  LineupPlayer,
  Manager,
  MatchupSummary,
  NewsHeadline,
  PairRecord,
  PlayerListEntry,
  RankHistoryPoint,
  SquadPlayer,
  StandingsRow,
} from "./fpl-types";
import type { H2HMatchRow, ManagerRow, GameweekRow } from "./supabase";
import {
  getManagers as fetchManagerRows,
  getFullSchedule,
  getGameweeks as fetchGameweekRows,
  getLiveScores,
} from "./supabase";

export type { FixtureEntry, FormResult, GameweekLineup, HeadToHeadRecord, LineupPlayer, Manager, MatchupSummary, NewsHeadline, PairRecord, PlayerListEntry, RankHistoryPoint, SquadPlayer, StandingsRow };
export type { GameweekStatus } from "./gameweek-state";
export { TOTAL_GAMEWEEKS } from "./fpl-types";

function toManager(row: ManagerRow): Manager {
  return {
    id: row.id,
    displayName: row.display_name,
    teamName: row.team_name,
    initials: row.initials,
    accentColor: getManagerColor(row.id),
  };
}

/** Cached per-request: Next.js dedupes identical `fetch`-free calls per
 * request only via `fetch`, so for direct Supabase calls we just accept
 * a couple of small round-trips per page — 10 managers / 190 matches is
 * trivial and this is called at most a few times per page render. */
async function loadManagers(): Promise<Manager[]> {
  const client = getBrowserClient();
  const rows = await fetchManagerRows(client);
  return rows.map(toManager);
}

/** Every h2h match in the season.
 *
 * Reads only. Repairing a gameweek whose result was never written happens
 * on /api/live instead (see lib/finalize.ts for why it can't happen here:
 * finalizing needs an uncached FPL read, and any uncached fetch inside
 * these ISR-cached renders aborts them with DYNAMIC_SERVER_USAGE). */
async function loadAllMatches(): Promise<H2HMatchRow[]> {
  const client = getBrowserClient();
  return getFullSchedule(client);
}

export async function getManagers(): Promise<Manager[]> {
  return loadManagers();
}

export async function getManagerById(id: string): Promise<Manager | undefined> {
  const managers = await loadManagers();
  return managers.find((m) => m.id === id);
}

/** The gameweek row plus the fixture-derived truth about whether it's
 * actually still being played -- see lib/gameweek-state.ts for why the
 * database flag and FPL's own flags can't be trusted on their own. */
export interface CurrentGameweek extends GameweekRow {
  status: GameweekStatus;
}

/**
 * Which gameweek the whole site is looking at, and whether it's finished.
 *
 * `gameweeks.is_current` / `gameweeks.is_finished` in Supabase are written
 * by /api/poll and are only as fresh as the last poll -- if the poller is
 * down or lagging they go stale, and every page keys off them, so a stale
 * flag showed a week-old gameweek as permanently "Live". This reconciles
 * the stored row against FPL's live game state and the real PL fixture
 * list, so the site is right even when the poller isn't.
 */
export async function getCurrentGameweek(): Promise<CurrentGameweek | null> {
  const client = getBrowserClient();
  const [rows, game, fixtures] = await Promise.all([
    fetchGameweekRows(client),
    getGameState().catch(() => null),
    getAllFixtures().catch(() => [] as Awaited<ReturnType<typeof getAllFixtures>>),
  ]);

  const storedCurrent = rows.find((r) => r.is_current)?.id ?? null;
  const id = resolveDisplayGameweek(fixtures, game?.current_event ?? null, storedCurrent);
  if (id === null) return null;

  const status = gameweekStatus(fixtures, id);
  const row = rows.find((r) => r.id === id);
  return {
    id,
    deadline_time: row?.deadline_time ?? null,
    is_current: true,
    // Fixtures, not the stored flag: a gameweek is over when its matches
    // are over, regardless of whether anything has written that down yet.
    is_finished: status.isComplete,
    status,
  };
}

// ---------------------------------------------------------------------------
// Standings — computed live from h2h_matches rather than the
// standings_snapshot cache table, so it's always correct even before
// anything has populated that cache.
// ---------------------------------------------------------------------------

type Tally = { played: number; wins: number; draws: number; losses: number; points: number; totalScored: number };

function tallyFromMatches(matches: H2HMatchRow[], managerIds: string[]): Map<string, Tally> {
  const table = new Map<string, Tally>();
  for (const id of managerIds) {
    table.set(id, { played: 0, wins: 0, draws: 0, losses: 0, points: 0, totalScored: 0 });
  }
  for (const match of matches) {
    if (match.score_1 === null || match.score_2 === null) continue; // not played yet
    const row1 = table.get(match.manager_1_id);
    const row2 = table.get(match.manager_2_id);
    if (!row1 || !row2) continue;
    row1.played += 1;
    row2.played += 1;
    row1.totalScored += match.score_1;
    row2.totalScored += match.score_2;
    if (match.score_1 > match.score_2) {
      row1.wins += 1;
      row1.points += 3;
      row2.losses += 1;
    } else if (match.score_1 < match.score_2) {
      row2.wins += 1;
      row2.points += 3;
      row1.losses += 1;
    } else {
      row1.draws += 1;
      row2.draws += 1;
      row1.points += 1;
      row2.points += 1;
    }
  }
  return table;
}

/** Season-to-date record between two managers, computed from the full
 * match list (only counting matches with a final score) — no extra query. */
function pairRecord(matches: H2HMatchRow[], id1: string, id2: string): PairRecord {
  const record: PairRecord = { manager1Wins: 0, draws: 0, manager2Wins: 0, meetings: 0 };
  for (const m of matches) {
    if (m.score_1 === null || m.score_2 === null) continue;
    const isPair =
      (m.manager_1_id === id1 && m.manager_2_id === id2) ||
      (m.manager_1_id === id2 && m.manager_2_id === id1);
    if (!isPair) continue;
    record.meetings += 1;
    const score1 = m.manager_1_id === id1 ? m.score_1 : m.score_2;
    const score2 = m.manager_1_id === id1 ? m.score_2 : m.score_1;
    if (score1 > score2) record.manager1Wins += 1;
    else if (score2 > score1) record.manager2Wins += 1;
    else record.draws += 1;
  }
  return record;
}

function standingsRowsFromMatches(
  managers: Manager[],
  matches: H2HMatchRow[],
  gwPointsByManager: Map<string, number>
): StandingsRow[] {
  const table = tallyFromMatches(matches, managers.map((m) => m.id));

  const rows = managers.map((manager) => {
    const t = table.get(manager.id)!;
    return {
      manager,
      rank: 0,
      played: t.played,
      wins: t.wins,
      draws: t.draws,
      losses: t.losses,
      points: t.points,
      totalScored: t.totalScored,
      gwPoints: gwPointsByManager.get(manager.id),
    };
  });

  // Pre-season (everyone 0-0-0-0): keep a stable alphabetical order rather
  // than an arbitrary one. Once games are played, sort by points/scored.
  rows.sort((a, b) => b.points - a.points || b.totalScored - a.totalScored || a.manager.teamName.localeCompare(b.manager.teamName));
  rows.forEach((row, i) => (row.rank = i + 1));

  return rows.map(({ manager, rank, played, wins, draws, losses, points, totalScored, gwPoints }) => ({
    manager,
    rank,
    played,
    wins,
    draws,
    losses,
    points,
    // FPL points scored across the season -- the "overall" column, and the
    // tiebreaker the sort above already uses.
    totalScored,
    gwPoints,
  }));
}

export async function getStandings(): Promise<StandingsRow[]> {
  const [managers, matches] = await Promise.all([loadManagers(), loadAllMatches()]);
  return standingsRowsFromMatches(managers, matches, new Map());
}

/** How old `live_points_cache` may be before pages stop trusting it. The
 * poller refreshes it about once a minute; well past that and it's more
 * likely the poller is down than that nothing has happened. */
const LIVE_CACHE_STALE_MS = 3 * 60 * 1000;

/**
 * Every manager's points for one gameweek, for display.
 *
 * Prefers `live_points_cache` (cheap, one Supabase read) but falls back to
 * computing the scores from FPL when that cache is missing or stale, so a
 * dead poller degrades into "slightly more work per render" instead of
 * "the whole site quietly shows week-old numbers". Same fallback as
 * /api/live, so the server-rendered standings and the client-polled matchup
 * cards can't disagree about what a manager is on.
 */
async function loadGameweekScores(gameweekId: number): Promise<Map<string, number>> {
  const client = getBrowserClient();
  const cached = await getLiveScores(client, gameweekId);
  const newest = cached.reduce((max, row) => Math.max(max, new Date(row.last_updated).getTime()), 0);
  if (cached.length > 0 && Date.now() - newest < LIVE_CACHE_STALE_MS) {
    return new Map(cached.map((r) => [r.manager_id, r.current_points]));
  }

  try {
    const managerRows = await fetchManagerRows(client);
    // Revalidate rather than no-store: these pages are allowed to be
    // statically generated, and `no-store` here would force every one of
    // them dynamic.
    const scores = await computeManagerScores(managerRows, gameweekId, { revalidateSeconds: 60 });
    if (scores.length > 0) return new Map(scores.map((r) => [r.manager_id, r.current_points]));
  } catch {
    // FPL unreachable -- a stale cache still beats an empty table.
  }
  return new Map(cached.map((r) => [r.manager_id, r.current_points]));
}

export interface LiveStandingsResult {
  rows: StandingsRow[];
  /** True only while the current gameweek is still in progress and these
   * rows reflect a live projection ("if the gameweek ended right now") --
   * not the official record yet. */
  isLive: boolean;
  gameweekId: number | null;
  /** Manager ids whose `gwPoints` came from the live cache this render --
   * drives the pulsing live-dot next to their GW column. */
  liveManagerIds: Set<string>;
}

/**
 * Standings for display on the homepage. While a gameweek is in progress,
 * this blends in `live_points_cache` as a provisional "if it ended now"
 * projection for the GW-points column and overall rank; once /api/poll's
 * finalize step writes real scores into h2h_matches (gameweek.is_finished
 * flips true), this naturally reads the real permanent result instead --
 * no separate code path needed for "final" vs "live", just different data.
 */
export async function getLiveStandings(): Promise<LiveStandingsResult> {
  const [managers, matches, gameweek] = await Promise.all([
    loadManagers(),
    loadAllMatches(),
    getCurrentGameweek(),
  ]);

  if (!gameweek) {
    return { rows: standingsRowsFromMatches(managers, matches, new Map()), isLive: false, gameweekId: null, liveManagerIds: new Set() };
  }

  const liveByManager = await loadGameweekScores(gameweek.id);

  // One projection path for both live and finished gameweeks. Permanent
  // scores in h2h_matches always win; the live cache only fills in matches
  // that haven't been finalized yet. That means a gameweek whose matches
  // have all been played still counts toward the table even if /api/poll
  // hasn't written the permanent record yet -- it just stops being labelled
  // "live" once the fixtures say it's over.
  const projectedMatches = matches.map((m) => {
    if (m.gameweek_id !== gameweek.id) return m;
    if (m.score_1 !== null && m.score_2 !== null) return m; // already final
    const s1 = liveByManager.get(m.manager_1_id);
    const s2 = liveByManager.get(m.manager_2_id);
    if (s1 === undefined || s2 === undefined) return m; // picks not locked yet
    return { ...m, score_1: s1, score_2: s2 };
  });

  const gwPoints = new Map<string, number>();
  for (const m of projectedMatches) {
    if (m.gameweek_id !== gameweek.id) continue;
    if (m.score_1 !== null) gwPoints.set(m.manager_1_id, m.score_1);
    if (m.score_2 !== null) gwPoints.set(m.manager_2_id, m.score_2);
  }

  const isLive = gameweek.status.isLive && gwPoints.size > 0;

  return {
    rows: standingsRowsFromMatches(managers, projectedMatches, gwPoints),
    isLive,
    gameweekId: gameweek.id,
    liveManagerIds: isLive ? new Set(liveByManager.keys()) : new Set(),
  };
}

// ---------------------------------------------------------------------------
// This Gameweek
// ---------------------------------------------------------------------------

export async function getCurrentGameweekMatchups(): Promise<MatchupSummary[]> {
  const [managers, gameweek, matches] = await Promise.all([
    loadManagers(),
    getCurrentGameweek(),
    loadAllMatches(),
  ]);
  if (!gameweek) return [];

  // Blend live scores in server-side rather than leaving the first paint
  // showing "vs" until the client's first poll lands -- that gap was one of
  // the ways this page and a manager's own page could disagree.
  const liveByManager = await loadGameweekScores(gameweek.id);

  const byId = new Map(managers.map((m) => [m.id, m]));
  return matches
    .filter((m) => m.gameweek_id === gameweek.id)
    .map((m) => {
      const score1 = m.score_1 ?? liveByManager.get(m.manager_1_id);
      const score2 = m.score_2 ?? liveByManager.get(m.manager_2_id);
      const played = score1 !== undefined && score2 !== undefined;
      return {
        gameweek: gameweek.id,
        manager1: byId.get(m.manager_1_id)!,
        manager2: byId.get(m.manager_2_id)!,
        score1,
        score2,
        // Driven by the real fixture list now, so these switch off ~30
        // minutes after the gameweek's last match instead of hanging around
        // until FPL gets round to flipping its own finished flag.
        isLive: played && gameweek.status.isLive,
        isProvisional: played && gameweek.status.isLive,
        headToHead: pairRecord(matches, m.manager_1_id, m.manager_2_id),
      };
    })
    .filter((m) => m.manager1 && m.manager2);
}

/** Fixture-level progress through the gameweek on screen -- "3 of 10
 * matches still to play". */
export async function getCurrentGameweekStatus(): Promise<GameweekStatus | null> {
  const gameweek = await getCurrentGameweek();
  return gameweek?.status ?? null;
}

// ---------------------------------------------------------------------------
// Fixtures (full season)
// ---------------------------------------------------------------------------

export async function getFixtures(): Promise<FixtureEntry[]> {
  const [managers, matches, gameweek] = await Promise.all([loadManagers(), loadAllMatches(), getCurrentGameweek()]);
  const byId = new Map(managers.map((m) => [m.id, m]));

  return matches
    .map((m) => {
      const played = m.score_1 !== null && m.score_2 !== null;
      const isCurrentGw = gameweek !== null && m.gameweek_id === gameweek.id;
      return {
        gameweek: m.gameweek_id,
        manager1: byId.get(m.manager_1_id)!,
        manager2: byId.get(m.manager_2_id)!,
        score1: m.score_1 ?? undefined,
        score2: m.score_2 ?? undefined,
        played,
        isLive: played && isCurrentGw && gameweek!.status.isLive,
        isProvisional: played && isCurrentGw && gameweek!.status.isLive,
        headToHead: pairRecord(matches, m.manager_1_id, m.manager_2_id),
      };
    })
    .filter((f) => f.manager1 && f.manager2);
}

// ---------------------------------------------------------------------------
// Next deadline — the soonest upcoming lineup lock / trade / waiver
// milestone, straight from FPL's own gameweek calendar so it stays correct
// for every future gameweek without needing to keep Supabase's `gameweeks`
// table manually in sync 38 weeks out.
// ---------------------------------------------------------------------------

export interface UpcomingDeadline {
  gameweek: number;
  deadlineTime: string;
  tradesTime: string;
  waiversTime: string;
}

export async function getUpcomingDeadline(): Promise<UpcomingDeadline | null> {
  const bootstrap = await getBootstrap();
  const now = Date.now();
  const upcoming = bootstrap.events.data
    .filter((e) => new Date(e.deadline_time).getTime() > now)
    .sort((a, b) => new Date(a.deadline_time).getTime() - new Date(b.deadline_time).getTime())[0];
  if (!upcoming) return null;
  return {
    gameweek: upcoming.id,
    deadlineTime: upcoming.deadline_time,
    tradesTime: upcoming.trades_time,
    waiversTime: upcoming.waivers_time,
  };
}

// ---------------------------------------------------------------------------
// PL match schedule — the real Premier League fixture list (kickoff times,
// live state, scores), separate from getFixtures() above which is this
// league's own H2H matchup schedule.
// ---------------------------------------------------------------------------

export interface PLFixtureTeam {
  name: string;
  shortName: string;
  code: number; // for clubBadgeUrl()
}

export interface PLFixtureRow {
  id: number;
  gameweek: number;
  kickoff: string; // ISO timestamp
  home: PLFixtureTeam;
  away: PLFixtureTeam;
  homeScore: number | null;
  awayScore: number | null;
  started: boolean;
  finished: boolean;
  /** True once the full-time whistle's blown, ahead of `finished` (which
   * waits on bonus points being confirmed, up to ~1hr later). This is what
   * "the match is over" should actually key off of for display purposes. */
  finishedProvisional: boolean;
  minutes: number;
}

export async function getPLFixtures(): Promise<{
  fixtures: PLFixtureRow[];
  currentGameweek: number | null;
}> {
  const [fixtures, bootstrap] = await Promise.all([getAllFixtures(), getBootstrap()]);
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t]));

  function toTeam(id: number): PLFixtureTeam {
    const team = teamById.get(id);
    return { name: team?.name ?? "TBD", shortName: team?.short_name ?? "TBD", code: team?.code ?? 0 };
  }

  const rows = fixtures
    .map((f) => ({
      id: f.id,
      gameweek: f.event,
      kickoff: f.kickoff_time,
      home: toTeam(f.team_h),
      away: toTeam(f.team_a),
      homeScore: f.team_h_score,
      awayScore: f.team_a_score,
      started: f.started,
      finished: f.finished,
      finishedProvisional: f.finished_provisional,
      minutes: f.minutes,
    }))
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  return { fixtures: rows, currentGameweek: bootstrap.events.current };
}

// ---------------------------------------------------------------------------
// Per-manager form / streaks / best-worst / head-to-head — all derived from
// the same full match list, counting only matches with a final score.
// ---------------------------------------------------------------------------

async function getFormGuide(managerId: string): Promise<FormResult[]> {
  const [managers, matches] = await Promise.all([loadManagers(), loadAllMatches()]);
  const byId = new Map(managers.map((m) => [m.id, m]));
  const results: FormResult[] = [];

  for (const match of matches.sort((a, b) => a.gameweek_id - b.gameweek_id)) {
    if (match.score_1 === null || match.score_2 === null) continue;
    const manager1 = byId.get(match.manager_1_id);
    const manager2 = byId.get(match.manager_2_id);
    if (!manager1 || !manager2) continue;

    if (match.manager_1_id === managerId) {
      results.push({
        gameweek: match.gameweek_id,
        result: match.score_1 > match.score_2 ? "W" : match.score_1 < match.score_2 ? "L" : "D",
        pointsFor: match.score_1,
        pointsAgainst: match.score_2,
        opponent: manager2,
      });
    } else if (match.manager_2_id === managerId) {
      results.push({
        gameweek: match.gameweek_id,
        result: match.score_2 > match.score_1 ? "W" : match.score_2 < match.score_1 ? "L" : "D",
        pointsFor: match.score_2,
        pointsAgainst: match.score_1,
        opponent: manager1,
      });
    }
  }
  return results;
}

export async function getRankHistory(managerId: string): Promise<RankHistoryPoint[]> {
  const [managers, matches] = await Promise.all([loadManagers(), loadAllMatches()]);
  const managerIds = managers.map((m) => m.id);
  const playedGameweeks = Array.from(
    new Set(matches.filter((m) => m.score_1 !== null && m.score_2 !== null).map((m) => m.gameweek_id))
  ).sort((a, b) => a - b);

  const points: RankHistoryPoint[] = [];
  for (const gw of playedGameweeks) {
    const table = tallyFromMatches(matches.filter((m) => m.gameweek_id <= gw), managerIds);
    const ranked = managerIds
      .map((id) => ({ id, ...table.get(id)! }))
      .sort((a, b) => b.points - a.points || b.totalScored - a.totalScored);
    const rank = ranked.findIndex((r) => r.id === managerId) + 1;
    if (rank > 0) points.push({ gameweek: gw, rank });
  }
  return points;
}

export async function getBestAndWorstGameweek(
  managerId: string
): Promise<{ best: FormResult | null; worst: FormResult | null }> {
  const form = await getFormGuide(managerId);
  if (form.length === 0) return { best: null, worst: null };
  const best = form.reduce((a, b) => (b.pointsFor > a.pointsFor ? b : a));
  const worst = form.reduce((a, b) => (b.pointsFor < a.pointsFor ? b : a));
  return { best, worst };
}

export async function getCurrentStreak(managerId: string): Promise<{ type: "W" | "D" | "L"; count: number } | null> {
  const form = (await getFormGuide(managerId)).slice().reverse();
  if (form.length === 0) return null;
  const type = form[0].result;
  let count = 0;
  for (const entry of form) {
    if (entry.result === type) count += 1;
    else break;
  }
  return { type, count };
}

export async function getHeadToHeadRecord(managerId: string, opponentId: string): Promise<HeadToHeadRecord> {
  const form = await getFormGuide(managerId);
  const record: HeadToHeadRecord = { wins: 0, draws: 0, losses: 0 };
  for (const entry of form) {
    if (entry.opponent.id !== opponentId) continue;
    if (entry.result === "W") record.wins += 1;
    else if (entry.result === "D") record.draws += 1;
    else record.losses += 1;
  }
  return record;
}

// ---------------------------------------------------------------------------
// Stats page (PRD §11): Manager of the Week + per-manager streaks.
// ---------------------------------------------------------------------------

export interface ManagerOfTheWeek {
  gameweek: number;
  manager: Manager;
  points: number;
}

/** Highest single-gameweek score across the league, for the most recent
 * gameweek that has any final scores. Null pre-season / before GW1 finishes. */
export async function getManagerOfTheWeek(): Promise<ManagerOfTheWeek | null> {
  const [managers, matches] = await Promise.all([loadManagers(), loadAllMatches()]);
  const byId = new Map(managers.map((m) => [m.id, m]));

  const playedGameweeks = matches
    .filter((m) => m.score_1 !== null && m.score_2 !== null)
    .map((m) => m.gameweek_id);
  if (playedGameweeks.length === 0) return null;
  const latestGw = Math.max(...playedGameweeks);

  let best: ManagerOfTheWeek | null = null;
  for (const match of matches) {
    if (match.gameweek_id !== latestGw) continue;
    if (match.score_1 === null || match.score_2 === null) continue;
    const candidates: [string, number][] = [
      [match.manager_1_id, match.score_1],
      [match.manager_2_id, match.score_2],
    ];
    for (const [managerId, points] of candidates) {
      if (!best || points > best.points) {
        const manager = byId.get(managerId);
        if (manager) best = { gameweek: latestGw, manager, points };
      }
    }
  }
  return best;
}

export interface ManagerStreak {
  manager: Manager;
  streak: { type: "W" | "D" | "L"; count: number } | null;
}

export async function getAllStreaks(): Promise<ManagerStreak[]> {
  const managers = await loadManagers();
  const streaks = await Promise.all(managers.map((m) => getCurrentStreak(m.id)));
  return managers.map((manager, i) => ({ manager, streak: streaks[i] }));
}

// ---------------------------------------------------------------------------
// News — auto-generated headlines: biggest blowout / biggest loss each
// finished gameweek, a monthly recap once a calendar month of gameweeks has
// fully completed, and waiver/trade write-ups sourced from FPL's own
// transaction log.
// ---------------------------------------------------------------------------

/** Cheap deterministic pick so the same event always renders the same
 * headline phrasing (no reshuffling on every request) without needing
 * server-side state to remember what was shown last time. */
function pickTemplate(templates: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return templates[Math.abs(hash) % templates.length];
}

/** When a gameweek's result actually became known: the last whistle plus the
 * settle window that confirms bonus points, straight from the fixture list.
 *
 * Emphatically not the gameweek's deadline, which is where these headlines
 * used to be dated. The deadline is when lineups *lock* -- before a ball is
 * kicked -- so "Manager of the Week, Gameweek 3" came out stamped Sep 4
 * while GW3 wasn't decided until Sep 6, reading as though the result were
 * known two days before the matches were played. It also quietly broke the
 * 48-hour news ticker: a just-decided gameweek's headline was already two
 * days "old" the moment it was generated, so it aged out before anyone saw
 * it. Falls back to the deadline only when the fixture list is unavailable.
 */
function gameweekResultTime(
  fixtures: FplFixture[],
  gameweek: number,
  fallback: string | undefined
): string {
  const completesAt = fixtures.length > 0 ? gameweekStatus(fixtures, gameweek).completesAt : null;
  return completesAt ?? fallback ?? new Date().toISOString();
}

/** Gameweeks with a final score written down *and* confirmed over by the
 * fixture list. The two should never disagree -- results are only written
 * once a gameweek completes -- but a headline crowning a winner mid-play is
 * the one failure worth being paranoid about, so it's checked rather than
 * assumed. Skipped entirely if the fixture list didn't load, so a flaky FPL
 * call degrades to the old behaviour instead of blanking the news page. */
function decidedGameweeks(matches: H2HMatchRow[], fixtures: FplFixture[]): number[] {
  const scored = new Set(
    matches.filter((m) => m.score_1 !== null && m.score_2 !== null).map((m) => m.gameweek_id)
  );
  if (fixtures.length === 0) return [...scored].sort((a, b) => a - b);
  return [...scored].filter((gw) => gameweekStatus(fixtures, gw).isComplete).sort((a, b) => a - b);
}

async function getMatchdayHeadlines(): Promise<NewsHeadline[]> {
  const [managers, matches, bootstrap, fixtures] = await Promise.all([
    loadManagers(),
    loadAllMatches(),
    getBootstrap(),
    getAllFixtures().catch(() => [] as FplFixture[]),
  ]);
  const byId = new Map(managers.map((m) => [m.id, m]));
  const deadlineByGw = new Map(bootstrap.events.data.map((e) => [e.id, e.deadline_time]));

  const playedGws = decidedGameweeks(matches, fixtures);
  if (playedGws.length === 0) return [];
  const latestGw = playedGws[playedGws.length - 1];

  let biggest: { match: H2HMatchRow; margin: number } | null = null;
  for (const m of matches) {
    if (m.gameweek_id !== latestGw || m.score_1 === null || m.score_2 === null) continue;
    const margin = Math.abs(m.score_1 - m.score_2);
    if (!biggest || margin > biggest.margin) biggest = { match: m, margin };
  }
  if (!biggest || biggest.margin === 0) return []; // a tie has no winner/loser to crown

  const { match, margin } = biggest;
  const winnerId = match.score_1! > match.score_2! ? match.manager_1_id : match.manager_2_id;
  const loserId = winnerId === match.manager_1_id ? match.manager_2_id : match.manager_1_id;
  const winner = byId.get(winnerId);
  const loser = byId.get(loserId);
  if (!winner || !loser) return [];

  const timestamp = gameweekResultTime(fixtures, latestGw, deadlineByGw.get(latestGw));

  const winHeadline = pickTemplate(
    [
      `${winner.teamName} demolishes ${loser.teamName} by ${margin} points — Manager of the Week`,
      `${winner.teamName} puts on a clinic, beating ${loser.teamName} by ${margin}`,
      `Manager of the Week: ${winner.teamName}, after a ${margin}-point beatdown of ${loser.teamName}`,
    ],
    `motw-${latestGw}-${winner.id}`
  );
  const lossHeadline = pickTemplate(
    [
      `${loser.teamName} gets steamrolled by ${winner.teamName}, falling ${margin} points short`,
      `Ouch — ${loser.teamName} drops a ${margin}-point stinker against ${winner.teamName}`,
      `Biggest Loser of GW${latestGw}: ${loser.teamName}, beaten by ${margin} points`,
    ],
    `loss-${latestGw}-${loser.id}`
  );

  return [
    { id: `motw-${latestGw}`, category: "manager-of-week", headline: winHeadline, subtext: `Gameweek ${latestGw}`, timestamp },
    { id: `loss-${latestGw}`, category: "biggest-loss", headline: lossHeadline, subtext: `Gameweek ${latestGw}`, timestamp },
  ];
}

/** Manager of the Month -- only for the most recently *fully completed*
 * calendar month of gameweeks, so it doesn't flicker on mid-month and
 * doesn't need any "have I shown this already" state. */
async function getMonthlyHeadline(): Promise<NewsHeadline[]> {
  const [managers, matches, bootstrap, fixtures] = await Promise.all([
    loadManagers(),
    loadAllMatches(),
    getBootstrap(),
    getAllFixtures().catch(() => [] as FplFixture[]),
  ]);
  const byId = new Map(managers.map((m) => [m.id, m]));
  const deadlineByGw = new Map(bootstrap.events.data.map((e) => [e.id, e.deadline_time]));

  const monthKey = (iso: string) => iso.slice(0, 7); // "2026-08"
  const gwsByMonth = new Map<string, number[]>();
  for (const e of bootstrap.events.data) {
    const key = monthKey(e.deadline_time);
    const list = gwsByMonth.get(key) ?? [];
    list.push(e.id);
    gwsByMonth.set(key, list);
  }
  const finishedGwIds = new Set(bootstrap.events.data.filter((e) => e.finished).map((e) => e.id));

  const completedMonths = Array.from(gwsByMonth.entries())
    .filter(([, gws]) => gws.every((gw) => finishedGwIds.has(gw)))
    .sort(([a], [b]) => b.localeCompare(a));
  if (completedMonths.length === 0) return [];
  const [latestMonthKey, monthGws] = completedMonths[0];

  const totals = new Map<string, number>();
  for (const m of matches) {
    if (!monthGws.includes(m.gameweek_id)) continue;
    if (m.score_1 !== null) totals.set(m.manager_1_id, (totals.get(m.manager_1_id) ?? 0) + m.score_1);
    if (m.score_2 !== null) totals.set(m.manager_2_id, (totals.get(m.manager_2_id) ?? 0) + m.score_2);
  }
  if (totals.size === 0) return [];

  let bestId: string | null = null;
  let bestPoints = -Infinity;
  for (const [id, points] of totals) {
    if (points > bestPoints) {
      bestId = id;
      bestPoints = points;
    }
  }
  const best = bestId ? byId.get(bestId) : null;
  if (!best) return [];

  const monthName = new Date(`${latestMonthKey}-01T00:00:00Z`).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return [
    {
      id: `motm-${latestMonthKey}`,
      category: "manager-of-month",
      headline: `FPL Manager of the Month: ${best.teamName}, with ${bestPoints} points in ${monthName}`,
      subtext: monthName,
      // When the month was actually decided -- its last gameweek going
      // final. Dating it from the 1st put "August 2026" on screen stamped
      // Jul 31 for anyone west of UTC, since midnight UTC on the 1st is the
      // previous evening locally.
      timestamp: gameweekResultTime(
        fixtures,
        Math.max(...monthGws),
        deadlineByGw.get(Math.max(...monthGws))
      ),
    },
  ];
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** League-wide standings rank at a given point in the season (only
 * considering matches through that gameweek) -- same tie-break as
 * standingsRowsFromMatches, just returning ranks keyed by manager id. */
function ranksThroughGameweek(matches: H2HMatchRow[], managerIds: string[], throughGw: number): Map<string, number> {
  const table = tallyFromMatches(
    matches.filter((m) => m.gameweek_id <= throughGw),
    managerIds
  );
  const ranked = managerIds
    .map((id) => ({ id, ...table.get(id)! }))
    .sort((a, b) => b.points - a.points || b.totalScored - a.totalScored);
  const ranks = new Map<string, number>();
  ranked.forEach((r, i) => ranks.set(r.id, i + 1));
  return ranks;
}

/** Whoever climbed the most standings positions between the two most
 * recently finished gameweeks. Needs at least two finished gameweeks to
 * have anything to compare. */
async function getBiggestMoverHeadline(): Promise<NewsHeadline[]> {
  const [managers, matches, bootstrap, fixtures] = await Promise.all([
    loadManagers(),
    loadAllMatches(),
    getBootstrap(),
    getAllFixtures().catch(() => [] as FplFixture[]),
  ]);
  const managerIds = managers.map((m) => m.id);
  const byId = new Map(managers.map((m) => [m.id, m]));
  const deadlineByGw = new Map(bootstrap.events.data.map((e) => [e.id, e.deadline_time]));

  const playedGws = decidedGameweeks(matches, fixtures);
  if (playedGws.length < 2) return [];

  const latestGw = playedGws[playedGws.length - 1];
  const prevGw = playedGws[playedGws.length - 2];

  const ranksNow = ranksThroughGameweek(matches, managerIds, latestGw);
  const ranksBefore = ranksThroughGameweek(matches, managerIds, prevGw);

  let best: { managerId: string; delta: number; newRank: number } | null = null;
  for (const id of managerIds) {
    const before = ranksBefore.get(id) ?? 0;
    const now = ranksNow.get(id) ?? 0;
    const delta = before - now; // positive = moved up the table
    if (delta > 0 && (!best || delta > best.delta)) best = { managerId: id, delta, newRank: now };
  }
  if (!best) return [];

  const manager = byId.get(best.managerId);
  if (!manager) return [];

  return [
    {
      id: `mover-${latestGw}`,
      category: "biggest-mover",
      headline: `Biggest Mover: ${manager.teamName} climbs ${best.delta} spot${best.delta === 1 ? "" : "s"} to ${ordinal(best.newRank)}`,
      subtext: `Gameweek ${latestGw}`,
      timestamp: gameweekResultTime(fixtures, latestGw, deadlineByGw.get(latestGw)),
    },
  ];
}

interface PairedTransaction {
  id: string;
  kind: "waiver" | "trade";
  managerA: ManagerRow;
  managerB: ManagerRow | null; // set for trades only
  playerIn: FplElement; // from managerA's side
  playerOut: FplElement; // from managerA's side
  gameweek: number;
  timestamp: string;
}

/** Shared by the News headlines and the Recent Transactions feed. Trades
 * show up as two accepted transactions -- one per entry -- in the same
 * gameweek where each side's element_out is the other's element_in;
 * everything else accepted is a straightforward waiver/free-agent swap.
 * Draft leagues have exactly one owner per player at a time (unlike
 * Classic's ownership%), so there's no "N people added this player" to
 * tally -- each entry here is a single, attributable move. */
async function getPairedTransactions(): Promise<PairedTransaction[]> {
  const [managerRows, bootstrap, transactions] = await Promise.all([
    fetchManagerRows(getBrowserClient()),
    getBootstrap(),
    getTransactions(LEAGUE_ID),
  ]);

  const managerByEntry = new Map(managerRows.map((r) => [r.fpl_entry_id, r]));
  const elementById = new Map(bootstrap.elements.map((el) => [el.id, el]));
  const accepted = transactions.filter((t) => t.result === "a");

  const tradePairIds = new Set<number>();
  const results: PairedTransaction[] = [];

  for (const t of accepted) {
    if (tradePairIds.has(t.id)) continue;
    const partner = accepted.find(
      (other) =>
        other.id !== t.id &&
        !tradePairIds.has(other.id) &&
        other.event === t.event &&
        other.entry !== t.entry &&
        other.element_out === t.element_in &&
        other.element_in === t.element_out
    );

    const managerA = managerByEntry.get(t.entry);
    const playerIn = elementById.get(t.element_in);
    const playerOut = elementById.get(t.element_out);
    if (!managerA || !playerIn || !playerOut) continue;

    if (partner) {
      tradePairIds.add(t.id);
      tradePairIds.add(partner.id);
      const managerB = managerByEntry.get(partner.entry);
      if (!managerB) continue;
      results.push({
        id: `trade-${t.id}-${partner.id}`,
        kind: "trade",
        managerA,
        managerB,
        playerIn,
        playerOut,
        gameweek: t.event,
        timestamp: t.added,
      });
    } else {
      results.push({
        id: `waiver-${t.id}`,
        kind: "waiver",
        managerA,
        managerB: null,
        playerIn,
        playerOut,
        gameweek: t.event,
        timestamp: t.added,
      });
    }
  }

  return results;
}

async function getTransactionHeadlines(): Promise<NewsHeadline[]> {
  const paired = await getPairedTransactions();
  return paired.map((p) => {
    if (p.kind === "trade" && p.managerB) {
      return {
        id: p.id,
        category: "trade" as const,
        headline: pickTemplate(
          [
            `${p.managerA.display_name} and ${p.managerB.display_name} strike a deal: ${p.playerOut.web_name} for ${p.playerIn.web_name}`,
            `Trade alert: ${p.managerA.display_name} sends ${p.playerOut.web_name} to ${p.managerB.display_name} for ${p.playerIn.web_name}`,
          ],
          p.id
        ),
        subtext: `Gameweek ${p.gameweek}`,
        timestamp: p.timestamp,
      };
    }
    return {
      id: p.id,
      category: "waiver" as const,
      headline: pickTemplate(
        [
          `${p.managerA.display_name} raids the waiver wire, snags ${p.playerIn.web_name} (drops ${p.playerOut.web_name})`,
          `${p.managerA.display_name} makes a move: ${p.playerIn.web_name} in, ${p.playerOut.web_name} out`,
          `Waiver wire watch: ${p.managerA.display_name} picks up ${p.playerIn.web_name}`,
        ],
        p.id
      ),
      subtext: `Gameweek ${p.gameweek}`,
      timestamp: p.timestamp,
    };
  });
}

export interface RecentTransactionPlayer {
  name: string;
  position: string;
  clubCode: number;
}

export interface RecentTransaction {
  id: string;
  kind: "waiver" | "trade";
  managerLabel: string;
  playerIn: RecentTransactionPlayer;
  playerOut: RecentTransactionPlayer;
  gameweek: number;
  timestamp: string;
}

/** Reverse-chronological feed of actual moves -- who dropped/added what,
 * and trades between two managers. Replaces a "most added" ranking, which
 * doesn't really make sense in a Draft league: only one manager can ever
 * own a given player at a time, so there's rarely more than one add of the
 * same player in a week to rank in the first place. */
export async function getRecentTransactions(limit = 15): Promise<RecentTransaction[]> {
  const [paired, bootstrap] = await Promise.all([getPairedTransactions(), getBootstrap()]);
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const positionById = new Map(bootstrap.element_types.map((t) => [t.id, t.singular_name_short]));

  function toPlayer(el: FplElement): RecentTransactionPlayer {
    return {
      name: el.web_name,
      position: positionById.get(el.element_type) ?? "?",
      clubCode: teamById.get(el.team)?.code ?? 0,
    };
  }

  return paired
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      managerLabel:
        p.kind === "trade" && p.managerB
          ? `${p.managerA.display_name} ↔ ${p.managerB.display_name}`
          : p.managerA.display_name,
      playerIn: toPlayer(p.playerIn),
      playerOut: toPlayer(p.playerOut),
      gameweek: p.gameweek,
      timestamp: p.timestamp,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export async function getNewsHeadlines(): Promise<NewsHeadline[]> {
  const [matchday, monthly, mover, transactions] = await Promise.all([
    getMatchdayHeadlines(),
    getMonthlyHeadline(),
    getBiggestMoverHeadline(),
    getTransactionHeadlines(),
  ]);
  return [...matchday, ...monthly, ...mover, ...transactions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/** For the site-wide ticker, which only shows recent news -- the full
 * history still lives on the News tab. Filtering happens here (a plain
 * async function) rather than in a component body, since computing "now"
 * during render is impure. */
export async function getRecentNewsHeadlines(maxAgeMs: number): Promise<NewsHeadline[]> {
  const headlines = await getNewsHeadlines();
  const now = Date.now();
  return headlines.filter((h) => now - new Date(h.timestamp).getTime() <= maxAgeMs);
}

// ---------------------------------------------------------------------------
// Manager squad — real, current roster from FPL's own Draft API. Draft
// leagues assign players permanently at draft time (unlike Classic's
// per-gameweek picks), so this is available and accurate right now, not
// blocked on the season having started. Reflects trades/waivers within
// ~5 minutes (see getElementStatus's cache setting in lib/fpl.ts).
// ---------------------------------------------------------------------------

const POSITION_ORDER = ["GKP", "DEF", "MID", "FWD"] as const;

export async function getManagerSquad(managerId: string): Promise<SquadPlayer[]> {
  const client = getBrowserClient();
  const [managerRows, bootstrap, elementStatus] = await Promise.all([
    fetchManagerRows(client),
    getBootstrap(),
    getElementStatus(LEAGUE_ID),
  ]);

  const managerRow = managerRows.find((m) => m.id === managerId);
  if (!managerRow) return [];

  const ownedElementIds = new Set(
    elementStatus.element_status.filter((e) => e.owner === managerRow.fpl_entry_id).map((e) => e.element)
  );
  if (ownedElementIds.size === 0) return [];

  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const positionById = new Map(
    bootstrap.element_types.map((t) => [t.id, t.singular_name_short as SquadPlayer["position"]])
  );

  const players: SquadPlayer[] = bootstrap.elements
    .filter((el) => ownedElementIds.has(el.id))
    .map((el) => ({
      id: el.id,
      name: el.web_name,
      position: positionById.get(el.element_type) ?? "MID",
      club: teamById.get(el.team)?.short_name ?? "?",
      teamId: el.team,
      seasonPoints: el.total_points,
      status: el.status,
      photoCode: el.code,
      clubCode: teamById.get(el.team)?.code ?? 0,
    }));

  players.sort((a, b) => {
    const posDiff = POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
    if (posDiff !== 0) return posDiff;
    return b.seasonPoints - a.seasonPoints;
  });

  return players;
}

// ---------------------------------------------------------------------------
// Gameweek lineup — the confirmed starting XI + 4 bench players a manager
// actually fielded for one gameweek. Draft leagues require weekly lineup
// submission (unlike squad ownership, which is permanent) — this is null
// until that manager's lineup locks for the given gameweek; FPL's API
// answers with a non-JSON "No pick history" body pre-lock, which
// getEntryPicks already translates to `null` rather than throwing.
// ---------------------------------------------------------------------------

export async function getManagerGameweekLineup(
  managerId: string,
  gameweek: number
): Promise<GameweekLineup | null> {
  const client = getBrowserClient();
  const managerRows = await fetchManagerRows(client);
  const managerRow = managerRows.find((m) => m.id === managerId);
  if (!managerRow) return null;

  // Picks and live points come from lib/live-points.ts -- the same
  // uncached fetches and the same arithmetic /api/poll uses to write the
  // score on the matchup cards. Previously this path had its own copy of
  // the math reading its own 60s-cached snapshot, which is why the two
  // screens could show different totals for the same manager.
  const [picks, livePoints, bootstrap, allFixtures] = await Promise.all([
    fetchPicks(managerRow.fpl_entry_id, gameweek),
    fetchLivePointsByElement(gameweek),
    getBootstrap(),
    getAllFixtures(),
  ]);
  if (!picks) return null;

  const elementById = new Map(bootstrap.elements.map((el) => [el.id, el]));
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const positionById = new Map(
    bootstrap.element_types.map((t) => [t.id, t.singular_name_short as SquadPlayer["position"]])
  );

  // Real-world PL fixtures for this gameweek, keyed by team id -- almost
  // always one fixture per team, two on a double gameweek.
  const fixturesByTeam = new Map<number, LineupFixture[]>();
  for (const f of allFixtures) {
    if (f.event !== gameweek) continue;
    const home = teamById.get(f.team_h);
    const away = teamById.get(f.team_a);
    const homeList = fixturesByTeam.get(f.team_h) ?? [];
    homeList.push({
      opponentShortName: away?.short_name ?? "?",
      isHome: true,
      started: f.started,
      finished: f.finished,
      finishedProvisional: f.finished_provisional,
    });
    fixturesByTeam.set(f.team_h, homeList);
    const awayList = fixturesByTeam.get(f.team_a) ?? [];
    awayList.push({
      opponentShortName: home?.short_name ?? "?",
      isHome: false,
      started: f.started,
      finished: f.finished,
      finishedProvisional: f.finished_provisional,
    });
    fixturesByTeam.set(f.team_a, awayList);
  }

  function toLineupPlayer(pick: FplEntryEventPick): LineupPlayer | null {
    const el = elementById.get(pick.element);
    if (!el) return null;
    const rawPoints = livePoints.get(el.id) ?? 0;
    return {
      id: el.id,
      name: el.web_name,
      position: positionById.get(el.element_type) ?? "MID",
      club: teamById.get(el.team)?.short_name ?? "?",
      teamId: el.team,
      seasonPoints: el.total_points,
      status: el.status,
      photoCode: el.code,
      clubCode: teamById.get(el.team)?.code ?? 0,
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
      livePoints: rawPoints * pick.multiplier,
      fixtures: fixturesByTeam.get(el.team) ?? [],
    };
  }

  const byPositionThenPoints = (a: LineupPlayer, b: LineupPlayer) => {
    const posDiff = POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position);
    return posDiff !== 0 ? posDiff : b.seasonPoints - a.seasonPoints;
  };

  const starting = picks
    .filter((p) => p.position <= 11)
    .map(toLineupPlayer)
    .filter((p): p is LineupPlayer => p !== null)
    .sort(byPositionThenPoints);

  const bench = picks
    .filter((p) => p.position > 11)
    .map(toLineupPlayer)
    .filter((p): p is LineupPlayer => p !== null)
    .sort(byPositionThenPoints);

  return { starting, bench, totalPoints: startingXiTotal(picks, livePoints) };
}

// ---------------------------------------------------------------------------
// Players tab — every player in the game (~600), with who owns them (or
// free agent) right now. For "who has this guy" lookups during a live GW.
// ---------------------------------------------------------------------------

export async function getAllPlayers(): Promise<PlayerListEntry[]> {
  const [managers, managerRows, bootstrap, elementStatus] = await Promise.all([
    loadManagers(),
    fetchManagerRows(getBrowserClient()),
    getBootstrap(),
    getElementStatus(LEAGUE_ID),
  ]);

  const managerByEntryId = new Map(
    managerRows.map((row) => [row.fpl_entry_id, managers.find((m) => m.id === row.id) ?? null])
  );
  const ownerByElementId = new Map(elementStatus.element_status.map((e) => [e.element, e.owner]));

  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const positionById = new Map(
    bootstrap.element_types.map((t) => [t.id, t.singular_name_short as SquadPlayer["position"]])
  );

  return bootstrap.elements.map((el) => {
    const ownerEntryId = ownerByElementId.get(el.id) ?? null;
    return {
      id: el.id,
      name: el.web_name,
      position: positionById.get(el.element_type) ?? "MID",
      club: teamById.get(el.team)?.short_name ?? "?",
      teamId: el.team,
      seasonPoints: el.total_points,
      status: el.status,
      photoCode: el.code,
      clubCode: teamById.get(el.team)?.code ?? 0,
      owner: ownerEntryId !== null ? managerByEntryId.get(ownerEntryId) ?? null : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Injury Watch (Stats page) -- every rostered player who isn't fully
// available right now, grouped by the manager who owns them.
// ---------------------------------------------------------------------------

export interface InjuryWatchEntry {
  manager: Manager;
  players: PlayerListEntry[];
}

export async function getInjuryWatch(): Promise<InjuryWatchEntry[]> {
  const players = await getAllPlayers();
  const byManager = new Map<string, InjuryWatchEntry>();

  for (const player of players) {
    if (!player.owner || player.status === "a") continue;
    const entry = byManager.get(player.owner.id) ?? { manager: player.owner, players: [] };
    entry.players.push(player);
    byManager.set(player.owner.id, entry);
  }

  return Array.from(byManager.values()).sort((a, b) => a.manager.teamName.localeCompare(b.manager.teamName));
}

// ---------------------------------------------------------------------------
// League Records (Stats page) -- season-long superlatives, distinct from
// the weekly Manager of the Week.
// ---------------------------------------------------------------------------

export interface LeagueRecords {
  highestGwScore: { manager: Manager; gameweek: number; points: number } | null;
  longestWinStreak: { manager: Manager; count: number } | null;
  biggestBlowout: { winner: Manager; loser: Manager; margin: number; gameweek: number } | null;
}

export async function getLeagueRecords(): Promise<LeagueRecords> {
  const [managers, matches] = await Promise.all([loadManagers(), loadAllMatches()]);
  const byId = new Map(managers.map((m) => [m.id, m]));

  let highestGwScore: LeagueRecords["highestGwScore"] = null;
  let biggestBlowout: LeagueRecords["biggestBlowout"] = null;

  for (const m of matches) {
    if (m.score_1 === null || m.score_2 === null) continue;
    const candidates: [string, number][] = [
      [m.manager_1_id, m.score_1],
      [m.manager_2_id, m.score_2],
    ];
    for (const [managerId, points] of candidates) {
      if (!highestGwScore || points > highestGwScore.points) {
        const manager = byId.get(managerId);
        if (manager) highestGwScore = { manager, gameweek: m.gameweek_id, points };
      }
    }

    const margin = Math.abs(m.score_1 - m.score_2);
    if (margin > 0 && (!biggestBlowout || margin > biggestBlowout.margin)) {
      const winnerId = m.score_1 > m.score_2 ? m.manager_1_id : m.manager_2_id;
      const loserId = winnerId === m.manager_1_id ? m.manager_2_id : m.manager_1_id;
      const winner = byId.get(winnerId);
      const loser = byId.get(loserId);
      if (winner && loser) biggestBlowout = { winner, loser, margin, gameweek: m.gameweek_id };
    }
  }

  let longestWinStreak: LeagueRecords["longestWinStreak"] = null;
  for (const manager of managers) {
    const form = await getFormGuide(manager.id);
    let current = 0;
    let best = 0;
    for (const result of form) {
      current = result.result === "W" ? current + 1 : 0;
      best = Math.max(best, current);
    }
    if (best > 0 && (!longestWinStreak || best > longestWinStreak.count)) {
      longestWinStreak = { manager, count: best };
    }
  }

  return { highestGwScore, longestWinStreak, biggestBlowout };
}
