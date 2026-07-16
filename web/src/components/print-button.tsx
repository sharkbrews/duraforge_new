"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
