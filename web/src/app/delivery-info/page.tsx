import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delivery Info | Duraforge UK",
};

const tiers = [
  {
    title: "Same-day (Kent & SE London)",
    detail: "Order before 11am, within 30 miles of Swanscombe (DA10). We mean it.",
  },
  {
    title: "Next-day (UK mainland)",
    detail: "Standard courier for most of England & Wales. Scotland may add a day — we'll tell you.",
  },
  {
    title: "Collection",
    detail: "Trade counter collection by arrangement — call us if you're passing the estate.",
  },
];

export default function DeliveryInfoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-navy">Delivery info</h1>
      <p className="mt-4 text-slate-brand">
        A busted cylinder means a stopped machine. We treat delivery like an emergency, not an
        afterthought.
      </p>

      <ul className="mt-8 space-y-4">
        {tiers.map((t) => (
          <li key={t.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-display font-bold text-navy">{t.title}</h2>
            <p className="mt-2 text-sm text-slate-brand">{t.detail}</p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-slate-brand">
        Just missed the 11am cutoff?{" "}
        <em>First thing tomorrow. Promise.</em>
      </p>

      <Link href="/contact" className="mt-6 inline-block text-sm font-semibold text-orange hover:underline">
        Questions? Get in touch →
      </Link>
    </div>
  );
}
