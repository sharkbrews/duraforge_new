"use client";

import { useState } from "react";
import { SpinWheelModal } from "./spin-wheel-modal";

export function SpinWheelPrompt({
  canSpin,
  showPrompt,
}: {
  canSpin: boolean;
  showPrompt: boolean;
}) {
  const [open, setOpen] = useState(showPrompt && canSpin);

  if (!canSpin && !showPrompt) return null;

  return (
    <>
      {showPrompt && canSpin && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full rounded-lg border border-orange/40 bg-orange/5 py-3 text-sm font-semibold text-orange hover:bg-orange/10"
        >
          🎡 Fancy a spin? You&apos;ve earned it this month →
        </button>
      )}
      <SpinWheelModal
        open={open}
        onClose={() => setOpen(false)}
        canSpin={canSpin}
      />
    </>
  );
}
