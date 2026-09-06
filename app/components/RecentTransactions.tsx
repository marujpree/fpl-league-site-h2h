import { clubBadgeUrl } from "@/lib/player-images";
import type { RecentTransaction, RecentTransactionPlayer } from "@/lib/data";

export default function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
        No squad moves yet — waiver claims and trades will show up here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((t) => (
        <li
          key={t.id}
          className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 rounded-xl border border-card-border bg-card p-4 text-sm"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            {/* Waivers and trades read very differently -- one manager
                shuffling their own squad versus two agreeing a swap -- and on
                a tab that's nothing but moves, that's the distinction worth
                being able to scan for. */}
            <span className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  t.kind === "trade" ? "bg-accent/10 text-accent-strong" : "bg-live/10 text-live"
                }`}
              >
                {t.kind === "trade" ? "Trade" : "Waiver"}
              </span>
              <span className="min-w-0 truncate font-medium text-foreground">{t.managerLabel}</span>
            </span>
            <span className="leading-relaxed">
              {t.kind === "trade" ? (
                <>
                  <PlayerChip player={t.playerOut} /> <span className="text-muted">for</span>{" "}
                  <PlayerChip player={t.playerIn} />
                </>
              ) : (
                <>
                  <span className="text-muted">dropped</span> <PlayerChip player={t.playerOut} />
                  <span className="text-muted">, added</span> <PlayerChip player={t.playerIn} />
                </>
              )}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted">GW{t.gameweek}</span>
        </li>
      ))}
    </ul>
  );
}

function PlayerChip({ player }: { player: RecentTransactionPlayer }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <img
        src={clubBadgeUrl(player.clubCode)}
        alt=""
        width={14}
        height={14}
        loading="lazy"
        className="h-3.5 w-3.5 shrink-0"
      />
      <span className="font-medium text-foreground">{player.name}</span>
      <span className="text-[10px] font-semibold uppercase text-muted">{player.position}</span>
    </span>
  );
}
