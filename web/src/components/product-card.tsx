import Link from "next/link";
import { Product, savingsPercent } from "@/lib/products";
import { gbp } from "@/lib/format";

const materialLabels: Record<string, string> = {
  NBR: "NBR (Nitrile)",
  PU: "PU (Polyurethane)",
  PTFE: "PTFE",
  FKM: "FKM (Viton)",
};

export function ProductCard({ product }: { product: Product }) {
  const saving = savingsPercent(product);
  const lowStock = product.stock <= 8;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-1 hover:border-orange hover:shadow-lg">
      <div className="flex items-start justify-between border-b border-slate-100 bg-canvas px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded bg-navy/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-navy">
            {product.brand}
          </span>
          <span className="rounded bg-orange/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-orange">
            {product.material}
          </span>
        </div>
        {saving > 0 && (
          <span className="rounded bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
            −{saving}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <Link href={`/product/${product.sku}`}>
            <h3 className="min-h-[44px] font-display text-sm font-bold leading-snug text-navy transition-colors group-hover:text-orange">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1.5 font-mono text-[11px] text-slate-brand">{product.sku}</p>
          <p className="mt-2 text-xs text-slate-brand">
            Rod <strong className="text-ink">{product.rod}mm</strong> · Bore{" "}
            <strong className="text-ink">{product.bore}mm</strong> · H{" "}
            <strong className="text-ink">{product.height}mm</strong>
          </p>
          <p className="mt-1 text-xs text-slate-brand" title={materialLabels[product.material]}>
            {materialLabels[product.material]}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${lowStock ? "bg-orange" : "bg-success"}`}
            />
            <span className={lowStock ? "text-orange" : "text-success"}>
              {lowStock
                ? `Low stock — ${product.stock} left`
                : "In stock — ships today before 11am"}
            </span>
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-[10px] text-slate-brand line-through">
              FPE {gbp(product.fpePrice)}
            </p>
            <p className="font-display text-xl font-extrabold text-navy">
              {gbp(product.price)}
              <span className="ml-1 text-[10px] font-medium text-slate-brand">ex-VAT</span>
            </p>
          </div>
          <Link
            href={`/product/${product.sku}`}
            className="rounded-lg bg-orange px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
          >
            View kit
          </Link>
        </div>
      </div>
    </div>
  );
}
