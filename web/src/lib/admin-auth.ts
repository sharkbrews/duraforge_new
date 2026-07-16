import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "./types";

export async function getSessionRole(): Promise<UserRole | null> {
  const session = await auth();
  return session?.user?.role ?? null;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/account/login?next=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/account?error=admin-only");
  }
  return session;
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "admin";
}
