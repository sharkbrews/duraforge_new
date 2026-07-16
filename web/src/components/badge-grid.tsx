import { getBadgeDefinition, BADGES } from "@/lib/badges";
import type { UserBadgeEarned } from "@/lib/types";

export function BadgeGrid({ earned }: { earned: UserBadgeEarned[] }) {
  const earnedKeys = new Set(earned.map((b) => b.badgeKey));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-display font-bold text-navy">Badges &amp; achievements</h2>
      <p className="mt-1 text-sm text-slate-brand">
        Trade bragging rights. Earned by ordering, not by clicking ads.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {BADGES.map((badge) => {
          const unlocked = earnedKeys.has(badge.key);
          const earnedAt = earned.find((e) => e.badgeKey === badge.key)?.earnedAt;
          return (
            <li
              key={badge.key}
              className={`rounded-xl border p-4 ${
                unlocked
                  ? "border-success/40 bg-success/5"
                  : "border-slate-100 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{badge.icon}</span>
                <div>
                  <p className="font-bold text-navy">{badge.name}</p>
                  <p className="mt-1 text-xs text-slate-brand">{badge.description}</p>
                  {unlocked && earnedAt && (
                    <p className="mt-2 text-[10px] font-semibold uppercase text-success">
                      Earned {new Date(earnedAt).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
