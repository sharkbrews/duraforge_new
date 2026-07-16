"use client";

import { useState } from "react";
import { AddToBasketButton } from "@/components/add-to-basket-button";
import { Product, savingsPercent } from "@/lib/products";
import { gbp } from "@/lib/format";

const tabs = ["Spec", "Kit contents", "Fits", "Cross-reference"] as const;
type Tab = (typeof tabs)[number];

export function ProductDetail({ product }: { product: Product }) {
  const [tab, setTab] = useState<Tab>("Spec");
  const [showVat, setShowVat] = useState(false);
  const saving = savingsPercent(product);
  const price = showVat ? product.price * 1.2 : product.price;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Left: summary / buy box */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded bg-navy/10 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-navy">
            {product.sku}
          </span>
          <span className="rounded bg-orange/10 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-orange">
            {product.material}
          </span>
        </div>

        <h1 className="mt-3 font-display text-2xl font-extrabold text-navy sm:text-3xl">
          {product.name}
        </h1>
        <p className="mt-2 text-sm text-slate-brand">
          {product.rod}mm rod × {product.bore}mm bore × {product.height}mm — {product.material}
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-brand line-through">
                FPE Seals {gbp(product.fpePrice)}
              </p>
              <p className="font-display text-3xl font-extrabold text-navy">
                {gbp(price)}
                <span className="ml-1 text-sm font-medium text-slate-brand">
                  {showVat ? "inc-VAT" : "ex-VAT"}
                </span>
              </p>
              {saving > 0 && (
                <p className="mt-1 text-sm font-bold text-success">
                  Save {gbp(product.fpePrice - product.price)} — {saving}% cheaper. You&apos;re
                  welcome.
                </p>
              )}
            </div>
            <button
              onClick={() => setShowVat((v) => !v)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-brand transition-colors hover:border-orange hover:text-orange"
            >
              {showVat ? "Show ex-VAT" : "Show inc-VAT"}
            </button>
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                product.stock <= 8 ? "bg-orange" : "bg-success"
              }`}
            />
            {product.stock <= 8 ? (
              <span className="text-orange">Low stock — only {product.stock} left</span>
            ) : (
              <span className="text-success">
                In stock — ships today if you order before 11am
              </span>
            )}
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-start">
            <AddToBasketButton sku={product.sku} className="flex-1 rounded-lg bg-orange px-5 py-3 font-semibold text-white transition-colors hover:bg-orange-600" />
            <a
              href={`https://wa.me/440000000000?text=Hi%20Duraforge%2C%20I%20need%20the%20${encodeURIComponent(
                product.sku,
              )}%20kit`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-navy transition-colors hover:border-orange hover:text-orange"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-brand">
          Made in {product.madeIn}, re-labelled and packed in Kent. No minimum order.
        </p>
      </div>

      {/* Right: tabs */}
      <div>
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "border-orange text-orange"
                  : "border-transparent text-slate-brand hover:text-navy"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="pt-5">
          {tab === "Spec" && (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {[
                  ["Rod diameter (Ø)", `${product.rod} mm`],
                  ["Bore diameter (Ø)", `${product.bore} mm`],
                  ["Seal height", `${product.height} mm`],
                  ["Material", product.material],
                  ["Hardness", `${product.hardnessShoreA} Shore A`],
                  ["Temperature range", `${product.tempMinC}°C to ${product.tempMaxC}°C`],
                  ["Pressure rating", `${product.pressureBar} bar`],
                  ["Country of origin", product.madeIn],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-2.5 pr-4 text-slate-brand">{k}</td>
                    <td className="py-2.5 font-semibold text-ink">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Kit contents" && (
            <ul className="space-y-2">
              {product.contents.map((c) => (
                <li
                  key={c.item}
                  className="flex items-center justify-between rounded-lg bg-canvas px-4 py-2.5 text-sm"
                >
                  <span className="text-ink">{c.item}</span>
                  <span className="font-mono font-semibold text-navy">×{c.qty}</span>
                </li>
              ))}
            </ul>
          )}

          {tab === "Fits" && (
            <ul className="space-y-2">
              {product.fits.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-ink">
                  <span className="text-orange">✓</span>
                  {f}
                </li>
              ))}
              <li className="pt-2 text-xs text-slate-brand">
                Not sure it&apos;s the right one? Send us the machine and cylinder — we&apos;ll
                confirm before you buy.
              </li>
            </ul>
          )}

          {tab === "Cross-reference" && (
            <div>
              <p className="mb-3 text-sm text-slate-brand">This kit replaces:</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-brand">
                    <th className="pb-2">Source</th>
                    <th className="pb-2">Part number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.crossRefs.map((c) => (
                    <tr key={`${c.source}-${c.part}`}>
                      <td className="py-2.5 text-slate-brand">{c.source}</td>
                      <td className="py-2.5 font-mono font-semibold text-ink">{c.part}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 rounded-lg bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                Ours is {saving}% cheaper than the FPE equivalent.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
