import type { Metadata } from "next";
import { products } from "@/lib/products";
import { ShopBrowser } from "@/components/shop-browser";

export const metadata: Metadata = {
  title: "Hydraulic Seal Kit Catalogue | Duraforge UK",
  description:
    "Browse Duraforge hydraulic seal kits for JCB, CAT, Hyva, Kubota, Takeuchi, Hyundai and Bobcat. 25–30% below FPE & Hallite. Trade prices ex-VAT.",
};

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-navy">Seal Kit Catalogue</h1>
        <p className="mt-2 text-slate-brand">
          Machine-specific rebuild kits, cross-referenced to OEM &amp; FPE part numbers. All
          prices ex-VAT. Same-day within 30 miles of Swanscombe if you order before 11am.
        </p>
      </div>
      <ShopBrowser products={products} />
    </div>
  );
}
