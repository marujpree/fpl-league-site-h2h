import type { RecentTransaction } from "@/lib/data";

export default function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  if (transactions.length === 0) return null;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Recent Transactions</p>
      <ul className="flex flex-col gap-2.5">
        {transactions.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 text-foreground">{t.summary}</span>
            <span className="shrink-0 text-xs text-muted">GW{t.gameweek}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
