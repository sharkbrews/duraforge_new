import { NextResponse } from "next/server";

// Reserved for a future online-payment phase.
export async function POST() {
  return NextResponse.json(
    { error: "Online payments are not enabled." },
    { status: 410 },
  );
}
