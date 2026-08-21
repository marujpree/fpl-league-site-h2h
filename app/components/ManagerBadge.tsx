import type { Manager } from "./mock-data";

type ManagerBadgeProps = {
  manager: Manager;
  /** "dot" for a small round marker, "bar" for a thin vertical accent bar. */
  variant?: "dot" | "bar";
  subtitle?: string;
  className?: string;
};

export default function ManagerBadge({
  manager,
  variant = "dot",
  subtitle,
  className = "",
}: ManagerBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {variant === "bar" ? (
        <span
          aria-hidden
          className="h-6 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: manager.accentColor }}
        />
      ) : (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: manager.accentColor }}
        />
      )}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold text-foreground">{manager.teamName}</span>
        {subtitle !== undefined ? (
          <span className="truncate text-xs text-muted">{subtitle}</span>
        ) : (
          <span className="truncate text-xs text-muted">{manager.displayName}</span>
        )}
      </span>
    </span>
  );
}
