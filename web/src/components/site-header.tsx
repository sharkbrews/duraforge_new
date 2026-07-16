"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { PublicUser } from "@/lib/types";

const navLinks = [
  { label: "Seal Kit Finder", href: "/finder" },
  { label: "Shop", href: "/shop" },
  { label: "Cross-Reference", href: "/cross-reference" },
  { label: "Industries", href: "/industries" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const { itemCount } = useCart();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user: PublicUser | null }) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

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
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="hidden rounded-md px-3 py-2 text-sm font-semibold text-orange hover:text-orange-300 sm:block"
            >
              Admin
            </Link>
          )}
          <Link
            href="/account"
            className="hidden max-w-[140px] truncate rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:text-white sm:block"
          >
            {user ? user.companyName : "Sign in"}
          </Link>
          <Link
            href="/basket"
            className="relative flex items-center gap-2 rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
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
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-navy">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
