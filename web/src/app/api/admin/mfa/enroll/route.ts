import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { setUserMfaSecret } from "@/lib/store";
import { generateMfaSecret, mfaOtpauthUri } from "@/lib/mfa";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin" || !session.user.adminAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = generateMfaSecret();
  await setUserMfaSecret(session.user.id, secret);

  const uri = mfaOtpauthUri(session.user.email ?? "admin", secret);
  const qrDataUrl = await QRCode.toDataURL(uri);

  return NextResponse.json({ secret, otpauthUri: uri, qrDataUrl });
}
