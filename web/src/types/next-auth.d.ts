import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      adminAuthed?: boolean;
      mfaEnabled?: boolean;
      mustChangePassword?: boolean;
      adminLoginAt?: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    adminAuthed?: boolean;
    mfaEnabled?: boolean;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    adminAuthed?: boolean;
    mfaEnabled?: boolean;
    mustChangePassword?: boolean;
    adminLoginAt?: number;
  }
}
