import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateEnquiryStatus } from "@/lib/store";
import type { EnquiryStatus } from "@/lib/types";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";

const VALID: EnquiryStatus[] = ["new", "read", "replied", "archived"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin" || !session.user.adminAuthed) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status?: EnquiryStatus };

    if (!status || !VALID.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const enquiry = await updateEnquiryStatus(id, status);
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    }

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "enquiry.status.updated",
      detail: `${enquiry.email} → ${status}`,
      ip: getClientIp(request.headers),
    });

    return NextResponse.json({ enquiry });
  } catch {
    return NextResponse.json({ error: "Could not update enquiry." }, { status: 500 });
  }
}
