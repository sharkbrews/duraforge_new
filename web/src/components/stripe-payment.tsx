"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { getStripeClient } from "@/lib/stripe-client";

/**
 * Renders Stripe's embedded Payment Element. On success it calls onPaid with
 * the confirmed PaymentIntent id, which the parent uses to place the order.
 */
export function StripePayment({
  clientSecret,
  submitting,
  onPaid,
  onError,
}: {
  clientSecret: string;
  submitting: boolean;
  onPaid: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}) {
  const stripePromise = getStripeClient();
  if (!stripePromise) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentInner submitting={submitting} onPaid={onPaid} onError={onError} />
    </Elements>
  );
}

function PaymentInner({
  submitting,
  onPaid,
  onError,
}: {
  submitting: boolean;
  onPaid: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setConfirming(true);
    onError("");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      onError(error.message ?? "Payment failed.");
      setConfirming(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onPaid(paymentIntent.id);
    } else {
      onError("Payment could not be completed.");
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button
        type="button"
        onClick={pay}
        disabled={!stripe || confirming || submitting}
        className="w-full rounded-lg bg-orange py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {confirming || submitting ? "Processing…" : "Pay & place order"}
      </button>
    </div>
  );
}
