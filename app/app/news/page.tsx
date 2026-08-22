import NewsFeed from "@/components/NewsFeed";
import WaiverTrends from "@/components/WaiverTrends";
import { getNewsHeadlines, getWaiverTrends } from "@/lib/data";

export default async function NewsPage() {
  const [headlines, trends] = await Promise.all([getNewsHeadlines(), getWaiverTrends()]);

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">News</h1>
        <p className="text-sm text-muted">
          Auto-generated headlines &middot; blowouts, waiver moves, and trades
        </p>
      </div>

      <WaiverTrends trends={trends} />
      <NewsFeed headlines={headlines} />
    </div>
  );
}
