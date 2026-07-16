import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { adjustDuraCoins } from "@/lib/store";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin" || !session.user.adminAuthed) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    amount?: number;
    reason?: string;
  };

  const userId = typeof body.userId === "string" ? body.userId : "";
  const amount = typeof body.amount === "number" ? Math.round(body.amount) : NaN;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!userId || !Number.isFinite(amount) || amount === 0 || !reason) {
    return NextResponse.json({ error: "Invalid adjustment." }, { status: 400 });
  }

  const newBalance = await adjustDuraCoins(userId, amount, reason);

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "duracoins.adjusted",
    detail: `${userId} ${amount > 0 ? "+" : ""}${amount} → ${newBalance} (${reason})`,
    ip: getClientIp(req.headers),
  });

  return NextResponse.json({ balance: newBalance });
}
