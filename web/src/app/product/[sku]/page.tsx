import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct, products, relatedProducts } from "@/lib/products";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";

export function generateStaticParams() {
  return products.map((p) => ({ sku: p.sku }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sku: string }>;
}): Promise<Metadata> {
  const { sku } = await params;
  const product = getProduct(sku);
  if (!product) return { title: "Kit not found | Duraforge UK" };
  return {
    title: `${product.name} | ${product.brand} | Duraforge UK`,
    description: `${product.name} — ${product.rod}×${product.bore}mm ${product.material}. ${
      product.crossRefs[0] ? `Replaces ${product.crossRefs[0].source} ${product.crossRefs[0].part}. ` : ""
    }25–30% below FPE. Same-day delivery in Kent.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const product = getProduct(sku);
  if (!product) notFound();

  const related = relatedProducts(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-slate-brand">
        <Link href="/shop" className="hover:text-orange">
          Shop
        </Link>{" "}
        /{" "}
        <Link href={`/shop/${product.brandSlug}`} className="hover:text-orange">
          {product.brand}
        </Link>{" "}
        / <span className="text-ink">{product.model}</span>
      </nav>

      <ProductDetail product={product} />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 font-display text-xl font-bold text-navy">
            Other kits for the {product.model}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
