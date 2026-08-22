import PLFixturesView from "@/components/PLFixturesView";
import { getPLFixtures, TOTAL_GAMEWEEKS } from "@/lib/data";

export default async function PLFixturesPage() {
  const { fixtures, currentGameweek } = await getPLFixtures();

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          PL Fixtures
        </h1>
        <p className="text-sm text-muted">
          Full Premier League match schedule &middot; kickoff times shown in your local time
        </p>
      </div>

      <PLFixturesView fixtures={fixtures} currentGameweek={currentGameweek} totalGameweeks={TOTAL_GAMEWEEKS} />
    </div>
  );
}
