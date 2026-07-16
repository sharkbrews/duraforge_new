"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";

export function AddToBasketButton({
  sku,
  className = "",
}: {
  sku: string;
  className?: string;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem(sku, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          "flex-1 rounded-lg bg-orange px-5 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
        }
      >
        {added ? "Added ✓" : "Add to basket"}
      </button>
      {added && (
        <button
          type="button"
          onClick={() => router.push("/basket")}
          className="flex-1 rounded-lg border border-orange px-5 py-3 text-center font-semibold text-orange transition-colors hover:bg-orange/5"
        >
          View basket →
        </button>
      )}
    </div>
  );
}
