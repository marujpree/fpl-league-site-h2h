// PRD §7 — H2H scheduling algorithm.
//
// Real FPL H2H generates a schedule once, at league lock, as a single
// round-robin (circle method) whose *initial pairing order* is randomized
// once at setup, then repeats that same round-robin pattern as a double
// round-robin across the season (second half mirrors the first). Since this
// league runs Draft + Classic scoring (not native H2H), we replicate that
// behavior ourselves against our own generated schedule.
//
// The shuffle is seeded (not Math.random()) so the schedule is reproducible
// across builds/deploys instead of silently reshuffling every time this
// module is imported.

export interface ScheduledFixture {
  gameweek: number;
  manager1Id: string;
  manager2Id: string;
}

const ROUNDS_PER_CYCLE = 9; // n-1 rounds for n=10 managers
const TOTAL_GAMEWEEKS = 38;

/** Small deterministic PRNG (mulberry32) so the "one-time random draw" is
 * reproducible from a fixed seed instead of relying on Math.random(). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Standard circle-method round-robin: fix the first element, rotate the
 * rest. Returns `n-1` rounds, each with `n/2` pairings. Requires even `n`. */
function circleMethodRoundRobin<T>(players: T[]): T[][][] {
  if (players.length % 2 !== 0) {
    throw new Error("circleMethodRoundRobin requires an even number of players");
  }
  const n = players.length;
  const fixed = players[0];
  const rotating = players.slice(1);
  const rounds: T[][][] = [];

  for (let round = 0; round < n - 1; round++) {
    const roundPairings: T[][] = [[fixed, rotating[0]]];
    for (let i = 1; i < n / 2; i++) {
      roundPairings.push([rotating[i], rotating[rotating.length - i]]);
    }
    rounds.push(roundPairings);
    rotating.unshift(rotating.pop() as T);
  }
  return rounds;
}

/**
 * Generates the full 38-gameweek H2H schedule for the given manager ids.
 * `scheduleSeed` defaults to a constant derived from the league ID (49277)
 * so the "random initial draw" is reproducible — pass a different seed only
 * if you deliberately want a different draw.
 */
export function generateSeasonSchedule(
  managerIds: string[],
  scheduleSeed = 49277
): ScheduledFixture[] {
  if (managerIds.length !== 10) {
    throw new Error(
      `generateSeasonSchedule expects exactly 10 managers, got ${managerIds.length}`
    );
  }

  const initialOrder = seededShuffle(managerIds, scheduleSeed);
  const rounds = circleMethodRoundRobin(initialOrder); // 9 rounds

  const fixtures: ScheduledFixture[] = [];
  for (let gw = 1; gw <= TOTAL_GAMEWEEKS; gw++) {
    const roundIndex = (gw - 1) % ROUNDS_PER_CYCLE;
    const pairings = rounds[roundIndex];
    for (const [a, b] of pairings) {
      fixtures.push({ gameweek: gw, manager1Id: a, manager2Id: b });
    }
  }
  return fixtures;
}

// The real 10 Sigma Chi FC managers (league 49277), in FPL league_entries
// order. Slugs match the ids already used by components/mock-data.ts and
// the /manager/[id] route so swapping mock data for real data later doesn't
// change any URLs.
export const LEAGUE_MANAGER_IDS = [
  "reyes-fc",
  "forest-team",
  "rw",
  "brunodagoat",
  "frankdatnk",
  "gooner-fc",
  "beans-n-rice-fc",
  "gordon-1s",
  "beginners-luck",
  "dobel-fc",
];

export const SEASON_SCHEDULE: ScheduledFixture[] = generateSeasonSchedule(
  LEAGUE_MANAGER_IDS
);
