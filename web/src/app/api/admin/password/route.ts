import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, setUserPassword } from "@/lib/store";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin" || !session.user.adminAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 10) {
    return NextResponse.json(
      { error: "New password must be at least 10 characters." },
      { status: 400 },
    );
  }

  const user = await getUserById(session.user.id);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  if (verifyPassword(newPassword, user.passwordHash)) {
    return NextResponse.json(
      { error: "New password must be different from the current one." },
      { status: 400 },
    );
  }

  await setUserPassword(session.user.id, hashPassword(newPassword));
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "admin.password.changed",
    ip: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true });
}
