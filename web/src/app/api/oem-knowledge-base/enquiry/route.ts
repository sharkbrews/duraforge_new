import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { OemEnquiryError, clearOemEnquiryDraft, getOemEnquiryView } from "@/lib/oem-enquiry";

const SIGN_IN_REQUIRED = { error: "Sign in to save your OEM enquiry list." };

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json(SIGN_IN_REQUIRED, { status: 401 });
  try {
    return NextResponse.json(await getOemEnquiryView(userId));
  } catch (error) {
    console.error("Loading OEM enquiry failed:", error);
    return NextResponse.json({ error: "Could not load your OEM enquiry list." }, { status: 500 });
  }
}

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json(SIGN_IN_REQUIRED, { status: 401 });
  try {
    await clearOemEnquiryDraft(userId);
    return NextResponse.json(await getOemEnquiryView(userId));
  } catch (error) {
    if (error instanceof OemEnquiryError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Clearing OEM enquiry failed:", error);
    return NextResponse.json({ error: "Could not clear your OEM enquiry list." }, { status: 500 });
  }
}
