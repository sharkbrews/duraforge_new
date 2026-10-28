import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  OemEnquiryError,
  getOemEnquiryView,
  parseItemQuantity,
  removeOemEnquiryItem,
  setOemEnquiryItemQuantity,
} from "@/lib/oem-enquiry";

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to save your OEM enquiry list." }, { status: 401 });
  try {
    const { itemId } = await params;
    const body = (await request.json()) as { quantity?: unknown };
    await setOemEnquiryItemQuantity(userId, itemId, parseItemQuantity(body.quantity));
    return NextResponse.json(await getOemEnquiryView(userId));
  } catch (error) {
    if (error instanceof OemEnquiryError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Updating OEM enquiry line failed:", error);
    return NextResponse.json({ error: "Could not update that line." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to save your OEM enquiry list." }, { status: 401 });
  try {
    const { itemId } = await params;
    await removeOemEnquiryItem(userId, itemId);
    return NextResponse.json(await getOemEnquiryView(userId));
  } catch (error) {
    if (error instanceof OemEnquiryError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Removing OEM enquiry line failed:", error);
    return NextResponse.json({ error: "Could not remove that line." }, { status: 500 });
  }
}
