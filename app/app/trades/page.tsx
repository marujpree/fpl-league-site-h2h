import RecentTransactions from "@/components/RecentTransactions";
import { getRecentTransactions } from "@/lib/data";

// A dedicated tab rather than a block on News: a gameweek makes four
// headlines and a waiver window makes a dozen moves, so mixing them buried
// the news under roster churn every single week.
const MOVES_SHOWN = 50;

export default async function TradesPage() {
  const transactions = await getRecentTransactions(MOVES_SHOWN);

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">Trades</h1>
        <p className="text-sm text-muted">
          Every squad move &middot; waiver claims and manager-to-manager trades
        </p>
      </div>

      <RecentTransactions transactions={transactions} />
    </div>
  );
}
