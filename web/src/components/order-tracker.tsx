import type { Order } from "@/lib/types";
import {
  PICK_PACK_STAGES,
  STATUS_ICONS,
  STATUS_LABELS,
  STATUS_MESSAGES,
  isStageComplete,
} from "@/lib/order-status";

function eventTimeForStage(
  order: Order,
  stage: (typeof PICK_PACK_STAGES)[number],
): string | undefined {
  const events = order.statusEvents.filter((e) => e.status === stage);
  const latest = events[events.length - 1];
  return latest?.createdAt;
}

export function OrderTracker({ order }: { order: Order }) {
  const currentIdx = PICK_PACK_STAGES.indexOf(order.status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="font-display text-lg font-bold text-navy">
        Pick · Pack · Ship
      </h2>
      <p className="mt-1 text-sm text-slate-brand">
        {STATUS_MESSAGES[order.status]}
      </p>

      <ol className="mt-8 space-y-0">
        {PICK_PACK_STAGES.map((stage, idx) => {
          const complete = isStageComplete(stage, order.status);
          const active = stage === order.status;
          const timestamp = eventTimeForStage(order, stage);

          return (
            <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
              {idx < PICK_PACK_STAGES.length - 1 && (
                <span
                  className={`absolute left-5 top-10 h-full w-0.5 ${
                    complete && idx < currentIdx ? "bg-success" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              )}
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                  complete
                    ? active
                      ? "bg-orange text-white ring-4 ring-orange/20"
                      : "bg-success text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {complete ? STATUS_ICONS[stage] : "○"}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p
                  className={`font-semibold ${
                    complete ? "text-navy" : "text-slate-brand"
                  }`}
                >
                  {STATUS_LABELS[stage]}
                </p>
                {timestamp && (
                  <p className="mt-0.5 text-xs text-slate-brand">
                    {new Date(timestamp).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {active && stage === "despatched" && order.trackingNumber && (
                  <p className="mt-2 text-sm">
                    {order.carrier && (
                      <span className="font-medium text-navy">{order.carrier}: </span>
                    )}
                    <span className="font-mono text-orange">{order.trackingNumber}</span>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {order.status === "despatched" && order.trackingNumber && (
        <p className="mt-4 rounded-lg bg-navy/5 px-4 py-3 text-sm text-slate-brand">
          Need it faster? Call us on{" "}
          <a href="tel:01474555555" className="font-semibold text-orange hover:underline">
            01474 555 555
          </a>
        </p>
      )}
    </div>
  );
}
