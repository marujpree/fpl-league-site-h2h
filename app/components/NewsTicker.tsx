import Link from "next/link";
import type { TickerItem } from "@/lib/data";

export default function NewsTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  // Duplicated so the -50% translateX loop is seamless.
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-card-border bg-background-elevated py-1.5">
      <div className="pl-ticker-track flex w-max items-center gap-10 whitespace-nowrap">
        {loop.map((item, i) => (
          // Linked per item rather than wrapping the whole rail in one
          // anchor: the ticker now carries both league news and squad moves,
          // and those live on different tabs, so "click the thing you're
          // reading" has to take you to the right one.
          <Link
            key={`${item.id}-${i}`}
            href={item.href}
            // The duplicated half is decoration for the loop; only the first
            // pass should be reachable by keyboard or read aloud.
            aria-hidden={i >= items.length}
            tabIndex={i >= items.length ? -1 : undefined}
            className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <span className="pl-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />
            {item.headline}
          </Link>
        ))}
      </div>
    </div>
  );
}
