import PlayersView from "@/components/PlayersView";
import { getAllPlayers } from "@/lib/data";

export default async function PlayersPage() {
  const players = await getAllPlayers();

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Players
        </h1>
        <p className="text-sm text-muted">Search any player to see their points and who owns them</p>
      </div>

      <PlayersView players={players} />
    </div>
  );
}
