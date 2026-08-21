import MatchupCard from "@/components/MatchupCard";
import { CURRENT_GAMEWEEK, CURRENT_GW_MATCHUPS } from "@/components/mock-data";

// NOTE: mock data -- see components/mock-data.ts. GW6 is fabricated as the
// "current, in-progress" gameweek so live/provisional UI states are visible.

export default function GameweekPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          This Gameweek
        </h1>
        <p className="text-sm text-muted">Gameweek {CURRENT_GAMEWEEK} matchups</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CURRENT_GW_MATCHUPS.map((matchup) => (
          <MatchupCard key={`${matchup.manager1.id}-${matchup.manager2.id}`} matchup={matchup} />
        ))}
      </div>
    </div>
  );
}
