import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { label: "Seal Kit Finder", href: "/finder" },
  { label: "Shop", href: "/shop" },
  { label: "Cross-Reference", href: "/cross-reference" },
  { label: "Industries", href: "/industries" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo-colour.png"
            alt="Duraforge UK Ltd — Precision Parts. Trusted Supply."
            width={48}
            height={48}
            className="h-11 w-11 rounded-md"
            priority
          />
          <span className="hidden font-display text-lg font-extrabold tracking-tight sm:block">
            DURAFORGE <span className="text-orange">UK</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-200 transition-colors hover:text-orange"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/basket"
            className="flex items-center gap-2 rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <span className="hidden sm:inline">Basket</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
