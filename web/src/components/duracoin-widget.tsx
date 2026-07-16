import { DURACOIN_MILESTONES } from "@/lib/loyalty";
import type { LoyaltySummary } from "@/lib/types";

export function DuraCoinWidget({ loyalty }: { loyalty: LoyaltySummary }) {
  return (
    <section className="rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/10 to-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange">
            DuraCoins
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold text-navy">
            {loyalty.balance.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-slate-brand">
            £1 spent = 1 coin. Yes, we reward you for fixing machines.
          </p>
        </div>
        {loyalty.isProMember && (
          <span className="shrink-0 rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">
            PRO
          </span>
        )}
      </div>

      {loyalty.nextMilestone ? (
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-slate-brand">
            <span>Next reward</span>
            <span>
              {loyalty.balance} / {loyalty.nextMilestone.coins}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-orange transition-all"
              style={{ width: `${loyalty.progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-medium text-navy">
            {loyalty.nextMilestone.label}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-success">
          Top tier unlocked — DuraForge Pro status active.
        </p>
      )}

      <ul className="mt-5 space-y-1 border-t border-orange/20 pt-4 text-xs text-slate-brand">
        {DURACOIN_MILESTONES.map((m) => (
          <li key={m.coins} className="flex justify-between gap-2">
            <span>{m.label}</span>
            <span className="font-mono font-bold text-navy">{m.coins}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
