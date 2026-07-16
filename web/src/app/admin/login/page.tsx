import type { Metadata } from "next";
import { AdminLoginClient } from "@/components/admin-login-form";

export const metadata: Metadata = {
  title: "Admin sign in — Duraforge",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
