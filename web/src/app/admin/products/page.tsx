import { getAdminProducts } from "@/lib/store";
import { gbp } from "@/lib/format";

export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-navy">Products</h2>
      <p className="mt-1 text-sm text-amber-800">
        ⚠️ Cost columns below are <strong>admin only</strong> — never shown to customers.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-brand">
            <tr>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Brand</th>
              <th className="px-3 py-3 bg-amber-50">Purchase GBP</th>
              <th className="px-3 py-3 bg-amber-50">Landing GBP</th>
              <th className="px-3 py-3 bg-amber-50">Purchase INR</th>
              <th className="px-3 py-3">Sale GBP</th>
              <th className="px-3 py-3">Margin</th>
              <th className="px-3 py-3">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs font-bold">{p.sku}</td>
                <td className="max-w-[200px] truncate px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.brand}</td>
                <td className="px-3 py-2 bg-amber-50/50 font-mono text-amber-900">
                  {gbp(p.purchasePriceGbp)}
                </td>
                <td className="px-3 py-2 bg-amber-50/50 font-mono text-amber-900">
                  {gbp(p.landingPriceGbp)}
                </td>
                <td className="px-3 py-2 bg-amber-50/50 font-mono text-amber-900">
                  ₹{p.purchasePriceInr.toLocaleString()}
                </td>
                <td className="px-3 py-2 font-semibold">{gbp(p.salePriceExVat)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`font-bold ${
                      p.marginPct >= 30 ? "text-success" : "text-navy"
                    }`}
                  >
                    {p.marginPct}%
                  </span>
                </td>
                <td className="px-3 py-2">{p.stockQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-brand">
        {products.length} products · seeded from catalogue. Customer shop still reads sale
        price only from the public catalogue layer.
      </p>
    </div>
  );
}
