import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getClientIp } from "@/lib/ip-allowlist";
import { logAudit } from "@/lib/audit";
import { updateTradeTerms } from "@/lib/store";
import type { TradeTermsStatus } from "@/lib/types";

const TRADE_TERMS_STATUSES: TradeTermsStatus[] = [
  "pending",
  "approved_net_30",
  "declined",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin" || !session.user.adminAuthed) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { status?: TradeTermsStatus };
    if (!body.status || !TRADE_TERMS_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid trade-terms status." }, { status: 400 });
    }

    const { orderNumber } = await params;
    const order = await updateTradeTerms({
      orderNumber: decodeURIComponent(orderNumber),
      status: body.status,
      approvedBy: session.user.email ?? session.user.id,
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "order.trade_terms.updated",
      detail: `${order.orderNumber} → ${body.status}`,
      ip: getClientIp(request.headers),
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Updating trade terms failed:", error);
    return NextResponse.json(
      { error: "Could not update trade terms." },
      { status: 500 },
    );
  }
}
