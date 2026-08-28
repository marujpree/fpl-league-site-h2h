import PlayerAvatar from "./PlayerAvatar";
import type { LineupPlayer } from "@/lib/fpl-types";

const STATUS_LABEL: Record<string, string> = {
  i: "Injured",
  d: "Doubtful",
  s: "Suspended",
  u: "Unavailable",
};

type PitchPlayerCardProps = {
  player: LineupPlayer;
  /** False for the bench panel, whose background is light gray rather than
   * the green pitch -- flips text color so it stays legible. */
  onGreen?: boolean;
};

export default function PitchPlayerCard({ player, onGreen = true }: PitchPlayerCardProps) {
  const fixture = player.fixtures[0];
  const isDone = fixture ? fixture.finishedProvisional : false;
  const isLive = fixture ? fixture.started && !isDone : false;
  const injured = player.status !== "a";
  const fixtureTextClass = onGreen ? "text-white/90" : "text-foreground";

  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1 sm:w-20">
      <div className="relative">
        <PlayerAvatar
          photoCode={player.photoCode}
          position={player.position}
          clubCode={player.clubCode}
          size="lg"
        />

        {injured && (
          <span
            title={STATUS_LABEL[player.status] ?? player.status}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-loss text-[9px] font-bold text-white"
          >
            !
          </span>
        )}

        {(player.isCaptain || player.isViceCaptain) && (
          <span
            className={`absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${
              player.isCaptain ? "bg-accent-strong" : "bg-muted"
            }`}
          >
            {player.isCaptain ? "C" : "VC"}
          </span>
        )}

        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-accent-strong px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
          {player.livePoints}
        </span>
      </div>

      <div className="mt-1 flex max-w-full flex-col items-center gap-0.5">
        <span className="max-w-full truncate rounded bg-accent-strong px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {player.name}
        </span>
        <span className={`flex items-center gap-1 text-[9px] font-medium ${fixtureTextClass}`}>
          {isLive && <span className="pl-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />}
          {isDone && (
            <span
              className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-win text-[7px] font-black leading-none text-white"
              aria-label="Played"
              title="Played"
            >
              &#10003;
            </span>
          )}
          {fixture ? `${fixture.opponentShortName} (${fixture.isHome ? "H" : "A"})` : "No fixture"}
        </span>
      </div>
    </div>
  );
}
