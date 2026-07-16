import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";

export const metadata: Metadata = {
  title: "Contact | Duraforge UK",
  description:
    "Get in touch with Duraforge UK — trade hydraulic seal kits, Swanscombe Kent. Same-day local delivery.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-navy">Contact us</h1>
      <p className="mt-2 max-w-xl text-slate-brand">
        Trade enquiries only. Need a kit fast? Drop us a line — or WhatsApp if you&apos;re
        standing in a muddy yard.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
        <EnquiryForm />
        <aside className="space-y-6 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-display font-bold text-navy">Duraforge UK Ltd</h2>
            <address className="mt-3 not-italic text-slate-brand">
              Swanscombe, Kent
              <br />
              DA10 1BZ
            </address>
            <p className="mt-3">
              <a href="tel:01474555555" className="font-semibold text-orange hover:underline">
                01474 555 555
              </a>
            </p>
            <p className="mt-2">
              <a
                href="mailto:trade@duraforge.co.uk"
                className="text-orange hover:underline"
              >
                trade@duraforge.co.uk
              </a>
            </p>
          </div>
          <div className="rounded-2xl border border-orange/30 bg-orange/5 p-6">
            <p className="font-bold text-navy">Same-day delivery</p>
            <p className="mt-2 text-slate-brand">
              Order before 11am within 30 miles of Swanscombe — we&apos;ll get it to you today.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
