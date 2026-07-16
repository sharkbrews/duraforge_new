import type { Metadata } from "next";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Register trade account | Duraforge UK",
};

export default function RegisterPage() {
  return (
    <div className="px-4 py-10 sm:px-6">
      <RegisterForm />
    </div>
  );
}
