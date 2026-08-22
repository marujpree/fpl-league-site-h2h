// Types for the public FPL Draft API (https://draft.premierleague.com/api).
// Shapes confirmed by hand against the live API for league 49277
// ("Sigma Chi FC") — this is a Draft league with Classic scoring
// (`scoring: "c"`), not native H2H, hence lib/schedule.ts.

// ---- /league/{id}/details ----

export interface FplLeagueEntry {
  entry_id: number;
  entry_name: string;
  id: number;
  joined_time: string;
  player_first_name: string;
  player_last_name: string;
  short_name: string;
  waiver_pick: number;
}

export interface FplLeagueStandingRow {
  event_total: number | null;
  last_rank: number | null;
  league_entry: number;
  rank: number | null;
  rank_sort: number | null;
  total: number;
}

export interface FplLeagueDetails {
  league: {
    admin_entry: number;
    closed: boolean;
    id: number;
    name: string;
    scoring: "c" | "h"; // classic | head-to-head
    start_event: number;
    stop_event: number;
    draft_status: string;
  };
  league_entries: FplLeagueEntry[];
  standings: FplLeagueStandingRow[];
}

// ---- /bootstrap-static ----

export interface FplGameweek {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  average_entry_score: number | null;
  highest_scoring_entry: number | null;
  trades_time: string;
  waivers_time: string;
}

export interface FplTeam {
  id: number;
  code: number;
  name: string;
  short_name: string;
  pulse_id: number;
}

export interface FplElementType {
  id: number;
  singular_name_short: string;
  plural_name_short: string;
}

export interface FplElement {
  id: number;
  code: number; // used to build official photo URLs, see SquadPlayer.photoCode
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number;
  total_points: number;
  status: string; // "a" available, "i" injured, etc.
}

export interface FplFixture {
  id: number;
  event: number;
  kickoff_time: string;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  minutes: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
}

export interface FplBootstrap {
  events: {
    current: number | null;
    next: number | null;
    data: FplGameweek[];
  };
  teams: FplTeam[];
  element_types: FplElementType[];
  elements: FplElement[];
  // keyed by gameweek id (as a string) -> fixtures for that gameweek
  fixtures: Record<string, FplFixture[]>;
}

// ---- /game ----

export interface FplGameState {
  current_event: number | null;
  current_event_finished: boolean;
  next_event: number | null;
  processing_status: string;
  waivers_processed: boolean;
}

// ---- /event/{gw}/live ----

export interface FplLiveElementStats {
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  bonus: number;
}

export interface FplEventLive {
  elements: Record<string, { stats: FplLiveElementStats }>;
}

// ---- /league/{id}/element-status ----
// Draft leagues assign players permanently at draft time (unlike Classic's
// per-gameweek picks) -- this is the source of truth for "who owns whom"
// and is available as soon as the draft finishes, independent of whether
// the season has started.

export interface FplElementStatus {
  element: number; // matches FplElement.id from bootstrap-static
  owner: number | null; // matches FplLeagueEntry.entry_id, or null if undrafted/free agent
  status: string;
}

// ---- /entry/{entry_id}/event/{gw} ----
// Returns the literal string "No pick history" (not JSON) before a
// manager's squad has ever been set for that gameweek — callers must
// handle a non-JSON / non-ok response, not just parse-and-go.

export interface FplEntryEventPick {
  element: number;
  /** Squad slot, 1-15. 1-11 = starting XI, 12-15 = bench. NOTE: unlike
   * Classic FPL, Draft does NOT zero out `multiplier` for benched players
   * (it's 1 for everyone pre-captain) -- `position`, not `multiplier`, is
   * the actual starting/bench signal here. */
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplEntryEventResponse {
  picks: FplEntryEventPick[];
  entry_history?: { points: number; event: number };
}

// ---- Domain types ----
// A simplified, UI-facing shape decoupled from raw API responses — the same
// contract components/mock-data.ts already exposes, so pages don't need to
// change when real data replaces mock data.

export interface Manager {
  id: string; // slug, e.g. "reyes-fc" — stable across mock + real data
  displayName: string;
  teamName: string;
  initials: string; // FPL league_entries.short_name, e.g. "SR"
  accentColor: string;
}

export interface StandingsRow {
  manager: Manager;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gwPoints?: number;
}

export interface MatchupSummary {
  gameweek: number;
  manager1: Manager;
  manager2: Manager;
  score1?: number; // undefined until the manager's picks lock for this GW
  score2?: number;
  isLive: boolean;
  isProvisional: boolean; // bonus points can still shift for ~1hr post-match (PRD §5)
  headToHead?: PairRecord;
}

export interface FixtureEntry {
  gameweek: number;
  manager1: Manager;
  manager2: Manager;
  score1?: number;
  score2?: number;
  played: boolean;
  isLive?: boolean;
  isProvisional?: boolean;
  headToHead?: PairRecord;
}

export interface SquadPlayer {
  id: number;
  name: string; // FPL web_name, e.g. "Salah"
  position: "GKP" | "DEF" | "MID" | "FWD";
  club: string; // club short_name, e.g. "LIV"
  teamId: number; // FplTeam.id -- joins against FplFixture.team_h/team_a
  seasonPoints: number;
  status: string; // "a" available, "i" injured, "d" doubtful, "s" suspended, "u" unavailable
  /** Builds a photo URL: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${photoCode}.png` */
  photoCode: number;
  /** Builds a badge URL: `https://resources.premierleague.com/premierleague/badges/70/t${clubCode}.png` */
  clubCode: number;
}

/** A player's real-world fixture(s) for one gameweek -- almost always one,
 * but a double gameweek gives a player two. */
export interface LineupFixture {
  opponentShortName: string;
  isHome: boolean;
  started: boolean;
  finished: boolean;
}

export interface LineupPlayer extends SquadPlayer {
  isCaptain: boolean;
  isViceCaptain: boolean;
  /** This gameweek's live points so far, already multiplier-adjusted (i.e.
   * doubled for the captain) -- same math as /api/poll. */
  livePoints: number;
  fixtures: LineupFixture[];
}

export interface PlayerListEntry extends SquadPlayer {
  owner: Manager | null; // null = free agent
}

export interface GameweekLineup {
  starting: LineupPlayer[];
  bench: LineupPlayer[];
  /** Sum of the starting XI's live points -- bench doesn't count, same as
   * real FPL's "Latest Points" figure. */
  totalPoints: number;
}

export interface RankHistoryPoint {
  gameweek: number;
  rank: number;
}

export interface FormResult {
  gameweek: number;
  result: "W" | "D" | "L";
  pointsFor: number;
  pointsAgainst: number;
  opponent: Manager;
}

export interface HeadToHeadRecord {
  wins: number;
  draws: number;
  losses: number;
}

/** Season-to-date record between two specific managers, from a neutral
 * (not either manager's) point of view -- used on matchup/fixture rows. */
export interface PairRecord {
  manager1Wins: number;
  draws: number;
  manager2Wins: number;
  meetings: number;
}

export const TOTAL_GAMEWEEKS = 38;
