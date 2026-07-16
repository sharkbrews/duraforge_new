import type { Metadata } from "next";
import { FinderTool } from "@/components/finder-tool";

export const metadata: Metadata = {
  title: "Seal Kit Finder | Duraforge UK",
  description:
    "Find the right hydraulic seal kit by brand, model and cylinder position. JCB, CAT, Hyva, Kubota, Takeuchi, Hyundai, Bobcat. 25–30% below FPE.",
};

export default function FinderPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-navy">Seal Kit Finder</h1>
        <p className="mt-2 text-slate-brand">
          Three steps to the right kit: brand → model → cylinder. Cross-referenced to OEM part
          numbers so you know it fits.
        </p>
      </div>
      <FinderTool />
    </div>
  );
}
