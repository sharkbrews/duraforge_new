import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateOrderStatus } from "@/lib/store";
import type { PickPackStatus } from "@/lib/types";
import { PICK_PACK_STAGES } from "@/lib/order-status";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin" || !session.user.adminAuthed) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const { orderNumber } = await params;
    const body = await request.json();
    const { status, carrier, trackingNumber, note } = body as {
      status?: PickPackStatus;
      carrier?: string;
      trackingNumber?: string;
      note?: string;
    };

    if (!status || !PICK_PACK_STAGES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    if (status === "despatched" && !trackingNumber?.trim()) {
      return NextResponse.json(
        { error: "Tracking number required when marking despatched." },
        { status: 400 },
      );
    }

    const order = await updateOrderStatus({
      orderNumber: decodeURIComponent(orderNumber),
      status,
      carrier,
      trackingNumber,
      note,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "order.status.updated",
      detail: `${order.orderNumber} → ${status}${
        trackingNumber ? ` (tracking ${trackingNumber})` : ""
      }`,
      ip: getClientIp(request.headers),
    });

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Could not update order." }, { status: 500 });
  }
}
