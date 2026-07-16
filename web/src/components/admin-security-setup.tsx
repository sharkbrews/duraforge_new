"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function AdminSecuritySetup({
  mustChangePassword,
  mfaEnabled: initialMfaEnabled,
}: {
  mustChangePassword: boolean;
  mfaEnabled: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();

  const [passwordDone, setPasswordDone] = useState(!mustChangePassword);
  const [mfaDone, setMfaDone] = useState(initialMfaEnabled);

  const setupComplete = passwordDone && mfaDone;

  async function finish() {
    await update();
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-navy">
          Admin security
        </h2>
        <p className="mt-1 text-sm text-slate-brand">
          {setupComplete
            ? "Manage your password and multi-factor authentication."
            : "Finish setting up your admin account before continuing."}
        </p>
      </div>

      <PasswordCard
        required={mustChangePassword}
        done={passwordDone}
        onDone={() => setPasswordDone(true)}
      />

      <MfaCard done={mfaDone} onDone={() => setMfaDone(true)} />

      {(mustChangePassword || !initialMfaEnabled) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <button
            type="button"
            disabled={!setupComplete}
            onClick={finish}
            className="w-full rounded-lg bg-orange py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {setupComplete
              ? "Finish & go to dashboard"
              : "Complete the steps above to continue"}
          </button>
        </div>
      )}
    </div>
  );
}

function PasswordCard({
  required,
  done,
  onDone,
}: {
  required: boolean;
  done: boolean;
  onDone: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update password.");
        setLoading(false);
        return;
      }
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-navy">Password</h3>
        {done && !required && (
          <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
            Set
          </span>
        )}
      </div>
      {required && !saved && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You must change the initial password before you can use the admin panel.
        </p>
      )}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="password"
          required
          placeholder="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange"
        />
        <input
          type="password"
          required
          placeholder="New password (min 10 characters)"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange"
        />
        <input
          type="password"
          required
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-success">Password updated.</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

function MfaCard({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(done);

  async function startEnroll() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mfa/enroll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start enrolment.");
        return;
      }
      setQr(data.qrDataUrl);
      setSecret(data.secret);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid code.");
        return;
      }
      setEnabled(true);
      setQr(null);
      onDone();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-navy">
          Multi-factor authentication
        </h3>
        {enabled && (
          <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
            Enabled
          </span>
        )}
      </div>

      {enabled ? (
        <p className="mt-2 text-sm text-slate-brand">
          Your account is protected with an authenticator app. You&apos;ll be asked
          for a 6-digit code at each sign-in.
        </p>
      ) : !qr ? (
        <div className="mt-3">
          <p className="text-sm text-slate-brand">
            Protect your admin account with a TOTP authenticator app (Google
            Authenticator, 1Password, Authy…).
          </p>
          <button
            type="button"
            onClick={startEnroll}
            disabled={loading}
            className="mt-4 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
          >
            {loading ? "Generating…" : "Set up authenticator"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-brand">
            1. Scan this QR code with your authenticator app:
          </p>
          {qr && (
            <Image
              src={qr}
              alt="MFA QR code"
              width={180}
              height={180}
              className="rounded-lg border border-slate-200"
              unoptimized
            />
          )}
          {secret && (
            <p className="text-xs text-slate-brand">
              Or enter this key manually:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-navy">
                {secret}
              </code>
            </p>
          )}
          <form onSubmit={verify} className="space-y-3">
            <p className="text-sm text-slate-brand">
              2. Enter the 6-digit code to confirm:
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-40 rounded-lg border border-slate-300 px-3 py-2.5 text-sm tracking-widest outline-none focus:border-orange"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {loading ? "Verifying…" : "Verify & enable"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
