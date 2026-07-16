// Passthrough: /admin/login provides its own layout, while the protected panel
// and security-setup route groups add their own chrome + guards.
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
