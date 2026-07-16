import { getAdminCustomers } from "@/lib/store";
import { gbp } from "@/lib/format";
import { AdminCoinAdjust } from "@/components/admin-coin-adjust";

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-navy">Customers</h2>
      <p className="mt-1 text-sm text-slate-brand">
        Trade accounts, DuraCoin balances, and manual goodwill adjustments.
      </p>

      <div className="mt-6 space-y-4">
        {customers.map((c) => (
          <article
            key={c.id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{c.companyName}</p>
                <p className="text-sm text-slate-brand">{c.email}</p>
                <p className="mt-1 text-xs text-slate-brand">
                  {c.orderCount} orders · {gbp(c.totalSpentIncVat)} lifetime spend
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-extrabold text-orange">
                  {c.duraCoinsBalance.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-slate-brand">DuraCoins</p>
                {c.isProMember && (
                  <span className="mt-1 inline-block rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">
                    PRO
                  </span>
                )}
              </div>
            </div>
            <AdminCoinAdjust
              userId={c.id}
              companyName={c.companyName}
              currentBalance={c.duraCoinsBalance}
            />
          </article>
        ))}
        {customers.length === 0 && (
          <p className="text-center text-slate-brand">No customer accounts yet.</p>
        )}
      </div>
    </div>
  );
}
