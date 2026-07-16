"use client";

import { useState } from "react";

export function EnquiryForm() {
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          companyName: form.companyName || undefined,
          email: form.email,
          phone: form.phone || undefined,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send your message.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again or WhatsApp us.");
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20";

  if (sent) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
        <p className="text-4xl">✉️</p>
        <h2 className="mt-4 font-display text-xl font-bold text-navy">Message sent.</h2>
        <p className="mt-2 text-sm text-slate-brand">
          We&apos;ll get back to you — usually within the hour on trade hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold text-slate-brand">Your name *</span>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-brand">Company</span>
          <input
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-brand">Email *</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-brand">Phone</span>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-bold text-slate-brand">How can we help? *</span>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="Part number, machine model, urgency…"
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-orange py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {loading ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
