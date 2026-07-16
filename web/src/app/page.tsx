import Link from "next/link";
import { KitFinderWidget } from "@/components/kit-finder-widget";
import { featuredCategories } from "@/lib/sample-data";

const trustPoints = [
  "25–30% below FPE & Hallite prices",
  "Same-day delivery within 30 miles of Swanscombe",
  "No minimum order quantity",
  "Cross-referenced to JCB, CAT, FPE & Hallite part numbers",
  "Real person, real phone number",
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange">
              Trade only · Swanscombe, Kent
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Kent&apos;s fastest hydraulic seal kits.{" "}
              <span className="text-orange">25% cheaper</span> than FPE.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-200">
              Trade-only. No nonsense. Swanscombe-based. Order before 11am and
              it&apos;s with you today — if you&apos;re close.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/finder"
                className="rounded-lg bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Find My Seal Kit →
              </Link>
              <Link
                href="/shop"
                className="rounded-lg border border-white/25 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Browse the Catalogue
              </Link>
            </div>
          </div>

          <div className="lg:pl-6">
            <KitFinderWidget />
          </div>
        </div>

        {/* Trust bar */}
        <div className="border-t border-navy-700 bg-navy-800">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-2 px-4 py-4 text-sm text-slate-200 sm:px-6">
            {trustPoints.map((point) => (
              <span key={point} className="flex items-center gap-2">
                <span className="text-success">✓</span>
                {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Kits by machine
            </h2>
            <p className="mt-2 text-slate-brand">
              Pick your make — we&apos;ll get you to the right cylinder in seconds.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden text-sm font-semibold text-orange hover:underline sm:block"
          >
            See all →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {featuredCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop/${cat.slug}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 text-center transition-all hover:-translate-y-1 hover:border-orange hover:shadow-lg"
            >
              <div className="text-3xl">{cat.emoji}</div>
              <p className="mt-3 font-display font-bold text-navy">{cat.name}</p>
              <p className="mt-1 text-xs text-slate-brand">{cat.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Cross-reference strip */}
      <section className="bg-navy-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Got a part number? Drop it in.
          </h2>
          <p className="max-w-2xl text-slate-300">
            Type an FPE, Hallite, JCB or CAT part number and we&apos;ll find your
            Duraforge equivalent — then show you how much you just saved.
          </p>
          <Link
            href="/cross-reference"
            className="mt-2 rounded-lg bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Open Cross-Reference Lookup →
          </Link>
        </div>
      </section>

      {/* Local pride band */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Same-day, if you're close",
              body: "Within 30 miles of Swanscombe? Order before 11am and it's on your bench today. We know a stopped machine is lost money.",
            },
            {
              title: "Cheaper, and not shy about it",
              body: "25–30% below FPE and Hallite on equivalent kits. Same seals, same fit, better price. You're welcome.",
            },
            {
              title: "A real person answers",
              body: "No call centre up North. A knowledgeable local who knows every rod Ø and bore off the top of his head.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <h3 className="font-display text-lg font-bold text-navy">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-brand">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
