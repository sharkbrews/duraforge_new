import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";
import { markOemEnquiryReviewed } from "@/lib/oem-enquiry";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const session = await auth();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  if (body?.status !== "REVIEWED") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  try {
    const updated = await markOemEnquiryReviewed(id);
    if (!updated) {
      return NextResponse.json({ error: "Enquiry not found or not awaiting review." }, { status: 404 });
    }
    await logAudit({
      actorId: session?.user?.id,
      actorEmail: session?.user?.email,
      action: "oem_enquiry.reviewed",
      detail: id,
      ip: getClientIp(request.headers),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Marking OEM enquiry reviewed failed:", error);
    return NextResponse.json({ error: "Could not update enquiry." }, { status: 500 });
  }
}
