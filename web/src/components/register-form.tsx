"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    companyName: "",
    phone: "",
    vatNumber: "",
    line1: "",
    line2: "",
    city: "",
    county: "",
    postcode: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          companyName: form.companyName,
          phone: form.phone,
          vatNumber: form.vatNumber || undefined,
          deliveryAddress: {
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            county: form.county || undefined,
            postcode: form.postcode,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        setLoading(false);
        return;
      }
      // Account created — sign the new user straight in.
      const signInRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (!signInRes || signInRes.error) {
        // Account exists but auto sign-in failed; send them to the login page.
        router.push("/account/login");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-8"
    >
      <h1 className="font-display text-2xl font-extrabold text-navy">Register trade account</h1>
      <p className="text-sm text-slate-brand">
        Company name, delivery address, and contact details. VAT number optional for now.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-brand">Company name *</span>
          <input required value={form.companyName} onChange={(e) => update("companyName", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-brand">Email *</span>
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-brand">Phone *</span>
          <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-brand">Password * (min 8 characters)</span>
          <input type="password" required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-brand">VAT number (optional)</span>
          <input value={form.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-brand">Delivery address line 1 *</span>
          <input required value={form.line1} onChange={(e) => update("line1", e.target.value)} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-slate-brand">Line 2</span>
          <input value={form.line2} onChange={(e) => update("line2", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-brand">City *</span>
          <input required value={form.city} onChange={(e) => update("city", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-brand">Postcode *</span>
          <input required value={form.postcode} onChange={(e) => update("postcode", e.target.value)} className={inputClass} />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-orange py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Create trade account"}
      </button>

      <p className="text-center text-sm text-slate-brand">
        Already registered?{" "}
        <Link href="/account/login" className="font-semibold text-orange hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
