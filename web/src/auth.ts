import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getUserByEmail, getUserById, getUserMfaSecret } from "@/lib/store";
import { verifyPassword } from "@/lib/password";
import { verifyMfaToken } from "@/lib/mfa";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip-allowlist";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator code", type: "text" },
        scope: { label: "Scope", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const totp =
          typeof credentials?.totp === "string" ? credentials.totp : "";
        const isAdminLogin = credentials?.scope === "admin";
        const ip = request ? getClientIp(request.headers) : null;

        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        if (!user || !verifyPassword(password, user.passwordHash)) {
          if (isAdminLogin) {
            await logAudit({
              actorEmail: email,
              action: "admin.login.failed",
              detail: "Invalid email or password",
              ip,
            });
          }
          return null;
        }

        if (isAdminLogin) {
          // Only admins may use the admin sign-in flow.
          if (user.role !== "admin") {
            await logAudit({
              actorId: user.id,
              actorEmail: user.email,
              action: "admin.login.denied",
              detail: "Non-admin attempted admin login",
              ip,
            });
            return null;
          }

          // If MFA is enabled, a valid TOTP code is mandatory.
          if (user.mfaEnabled) {
            const secret = await getUserMfaSecret(user.id);
            if (!secret || !verifyMfaToken(totp, secret)) {
              await logAudit({
                actorId: user.id,
                actorEmail: user.email,
                action: "admin.login.failed",
                detail: "Invalid or missing MFA code",
                ip,
              });
              return null;
            }
          }

          await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "admin.login.success",
            detail: user.mfaEnabled ? "with MFA" : "MFA not yet enrolled",
            ip,
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.companyName,
          role: user.role,
          adminAuthed: isAdminLogin,
          mfaEnabled: user.mfaEnabled,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.adminAuthed) {
        await logAudit({
          actorId: (token.id as string) ?? null,
          actorEmail: (token.email as string) ?? null,
          action: "admin.logout",
        });
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    // Node-side jwt: base sign-in copy + refresh admin flags on session update().
    async jwt({ token, user, trigger }) {
      const base = authConfig.callbacks!.jwt!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      token = (await base({ token, user } as any)) as typeof token;

      if (trigger === "update" && token.id && token.adminAuthed) {
        const fresh = await getUserById(token.id as string);
        if (fresh) {
          token.mfaEnabled = fresh.mfaEnabled;
          token.mustChangePassword = fresh.mustChangePassword;
        }
      }
      return token;
    },
  },
});
