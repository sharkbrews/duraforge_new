import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ | Duraforge UK",
};

const faqs = [
  {
    q: "Is this site for consumers?",
    a: "No — trade accounts only. Hydraulic repair shops, plant hire, agri dealers, construction teams. If you're fixing machines for a living, you're in the right place.",
  },
  {
    q: "Why are you cheaper than FPE / Hallite?",
    a: "Direct import, lean operation, no glossy catalogue markup. Same quality kits — we just don't charge you for someone else's marketing budget.",
  },
  {
    q: "What are DuraCoins?",
    a: "Our loyalty programme: £1 spent (inc-VAT) = 1 DuraCoin. Hit milestones for discounts, credit, and Pro status. See your account dashboard after signing in.",
  },
  {
    q: "Do you hold CE / UKCA certification?",
    a: "We don't claim CE, UKCA, OEM, or 'Genuine' on product pages. Kits are made in India to our spec — we're honest about that.",
  },
  {
    q: "Can I pay on account?",
    a: "BACS is available at checkout now. Net-30 trade credit is on the roadmap (Opus + Stripe Invoicing in Stage 4b).",
  },
  {
    q: "How do I find the right kit?",
    a: "Use the Seal Kit Finder (Brand → Model → Position) or Cross-Reference lookup if you've got an FPE / Hallite / OEM number.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-navy">FAQ</h1>
      <p className="mt-2 text-slate-brand">Straight answers. No corporate waffle.</p>

      <dl className="mt-10 space-y-6">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5">
            <dt className="font-display font-bold text-navy">{f.q}</dt>
            <dd className="mt-2 text-sm text-slate-brand">{f.a}</dd>
          </div>
        ))}
      </dl>

      <Link href="/contact" className="mt-8 inline-block font-semibold text-orange hover:underline">
        Still stuck? Contact us →
      </Link>
    </div>
  );
}
