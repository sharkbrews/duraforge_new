import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allBrands, getByBrandSlug } from "@/lib/products";
import { ShopBrowser } from "@/components/shop-browser";

export function generateStaticParams() {
  return allBrands().map((b) => ({ brand: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand } = await params;
  const info = allBrands().find((b) => b.slug === brand);
  if (!info) return { title: "Brand not found | Duraforge UK" };
  return {
    title: `${info.name} Seal Kits | Duraforge UK`,
    description: `${info.name} hydraulic cylinder seal kits, 25–30% below FPE & Hallite. Cross-referenced to OEM part numbers. Same-day delivery in Kent.`,
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const info = allBrands().find((b) => b.slug === brand);
  const items = getByBrandSlug(brand);
  if (!info || items.length === 0) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-4 text-sm text-slate-brand">
        <Link href="/shop" className="hover:text-orange">
          Shop
        </Link>{" "}
        / <span className="text-ink">{info.name}</span>
      </nav>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-navy">
          {info.name} Seal Kits
        </h1>
        <p className="mt-2 text-slate-brand">
          {info.count} kits in stock for {info.name} machines — cross-referenced and priced
          well below FPE.
        </p>
      </div>
      <ShopBrowser products={items} initialBrandSlug={brand} lockBrand />
    </div>
  );
}
