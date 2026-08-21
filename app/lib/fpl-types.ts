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

// ---- /entry/{entry_id}/event/{gw} ----
// Returns the literal string "No pick history" (not JSON) before a
// manager's squad has ever been set for that gameweek — callers must
// handle a non-JSON / non-ok response, not just parse-and-go.

export interface FplEntryEventPick {
  element: number;
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
  score1: number;
  score2: number;
  isLive: boolean;
  provisional?: boolean;
}
