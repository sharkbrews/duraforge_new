import Link from "next/link";

const footerCols = [
  {
    title: "Shop",
    links: [
      { label: "Seal Kit Finder", href: "/finder" },
      { label: "All Seal Kits", href: "/shop" },
      { label: "Individual Seals", href: "/shop/individual-seals" },
      { label: "Cross-Reference", href: "/cross-reference" },
    ],
  },
  {
    title: "Industries",
    links: [
      { label: "Plant Hire", href: "/industries/plant-hire" },
      { label: "Hydraulic Repair", href: "/industries/hydraulic-repair" },
      { label: "Agriculture", href: "/industries/agriculture" },
      { label: "Construction", href: "/industries/construction" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Delivery Info", href: "/delivery-info" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="font-display text-xl font-extrabold text-white">
              DURAFORGE <span className="text-orange">UK</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              Precision Parts. Trusted Supply. Trade-only hydraulic seal kits,
              25–30% below FPE &amp; Hallite. Same-day within 30 miles of
              Swanscombe.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Duraforge UK Ltd · Company No. 16679838
              <br />
              Swanscombe, Kent, DA10 1BZ
            </p>
          </div>

          {footerCols.map((col) => (
            <div key={col.title}>
              <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-orange"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-navy-700 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Duraforge UK Ltd. All rights reserved.</p>
          <p>Trade-only · Prices shown ex-VAT · Made in India, packed in Kent.</p>
        </div>
      </div>
    </footer>
  );
}
