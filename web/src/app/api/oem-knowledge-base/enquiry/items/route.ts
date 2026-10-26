import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { OemEnquiryError, addOemEnquiryItem, getOemEnquiryView, parseItemInput } from "@/lib/oem-enquiry";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to save your OEM enquiry list." }, { status: 401 });
  try {
    await addOemEnquiryItem(userId, parseItemInput(await request.json()));
    return NextResponse.json(await getOemEnquiryView(userId));
  } catch (error) {
    if (error instanceof OemEnquiryError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Adding OEM enquiry line failed:", error);
    return NextResponse.json({ error: "Could not add that part to your enquiry." }, { status: 500 });
  }
}
