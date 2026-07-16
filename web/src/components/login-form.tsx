"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8">
      <h1 className="font-display text-2xl font-extrabold text-navy">Sign in</h1>
      <p className="text-sm text-slate-brand">Trade accounts only. No consumer orders.</p>

      <label className="block">
        <span className="text-xs font-bold text-slate-brand">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-slate-brand">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-orange py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-brand">
        No account?{" "}
        <Link href="/account/register" className="font-semibold text-orange hover:underline">
          Register your trade account
        </Link>
      </p>
    </form>
  );
}

export function LoginPageClient() {
  return (
    <Suspense fallback={<p className="text-center text-slate-brand">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
