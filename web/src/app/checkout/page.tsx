import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout | Duraforge UK",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-3xl font-extrabold text-navy">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
