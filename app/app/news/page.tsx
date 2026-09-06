import NewsFeed from "@/components/NewsFeed";
import RecentTransactions from "@/components/RecentTransactions";
import { getNewsHeadlines, getRecentTransactions } from "@/lib/data";

export default async function NewsPage() {
  const [headlines, transactions] = await Promise.all([getNewsHeadlines(), getRecentTransactions()]);

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">News</h1>
        <p className="text-sm text-muted">
          Auto-generated headlines &middot; blowouts, waiver moves, and trades
        </p>
      </div>

      {/* Headlines first: they're what the page is for. Transactions are
          reference data and collapse out of the way. */}
      <NewsFeed headlines={headlines} />
      <RecentTransactions transactions={transactions} />
    </div>
  );
}
