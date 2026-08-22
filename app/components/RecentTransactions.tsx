import { clubBadgeUrl } from "@/lib/player-images";
import type { RecentTransaction, RecentTransactionPlayer } from "@/lib/data";

export default function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  if (transactions.length === 0) return null;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Recent Transactions</p>
      <ul className="flex flex-col gap-3">
        {transactions.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium text-foreground">{t.managerLabel}: </span>
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
            <span className="shrink-0 text-xs text-muted">GW{t.gameweek}</span>
          </li>
        ))}
      </ul>
    </div>
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
