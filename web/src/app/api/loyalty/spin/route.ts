import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { spinWheel } from "@/lib/store";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const result = await spinWheel(userId);
  if (!result) {
    return NextResponse.json(
      { error: "You've already spun this month." },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
