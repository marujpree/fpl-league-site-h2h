import FixturesView from "@/components/FixturesView";
import { getCurrentGameweek, getFixtures, TOTAL_GAMEWEEKS } from "@/lib/data";

export default async function FixturesPage() {
  const [fixtures, gameweek] = await Promise.all([getFixtures(), getCurrentGameweek()]);
  const currentGw = gameweek?.id ?? null;

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Fixtures
        </h1>
        <p className="text-sm text-muted">
          Full {TOTAL_GAMEWEEKS}-gameweek schedule &middot; tap a matchup for its head to head history
        </p>
      </div>

      <FixturesView
        fixtures={fixtures}
        currentGw={currentGw}
        // Fixture-derived, not the stored `is_finished` flag: a gameweek is
        // done when its matches are done, whether or not anything has
        // written that down yet.
        currentGwFinal={gameweek?.status.isComplete ?? false}
        totalGameweeks={TOTAL_GAMEWEEKS}
      />
    </div>
  );
}
