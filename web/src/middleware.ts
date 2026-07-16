import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, ADMIN_SESSION_MAX_AGE_MS } from "@/auth.config";
import { isIpAllowed } from "@/lib/ip-allowlist";

const { auth } = NextAuth(authConfig);

const LOGIN_PATH = "/admin/login";
// Paths reachable while an admin still has setup to do (password / MFA).
const SETUP_PAGE_PREFIX = "/admin/security";
const SETUP_API_PREFIXES = ["/api/admin/mfa", "/api/admin/password"];

function isSetupAllowed(pathname: string): boolean {
  return (
    pathname.startsWith(SETUP_PAGE_PREFIX) ||
    SETUP_API_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // 1. IP allowlist — the outer gate for the entire admin surface.
  if (!isIpAllowed(req.headers)) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: "Access denied from this network." },
        { status: 403 },
      );
    }
    return new NextResponse(
      "Access to the admin area is not permitted from your network.",
      { status: 403, headers: { "content-type": "text/plain" } },
    );
  }

  const session = req.auth;
  const user = session?.user;
  const isFullAdmin = Boolean(user?.id) && user?.role === "admin" && user?.adminAuthed;
  const expired =
    isFullAdmin &&
    typeof user?.adminLoginAt === "number" &&
    Date.now() - user.adminLoginAt > ADMIN_SESSION_MAX_AGE_MS;

  // 2. The admin login page: open to allowed IPs; bounce already-ready admins.
  if (pathname === LOGIN_PATH) {
    if (
      isFullAdmin &&
      !expired &&
      user?.mfaEnabled &&
      !user?.mustChangePassword
    ) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
    return NextResponse.next();
  }

  // 3. Everything else under /admin or /api/admin requires a full admin session.
  if (!isFullAdmin || expired) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
    }
    const url = new URL(LOGIN_PATH, req.nextUrl);
    if (expired) url.searchParams.set("expired", "1");
    return NextResponse.redirect(url);
  }

  // 4. Pending setup (first login): force password change + MFA enrolment.
  if (user?.mustChangePassword || !user?.mfaEnabled) {
    if (!isSetupAllowed(pathname)) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Complete admin security setup first." },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL(SETUP_PAGE_PREFIX, req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
