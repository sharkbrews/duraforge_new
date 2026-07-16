import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { ADMIN_SESSION_MAX_AGE_MS } from "@/auth.config";

function isExpired(session: Session | null): boolean {
  const at = session?.user?.adminLoginAt;
  return typeof at === "number" && Date.now() - at > ADMIN_SESSION_MAX_AGE_MS;
}

function isFullAdmin(session: Session | null): boolean {
  return (
    Boolean(session?.user?.id) &&
    session?.user?.role === "admin" &&
    Boolean(session?.user?.adminAuthed) &&
    !isExpired(session)
  );
}

/**
 * Guard for the main admin panel. Requires a full admin session AND completed
 * security setup (password changed + MFA enrolled). Middleware enforces this
 * too; this is defence-in-depth and gives pages the session object.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth();
  if (!isFullAdmin(session)) redirect("/admin/login");
  if (session!.user.mustChangePassword || !session!.user.mfaEnabled) {
    redirect("/admin/security");
  }
  return session!;
}

/**
 * Lighter guard for the security setup pages — requires a full admin session
 * but allows pending password change / MFA enrolment.
 */
export async function requireAdminSetup(): Promise<Session> {
  const session = await auth();
  if (!isFullAdmin(session)) redirect("/admin/login");
  return session!;
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return isFullAdmin(session);
}
