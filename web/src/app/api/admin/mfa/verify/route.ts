import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enableUserMfa, getUserMfaSecret } from "@/lib/store";
import { verifyMfaToken } from "@/lib/mfa";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin" || !session.user.adminAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = typeof body.token === "string" ? body.token : "";

  const secret = await getUserMfaSecret(session.user.id);
  if (!secret) {
    return NextResponse.json(
      { error: "No enrolment in progress. Start again." },
      { status: 400 },
    );
  }

  if (!verifyMfaToken(token, secret)) {
    return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });
  }

  await enableUserMfa(session.user.id);
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "admin.mfa.enabled",
    ip: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true });
}
