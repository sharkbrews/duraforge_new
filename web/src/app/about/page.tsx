import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Duraforge UK",
  description: "Kent-based trade supplier of hydraulic seal kits — 25–30% below FPE & Hallite.",
};

export default function AboutPage() {
  return (
    <InfoShell title="About Duraforge UK">
      <p>
        Duraforge UK Ltd is a Swanscombe-based trade supplier of hydraulic seal kits for
        diggers, tippers, telehandlers, tractors, and forklifts. We import quality kits,
        pack them in Kent, and get them to you faster than the big catalogue houses.
      </p>
      <p>
        We&apos;re <strong>25–30% cheaper</strong> than FPE Seals and Hallite on comparable
        kits — and we&apos;re not shy about saying so. Same-day delivery within 30 miles of
        DA10 when you order before 11am.
      </p>
      <p>
        Trade accounts only. No minimum order. Real humans on the phone when something&apos;s
        urgent and a machine&apos;s down.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 not-prose">
        <Link href="/shop" className="rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white">
          Browse kits
        </Link>
        <Link href="/contact" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-navy">
          Contact us
        </Link>
      </div>
    </InfoShell>
  );
}

function InfoShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-navy">{title}</h1>
      <div className="prose prose-slate mt-8 max-w-none text-ink">{children}</div>
    </div>
  );
}

export { InfoShell };
