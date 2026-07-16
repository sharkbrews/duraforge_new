import { AdminChrome } from "@/components/admin-chrome";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <AdminChrome>{children}</AdminChrome>;
}
