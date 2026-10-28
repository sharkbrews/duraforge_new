import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";
import { OemEnquiryError, getOemEnquiryView, parseNote, submitOemEnquiry } from "@/lib/oem-enquiry";
import { sendOemEnquiryNotification } from "@/lib/email";

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
    const view = await getOemEnquiryView(user.id);
    const submission = view.submissions.find((item) => item.id === enquiryId);
    if (!submission) {
      console.error(`Submitted OEM enquiry ${enquiryId} was not available for notification.`);
    } else {
      void sendOemEnquiryNotification({
        customerEmail: user.email,
        companyName: user.companyName,
        phone: user.phone,
        note: submission.note ?? undefined,
        items: submission.items,
      }).catch((error) => {
        console.error("OEM enquiry notification failed:", error);
      });
    }

    return NextResponse.json(view);
  } catch (error) {
    if (error instanceof OemEnquiryError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Submitting OEM enquiry failed:", error);
    return NextResponse.json({ error: "Could not submit your enquiry. Please try again." }, { status: 500 });
  }
}
