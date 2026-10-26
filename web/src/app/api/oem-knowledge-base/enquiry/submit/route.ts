import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";
import { OemEnquiryError, getOemEnquiryView, parseNote, submitOemEnquiry } from "@/lib/oem-enquiry";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit your OEM enquiry." }, { status: 401 });
  try {
    const body: unknown = await request.json().catch(() => null);
    const enquiryId = await submitOemEnquiry(user.id, parseNote(body));
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "oem_enquiry.submitted",
      detail: enquiryId,
      ip: getClientIp(request.headers),
    });
    return NextResponse.json(await getOemEnquiryView(user.id));
  } catch (error) {
    if (error instanceof OemEnquiryError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Submitting OEM enquiry failed:", error);
    return NextResponse.json({ error: "Could not submit your enquiry. Please try again." }, { status: 500 });
  }
}
