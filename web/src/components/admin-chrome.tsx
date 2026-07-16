import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/security", label: "Security" },
];

export function AdminChrome({
  children,
  showNav = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-navy text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange">
              Staff only
            </p>
            <h1 className="font-display text-xl font-extrabold">Duraforge Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-slate-300 hover:text-white">
              ← Back to shop
            </Link>
            <LogoutButton />
          </div>
        </div>
        {showNav && (
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
