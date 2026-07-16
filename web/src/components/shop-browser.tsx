"use client";

import { useMemo, useState } from "react";
import { Product, allBrands, materials } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

type SortKey = "relevance" | "price-asc" | "price-desc";

export function ShopBrowser({
  products,
  initialBrandSlug = "All",
  lockBrand = false,
}: {
  products: Product[];
  initialBrandSlug?: string;
  lockBrand?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState(initialBrandSlug);
  const [material, setMaterial] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");

  const brands = useMemo(() => allBrands(), []);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.crossRefs.some((c) => c.part.toLowerCase().includes(q));
      const matchesBrand = brand === "All" || p.brandSlug === brand;
      const matchesMaterial = material === "All" || p.material === material;
      const matchesStock = !inStockOnly || p.stock > 0;
      return matchesQuery && matchesBrand && matchesMaterial && matchesStock;
    });

    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, query, brand, material, inStockOnly, sort]);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      {/* Filters */}
      <aside className="space-y-6">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-brand">Search</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, SKU, part no…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
          />
        </div>

        {!lockBrand && (
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-brand">Brand</label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange"
            >
              <option value="All">All brands</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name} ({b.count})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-brand">Material</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange"
          >
            <option value="All">All materials</option>
            {materials.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-orange"
          />
          In stock only
        </label>
      </aside>

      {/* Results */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-brand">
            {filtered.length} {filtered.length === 1 ? "kit" : "kits"}
          </p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="font-display text-lg font-bold text-navy">
              Hmm, nothing matched that.
            </p>
            <p className="mt-2 text-sm text-slate-brand">
              Try the part number instead, or clear a filter. Still stuck? WhatsApp us and
              we&apos;ll check the shelf.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
