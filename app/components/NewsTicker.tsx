import Link from "next/link";
import type { NewsHeadline } from "@/lib/fpl-types";

export default function NewsTicker({ headlines }: { headlines: NewsHeadline[] }) {
  if (headlines.length === 0) return null;

  // Duplicated so the -50% translateX loop is seamless.
  const items = [...headlines, ...headlines];

  return (
    <Link
      href="/news"
      className="block overflow-hidden border-b border-card-border bg-background-elevated py-1.5"
      aria-label="View all news"
    >
      <div className="pl-ticker-track flex w-max items-center gap-10 whitespace-nowrap">
        {items.map((item, i) => (
          <span key={`${item.id}-${i}`} className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted">
            <span className="pl-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />
            {item.headline}
          </span>
        ))}
      </div>
    </Link>
  );
}
