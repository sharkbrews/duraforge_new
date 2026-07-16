import type { Metadata } from "next";
import { BasketView } from "@/components/basket-view";

export const metadata: Metadata = {
  title: "Your Basket | Duraforge UK",
};

export default function BasketPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-3xl font-extrabold text-navy">Your basket</h1>
      <BasketView />
    </div>
  );
}
