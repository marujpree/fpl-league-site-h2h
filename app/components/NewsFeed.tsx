import type { NewsCategory, NewsHeadline } from "@/lib/fpl-types";

const CATEGORY_LABEL: Record<NewsCategory, string> = {
  "manager-of-week": "Manager of the Week",
  "biggest-loss": "Biggest Loser",
  "biggest-blowout": "Biggest Blowout",
  "manager-of-month": "Manager of the Month",
  "biggest-mover": "Biggest Mover",
  waiver: "Waiver Wire",
  trade: "Trade",
};

const CATEGORY_STYLE: Record<NewsCategory, string> = {
  "manager-of-week": "bg-win/10 text-win",
  "biggest-loss": "bg-loss/10 text-loss",
  "biggest-blowout": "bg-accent/10 text-accent-strong",
  "manager-of-month": "bg-accent/10 text-accent-strong",
  "biggest-mover": "bg-accent/10 text-accent-strong",
  waiver: "bg-live/10 text-live",
  trade: "bg-live/10 text-live",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NewsFeed({ headlines }: { headlines: NewsHeadline[] }) {
  if (headlines.length === 0) {
    return (
      <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
        No news yet — check back once a gameweek finishes or someone makes a move.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {headlines.map((item) => (
        <li key={item.id} className="rounded-xl border border-card-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_STYLE[item.category]}`}
            >
              {CATEGORY_LABEL[item.category]}
            </span>
            <span className="text-xs text-muted">
              {item.subtext ? `${item.subtext} · ` : ""}
              {formatDate(item.timestamp)}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug text-foreground">{item.headline}</p>
        </li>
      ))}
    </ul>
  );
}
