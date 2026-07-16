import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/lib/types";

// Edge-safe base config (NO database / Node-only imports). Used by middleware
// to decode the JWT, and spread into the full Node config in auth.ts.

// Admin sessions expire faster than customer sessions.
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/account/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role as UserRole) ?? "customer";
        token.adminAuthed = Boolean(user.adminAuthed);
        token.mfaEnabled = Boolean(user.mfaEnabled);
        token.mustChangePassword = Boolean(user.mustChangePassword);
        if (user.adminAuthed) {
          token.adminLoginAt = Date.now();
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as UserRole) ?? "customer";
        session.user.adminAuthed = Boolean(token.adminAuthed);
        session.user.mfaEnabled = Boolean(token.mfaEnabled);
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.adminLoginAt =
          typeof token.adminLoginAt === "number" ? token.adminLoginAt : undefined;
      }
      return session;
    },
  },
};
