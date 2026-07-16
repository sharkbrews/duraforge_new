"use client";

import { useState } from "react";

const SEGMENTS = [
  { label: "5% off", color: "#E8630A" },
  { label: "Free delivery", color: "#0D1B2A" },
  { label: "£10 credit", color: "#38A169" },
  { label: "50 coins", color: "#4A5568" },
  { label: "100 coins", color: "#E8630A" },
  { label: "Try again", color: "#CBD5E0" },
];

export function SpinWheelModal({
  open,
  onClose,
  canSpin,
}: {
  open: boolean;
  onClose: () => void;
  canSpin: boolean;
}) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSpin() {
    if (!canSpin || spinning) return;
    setError("");
    setSpinning(true);
    setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      const res = await fetch("/api/loyalty/spin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not spin.");
        setSpinning(false);
        return;
      }
      setResult(data.prizeLabel);
      setSpinning(false);
    } catch {
      setError("Something went wrong.");
      setSpinning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange">
              Bonus spin
            </p>
            <h2 className="font-display text-xl font-extrabold text-navy">
              Give it a spin, go on…
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-brand hover:text-navy"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="relative mx-auto mt-6 h-48 w-48">
          <div
            className={`h-full w-full rounded-full border-4 border-navy transition-transform duration-[1800ms] ease-out ${
              spinning ? "animate-spin" : ""
            }`}
            style={{
              background: `conic-gradient(${SEGMENTS.map((s, i) => {
                const start = (i / SEGMENTS.length) * 100;
                const end = ((i + 1) / SEGMENTS.length) * 100;
                return `${s.color} ${start}% ${end}%`;
              }).join(", ")})`,
            }}
          />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 text-2xl">
            ▼
          </div>
        </div>

        {result ? (
          <p className="mt-6 rounded-lg bg-success/10 px-4 py-3 text-center font-semibold text-success">
            You won: {result}
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-slate-brand">
            One spin per month. Fully optional — dismiss anytime.
          </p>
        )}

        {error && (
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          {!result && canSpin && (
            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning}
              className="flex-1 rounded-lg bg-orange py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {spinning ? "Spinning…" : "Spin the wheel"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-3 font-semibold text-navy hover:border-orange"
          >
            {result ? "Done" : "Maybe later"}
          </button>
        </div>
      </div>
    </div>
  );
}
