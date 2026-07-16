"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
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
        totp,
        scope: "admin",
        redirect: false,
      });
      if (!res || res.error) {
        setError("Invalid credentials or authenticator code.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-orange">
          Staff only
        </p>
        <h1 className="font-display text-2xl font-extrabold text-navy">Admin sign in</h1>
        <p className="mt-1 text-sm text-slate-brand">
          Restricted area. All access is logged.
        </p>
      </div>

      {expired && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your admin session expired. Please sign in again.
        </p>
      )}

      <label className="block">
        <span className="text-xs font-bold text-slate-brand">Email</span>
        <input
          type="email"
          required
          autoComplete="username"
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-slate-brand">
          Authenticator code
          <span className="ml-1 font-normal text-slate-400">
            (leave blank on first sign-in)
          </span>
        </span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={totp}
          onChange={(e) => setTotp(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm tracking-widest outline-none focus:border-orange"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-navy py-3 font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function AdminLoginClient() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <Suspense fallback={<p className="text-slate-300">Loading…</p>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
