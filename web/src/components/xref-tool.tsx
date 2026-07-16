"use client";

import { useState } from "react";
import Link from "next/link";
import { crossRefLookup, savingsPercent, Product } from "@/lib/products";
import { gbp } from "@/lib/format";

const examples = ["332Y6440", "FE-162-4", "340-4687", "332Y6462"];

export function XrefTool() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<Product | undefined>(undefined);

  function run(q: string) {
    setQuery(q);
    setResult(crossRefLookup(q));
    setSearched(true);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter FPE / Hallite / JCB / CAT part number…"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
          />
          <button
            type="submit"
            className="rounded-lg bg-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Find equivalent
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-brand">
          <span>Try:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => run(ex)}
              className="rounded border border-slate-200 px-2 py-0.5 font-mono hover:border-orange"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {searched && result && (
        <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-6">
          <p className="text-sm font-bold text-success">Match found — and it&apos;s cheaper.</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-brand">
                Replaces{" "}
                <span className="font-mono font-bold text-navy">
                  {result.crossRefs[0]?.source} {result.crossRefs[0]?.part}
                </span>
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                {result.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-slate-brand">{result.sku}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-brand line-through">FPE {gbp(result.fpePrice)}</p>
              <p className="font-display text-2xl font-extrabold text-navy">
                {gbp(result.price)}
                <span className="ml-1 text-xs font-medium text-slate-brand">ex-VAT</span>
              </p>
              <p className="text-sm font-bold text-success">
                Ours is {savingsPercent(result)}% cheaper. Add to basket?
              </p>
              <Link
                href={`/product/${result.sku}`}
                className="mt-3 inline-block rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                View kit →
              </Link>
            </div>
          </div>
        </div>
      )}

      {searched && !result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-display text-lg font-bold text-navy">
            No direct match in the online list — yet.
          </p>
          <p className="mt-2 text-sm text-slate-brand">
            We stock thousands more off-catalogue.{" "}
            <a
              href="https://wa.me/440000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-orange hover:underline"
            >
              WhatsApp the part number
            </a>{" "}
            and we&apos;ll cross it for you.
          </p>
        </div>
      )}
    </div>
  );
}
