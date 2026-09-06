import { clubBadgeUrl } from "@/lib/player-images";
import type { RecentTransaction, RecentTransactionPlayer } from "@/lib/data";

export default function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  if (transactions.length === 0) return null;

  // Collapsed by default, and a plain <details> so this stays a Server
  // Component with no JavaScript behind it. Ten near-identical rows of
  // "X dropped A, added B" used to sit above the generated headlines and
  // push every one of them below the fold -- reference data outranking the
  // reason the page exists.
  return (
    <details className="group rounded-xl border border-card-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground">
        <span>
          Recent transactions
          <span className="ml-1.5 font-normal normal-case tracking-normal">
            ({transactions.length})
          </span>
        </span>
        <span aria-hidden className="transition-transform group-open:rotate-180">
          &#9662;
        </span>
      </summary>
      <ul className="flex flex-col gap-3 px-4 pb-4">
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
    </details>
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
