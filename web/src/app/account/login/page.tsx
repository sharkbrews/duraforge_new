import type { Metadata } from "next";
import { LoginPageClient } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in | Duraforge UK",
};

export default function LoginPage() {
  return (
    <div className="px-4 py-10 sm:px-6">
      <LoginPageClient />
    </div>
  );
}
