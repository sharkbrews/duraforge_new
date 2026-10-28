import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getClientIp } from "@/lib/ip-allowlist";
import { logAudit } from "@/lib/audit";
import {
  PaymentReconciliationError,
  reconcileOrderPayment,
} from "@/lib/store";
import type { InvoicePaymentStatus } from "@/lib/types";

const PAYMENT_STATUSES: InvoicePaymentStatus[] = [
  "unpaid",
  "partially_paid",
  "paid_pending_reconciliation",
  "paid_reconciled",
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
    const body = (await request.json()) as {
      paymentStatus?: InvoicePaymentStatus;
    };
    if (!body.paymentStatus || !PAYMENT_STATUSES.includes(body.paymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
    }

    const { orderNumber } = await params;
    const order = await reconcileOrderPayment({
      orderNumber: decodeURIComponent(orderNumber),
      paymentStatus: body.paymentStatus,
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "order.payment.updated",
      detail: `${order.orderNumber} → ${body.paymentStatus}`,
      ip: getClientIp(request.headers),
    });

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof PaymentReconciliationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Updating order payment status failed:", error);
    return NextResponse.json(
      { error: "Could not update payment status." },
      { status: 500 },
    );
  }
}
