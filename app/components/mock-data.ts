/**
 * MOCK / PLACEHOLDER DATA.
 *
 * The real 2026/27 FPL season has not started yet (GW1 unplayed as of the
 * time this dashboard was built). Everything in this file is fabricated so
 * the UI can be built and reviewed against a populated, mid-season-looking
 * league (we pretend it is Gameweek 6). A later pass will swap this file's
 * exports for data read from Supabase / the FPL API using the exact same
 * shapes, so component code should not need to change.
 *
 * Domain types below (`Manager`, `StandingsRow`, `MatchupSummary`) are the
 * shared contract with the real data layer -- keep them stable.
 */

import { getManagerColor } from "./manager-color";

// ---------------------------------------------------------------------------
// Domain types (contract -- keep in sync with the real data layer)
// ---------------------------------------------------------------------------

export type Manager = {
  id: string;
  displayName: string;
  teamName: string;
  accentColor: string;
};

export type StandingsRow = {
  manager: Manager;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gwPoints?: number;
};

export type MatchupSummary = {
  gameweek: number;
  manager1: Manager;
  manager2: Manager;
  score1: number;
  score2: number;
  isLive: boolean;
  isProvisional: boolean;
};

// ---------------------------------------------------------------------------
// Supporting mock-only types (not part of the shared contract, but used by
// components in this app to render fixtures / profile / expanded-card UI).
// ---------------------------------------------------------------------------

export type FixtureEntry = {
  gameweek: number;
  manager1: Manager;
  manager2: Manager;
  score1?: number;
  score2?: number;
  played: boolean;
  isLive?: boolean;
  isProvisional?: boolean;
};

export type RankHistoryPoint = {
  gameweek: number;
  rank: number;
};

export type FormResult = {
  gameweek: number;
  result: "W" | "D" | "L";
  pointsFor: number;
  pointsAgainst: number;
  opponent: Manager;
};

export type HeadToHeadRecord = {
  wins: number;
  draws: number;
  losses: number;
};

export type MockPlayerLine = {
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  points: number;
};

// ---------------------------------------------------------------------------
// Managers
// ---------------------------------------------------------------------------

type ManagerSeed = { id: string; teamName: string; displayName: string };

const MANAGER_SEEDS: ManagerSeed[] = [
  { id: "reyes-fc", teamName: "Reyes FC", displayName: "Santiago Reyes" },
  { id: "forest-team", teamName: "Forest Team", displayName: "Miguel Galicia" },
  { id: "rw", teamName: "RW", displayName: "Jared Bolanos" },
  { id: "brunodagoat", teamName: "Brunodagoat", displayName: "julio garcia" },
  { id: "frankdatnk", teamName: "frankdatnk", displayName: "Franky Villarreal" },
  { id: "gooner-fc", teamName: "Gooner FC", displayName: "Brendan Gerstbrein" },
  { id: "beans-n-rice-fc", teamName: "Beans n Rice FC", displayName: "Rodrigo Medina" },
  { id: "gordon-1s", teamName: "Gordon 1s", displayName: "Carlos Alejandro" },
  { id: "beginners-luck", teamName: "Beginners luck", displayName: "Daniel Azucar" },
  { id: "dobel-fc", teamName: "Dobel FC", displayName: "Fernando Lastra" },
];

export const MANAGERS: Manager[] = MANAGER_SEEDS.map((seed) => ({
  id: seed.id,
  displayName: seed.displayName,
  teamName: seed.teamName,
  accentColor: getManagerColor(seed.id),
}));

export function getManagerById(id: string): Manager | undefined {
  return MANAGERS.find((m) => m.id === id);
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) -- NOT Math.random(). Module-level mock
// data must render identically on the server and during client hydration,
// so score generation is a pure function of a fixed seed, consumed in a
// fixed order.
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let state = seed;
  return function rand() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomScore(rand: () => number): number {
  // Plausible FPL gameweek score range.
  return Math.round(28 + rand() * 58);
}

// ---------------------------------------------------------------------------
// Season schedule: double round-robin (circle method) across 10 managers,
// cycled to fill a 38-gameweek season. Every gameweek pairs all 10 managers
// into 5 matchups.
// ---------------------------------------------------------------------------

export const CURRENT_GAMEWEEK = 6;
export const TOTAL_GAMEWEEKS = 38;

function buildDoubleRoundRobin(managers: Manager[]): [Manager, Manager][][] {
  const n = managers.length;
  const singleRounds: [Manager, Manager][][] = [];
  let rotation = managers.slice();

  for (let round = 0; round < n - 1; round++) {
    const pairs: [Manager, Manager][] = [];
    for (let i = 0; i < n / 2; i++) {
      pairs.push([rotation[i], rotation[n - 1 - i]]);
    }
    singleRounds.push(pairs);
    rotation = [rotation[0], rotation[n - 1], ...rotation.slice(1, n - 1)];
  }

  // Second leg: same pairings, sides swapped, for a full double round-robin.
  const secondLeg = singleRounds.map((round) =>
    round.map(([a, b]) => [b, a] as [Manager, Manager])
  );

  return [...singleRounds, ...secondLeg];
}

const ROUND_ROBIN = buildDoubleRoundRobin(MANAGERS);

function pairingsForGameweek(gameweek: number): [Manager, Manager][] {
  return ROUND_ROBIN[(gameweek - 1) % ROUND_ROBIN.length];
}

// Pre-generate deterministic scores for every completed gameweek (1 through
// CURRENT_GAMEWEEK - 1).
const SEED = 20260821; // today's date, arbitrary but fixed
const completedResults = new Map<string, { score1: number; score2: number }>();
{
  const rand = mulberry32(SEED);
  for (let gw = 1; gw < CURRENT_GAMEWEEK; gw++) {
    const pairs = pairingsForGameweek(gw);
    pairs.forEach((_, i) => {
      completedResults.set(`${gw}-${i}`, {
        score1: randomScore(rand),
        score2: randomScore(rand),
      });
    });
  }
}

// The current gameweek (live, in progress) is hand-crafted rather than
// generated, so the "This Gameweek" page can demonstrate a realistic mix of
// live / finished / provisional states.
type LiveResult = { score1: number; score2: number; isLive: boolean; isProvisional: boolean };

const GW_LIVE_RESULTS: LiveResult[] = [
  { score1: 68, score2: 54, isLive: true, isProvisional: true }, // bonus pts pending
  { score1: 42, score2: 61, isLive: true, isProvisional: false },
  { score1: 77, score2: 77, isLive: false, isProvisional: false }, // finished, level
  { score1: 33, score2: 58, isLive: false, isProvisional: false }, // finished
  { score1: 50, score2: 47, isLive: true, isProvisional: true }, // tight, bonus pending
];

type MatchResult = { score1: number; score2: number; isLive: boolean; isProvisional: boolean };

function getMatchResult(gameweek: number, pairIndex: number): MatchResult | undefined {
  if (gameweek === CURRENT_GAMEWEEK) {
    return GW_LIVE_RESULTS[pairIndex];
  }
  if (gameweek < CURRENT_GAMEWEEK) {
    const completed = completedResults.get(`${gameweek}-${pairIndex}`);
    return completed ? { ...completed, isLive: false, isProvisional: false } : undefined;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// This Gameweek (current gameweek matchup cards)
// ---------------------------------------------------------------------------

export const CURRENT_GW_MATCHUPS: MatchupSummary[] = pairingsForGameweek(CURRENT_GAMEWEEK).map(
  ([manager1, manager2], i) => {
    const result = GW_LIVE_RESULTS[i];
    return {
      gameweek: CURRENT_GAMEWEEK,
      manager1,
      manager2,
      score1: result.score1,
      score2: result.score2,
      isLive: result.isLive,
      isProvisional: result.isProvisional,
    };
  }
);

// ---------------------------------------------------------------------------
// Full season fixtures (read-only schedule, grouped by gameweek elsewhere)
// ---------------------------------------------------------------------------

export const FIXTURES: FixtureEntry[] = (() => {
  const fixtures: FixtureEntry[] = [];
  for (let gw = 1; gw <= TOTAL_GAMEWEEKS; gw++) {
    const pairs = pairingsForGameweek(gw);
    pairs.forEach(([manager1, manager2], i) => {
      const result = getMatchResult(gw, i);
      fixtures.push({
        gameweek: gw,
        manager1,
        manager2,
        score1: result?.score1,
        score2: result?.score2,
        played: Boolean(result),
        isLive: result?.isLive ?? false,
        isProvisional: result?.isProvisional ?? false,
      });
    });
  }
  return fixtures;
})();

// ---------------------------------------------------------------------------
// Standings (through the last fully completed gameweek -- GW6 is still live
// and not yet reflected in official P/W/D/L, only in the `gwPoints` column)
// ---------------------------------------------------------------------------

type Tally = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  totalScored: number;
};

function computeStandingsThroughGameweek(uptoGameweek: number): Map<string, Tally> {
  const table = new Map<string, Tally>();
  for (const manager of MANAGERS) {
    table.set(manager.id, { played: 0, wins: 0, draws: 0, losses: 0, points: 0, totalScored: 0 });
  }

  for (let gw = 1; gw <= uptoGameweek; gw++) {
    const pairs = pairingsForGameweek(gw);
    pairs.forEach(([manager1, manager2], i) => {
      const result = getMatchResult(gw, i);
      if (!result) return;

      const row1 = table.get(manager1.id)!;
      const row2 = table.get(manager2.id)!;
      row1.played += 1;
      row2.played += 1;
      row1.totalScored += result.score1;
      row2.totalScored += result.score2;

      if (result.score1 > result.score2) {
        row1.wins += 1;
        row1.points += 3;
        row2.losses += 1;
      } else if (result.score1 < result.score2) {
        row2.wins += 1;
        row2.points += 3;
        row1.losses += 1;
      } else {
        row1.draws += 1;
        row2.draws += 1;
        row1.points += 1;
        row2.points += 1;
      }
    });
  }

  return table;
}

function tallyToStandings(table: Map<string, Tally>): StandingsRow[] {
  const rows = MANAGERS.map((manager) => {
    const tally = table.get(manager.id)!;
    return {
      manager,
      rank: 0, // assigned after sort
      played: tally.played,
      wins: tally.wins,
      draws: tally.draws,
      losses: tally.losses,
      points: tally.points,
      totalScored: tally.totalScored,
    };
  });

  rows.sort((a, b) => b.points - a.points || b.totalScored - a.totalScored);
  rows.forEach((row, i) => {
    row.rank = i + 1;
  });

  return rows.map((row) => ({
    manager: row.manager,
    rank: row.rank,
    played: row.played,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    points: row.points,
  }));
}

const LAST_COMPLETED_GAMEWEEK = CURRENT_GAMEWEEK - 1;

export const STANDINGS: StandingsRow[] = (() => {
  const table = computeStandingsThroughGameweek(LAST_COMPLETED_GAMEWEEK);
  const rows = tallyToStandings(table);

  // Attach this gameweek's live/provisional score as `gwPoints`.
  const liveScoreByManagerId = new Map<string, number>();
  CURRENT_GW_MATCHUPS.forEach((matchup) => {
    liveScoreByManagerId.set(matchup.manager1.id, matchup.score1);
    liveScoreByManagerId.set(matchup.manager2.id, matchup.score2);
  });

  return rows.map((row) => ({
    ...row,
    gwPoints: liveScoreByManagerId.get(row.manager.id),
  }));
})();

// ---------------------------------------------------------------------------
// Rank-over-time (for the manager profile sparkline). Includes the live
// current gameweek as a provisional final data point.
// ---------------------------------------------------------------------------

export function getRankHistory(managerId: string): RankHistoryPoint[] {
  const points: RankHistoryPoint[] = [];
  for (let gw = 1; gw <= CURRENT_GAMEWEEK; gw++) {
    const table = computeStandingsThroughGameweek(gw);
    const rows = tallyToStandings(table);
    const row = rows.find((r) => r.manager.id === managerId);
    if (row) {
      points.push({ gameweek: gw, rank: row.rank });
    }
  }
  return points;
}

// ---------------------------------------------------------------------------
// Form guide / streaks / best-worst gameweeks
// ---------------------------------------------------------------------------

export function getFormGuide(managerId: string): FormResult[] {
  const results: FormResult[] = [];

  for (let gw = 1; gw <= CURRENT_GAMEWEEK; gw++) {
    const pairs = pairingsForGameweek(gw);
    pairs.forEach(([manager1, manager2], i) => {
      const result = getMatchResult(gw, i);
      if (!result) return;
      if (result.isLive) return; // only confirmed results count toward form/streaks

      if (manager1.id === managerId) {
        const outcome: FormResult["result"] =
          result.score1 > result.score2 ? "W" : result.score1 < result.score2 ? "L" : "D";
        results.push({
          gameweek: gw,
          result: outcome,
          pointsFor: result.score1,
          pointsAgainst: result.score2,
          opponent: manager2,
        });
      } else if (manager2.id === managerId) {
        const outcome: FormResult["result"] =
          result.score2 > result.score1 ? "W" : result.score2 < result.score1 ? "L" : "D";
        results.push({
          gameweek: gw,
          result: outcome,
          pointsFor: result.score2,
          pointsAgainst: result.score1,
          opponent: manager1,
        });
      }
    });
  }

  return results.sort((a, b) => a.gameweek - b.gameweek);
}

export function getCurrentStreak(managerId: string): { type: "W" | "D" | "L"; count: number } | null {
  const form = getFormGuide(managerId).slice().reverse();
  if (form.length === 0) return null;

  const type = form[0].result;
  let count = 0;
  for (const entry of form) {
    if (entry.result === type) {
      count += 1;
    } else {
      break;
    }
  }
  return { type, count };
}

export function getBestAndWorstGameweek(managerId: string): {
  best: FormResult | null;
  worst: FormResult | null;
} {
  const form = getFormGuide(managerId);
  if (form.length === 0) return { best: null, worst: null };

  const best = form.reduce((a, b) => (b.pointsFor > a.pointsFor ? b : a));
  const worst = form.reduce((a, b) => (b.pointsFor < a.pointsFor ? b : a));
  return { best, worst };
}

export function getHeadToHeadRecord(managerId: string, opponentId: string): HeadToHeadRecord {
  const record: HeadToHeadRecord = { wins: 0, draws: 0, losses: 0 };
  const form = getFormGuide(managerId);
  form.forEach((entry) => {
    if (entry.opponent.id !== opponentId) return;
    if (entry.result === "W") record.wins += 1;
    else if (entry.result === "D") record.draws += 1;
    else record.losses += 1;
  });
  return record;
}

// ---------------------------------------------------------------------------
// Mock player-by-player breakdown for expanded "This Gameweek" cards.
// ---------------------------------------------------------------------------

const SQUAD_SHAPE: MockPlayerLine["position"][] = [
  "GK",
  "DEF",
  "DEF",
  "DEF",
  "DEF",
  "MID",
  "MID",
  "MID",
  "MID",
  "FWD",
  "FWD",
];

export function getMockSquad(manager: Manager, totalPoints: number): MockPlayerLine[] {
  const rand = mulberry32(hashSeed(manager.id) + totalPoints);
  const weights = SQUAD_SHAPE.map(() => 0.4 + rand() * 1.2);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const positionCounts = new Map<MockPlayerLine["position"], number>();
  const players: MockPlayerLine[] = SQUAD_SHAPE.map((position, i) => {
    const count = (positionCounts.get(position) ?? 0) + 1;
    positionCounts.set(position, count);
    const raw = (weights[i] / weightSum) * totalPoints;
    return {
      name: `${position} ${count}`,
      position,
      points: Math.max(0, Math.round(raw)),
    };
  });

  // Nudge rounding error onto the highest scorer so the displayed total
  // matches the card's headline score exactly.
  const roundedSum = players.reduce((a, p) => a + p.points, 0);
  const diff = totalPoints - roundedSum;
  if (diff !== 0) {
    const top = players.reduce((a, b) => (b.points > a.points ? b : a));
    top.points = Math.max(0, top.points + diff);
  }

  return players;
}

function hashSeed(input: string): number {
  let hash = 7;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
