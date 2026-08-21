import Link from "next/link";
import { getManagers, getHeadToHeadRecord } from "@/lib/data";
import type { Manager } from "@/lib/fpl-types";

type HeadToHeadGridProps = {
  manager: Manager;
};

export default async function HeadToHeadGrid({ manager }: HeadToHeadGridProps) {
  const managers = await getManagers();
  const opponents = managers.filter((m) => m.id !== manager.id);
  const records = await Promise.all(
    opponents.map((opponent) => getHeadToHeadRecord(manager.id, opponent.id))
  );

  return (
    <div className="overflow-hidden rounded-xl border border-card-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-background-elevated text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2.5 font-medium">Opponent</th>
            <th className="w-14 px-2 py-2.5 text-center font-medium">W</th>
            <th className="w-14 px-2 py-2.5 text-center font-medium">D</th>
            <th className="w-14 px-2 py-2.5 text-center font-medium">L</th>
          </tr>
        </thead>
        <tbody>
          {opponents.map((opponent, i) => {
            const record = records[i];
            return (
              <tr key={opponent.id} className="border-t border-card-border">
                <td className="px-3 py-2.5">
                  <Link
                    href={`/manager/${opponent.id}`}
                    className="flex items-center gap-2 hover:text-accent-strong"
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: opponent.accentColor }}
                    />
                    <span className="truncate">{opponent.teamName}</span>
                  </Link>
                </td>
                <td className="px-2 py-2.5 text-center font-semibold text-win">{record.wins}</td>
                <td className="px-2 py-2.5 text-center text-muted">{record.draws}</td>
                <td className="px-2 py-2.5 text-center font-semibold text-loss">{record.losses}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
