import type { Metadata } from "next";
import { OemKnowledgeBase } from "@/components/oem-knowledge-base";
import { getSessionUserId } from "@/lib/auth";

export const metadata: Metadata = {
  title: "OEM Knowledge Base | Duraforge UK",
  description: "Search OEM machine, application and part reference information from the Excon 2025 seal catalogue.",
};

export default async function OemKnowledgeBasePage() {
  const userId = await getSessionUserId();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-navy">OEM Knowledge Base</h1>
        <p className="mt-2 max-w-3xl text-slate-brand">Find machine details, applications and exact OEM references without opening the catalogue PDF.</p>
      </div>
      <OemKnowledgeBase signedIn={Boolean(userId)} />
    </div>
  );
}
