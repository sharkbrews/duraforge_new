import type { Metadata } from "next";
import { XrefTool } from "@/components/xref-tool";

export const metadata: Metadata = {
  title: "Cross-Reference Lookup | Duraforge UK",
  description:
    "Enter an FPE, Hallite, JCB or CAT part number and find the Duraforge equivalent — 25–30% cheaper. Same-day delivery in Kent.",
};

export default function CrossReferencePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-navy">
          Cross-Reference Lookup
        </h1>
        <p className="mt-2 text-slate-brand">
          Got a competitor or OEM part number? Drop it in and we&apos;ll find your Duraforge
          equivalent — then show you how much you just saved.
        </p>
      </div>
      <XrefTool />
    </div>
  );
}
