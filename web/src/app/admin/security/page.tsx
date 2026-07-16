import { requireAdminSetup } from "@/lib/admin-auth";
import { AdminSecuritySetup } from "@/components/admin-security-setup";

export default async function AdminSecurityPage() {
  const session = await requireAdminSetup();
  return (
    <AdminSecuritySetup
      mustChangePassword={Boolean(session.user.mustChangePassword)}
      mfaEnabled={Boolean(session.user.mfaEnabled)}
    />
  );
}
