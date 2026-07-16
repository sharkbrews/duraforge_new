import { AdminChrome } from "@/components/admin-chrome";
import { requireAdminSetup } from "@/lib/admin-auth";

export default async function AdminSecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSetup();
  const setupComplete =
    !session.user.mustChangePassword && Boolean(session.user.mfaEnabled);
  return <AdminChrome showNav={setupComplete}>{children}</AdminChrome>;
}
