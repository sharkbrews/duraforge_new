import { NextResponse } from "next/server";

/**
 * Reserved for a future online-payment phase. Trade orders currently use
 * payment-free order requests and approved account terms.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Online payments are not enabled." },
    { status: 410 },
  );
}
