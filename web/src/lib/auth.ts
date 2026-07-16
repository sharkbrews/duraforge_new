import { auth } from "@/auth";
import type { PublicUser, User } from "./types";
import { getUserById } from "./store";

export { hashPassword, verifyPassword } from "./password";

/** Strip the password hash before sending a user to the client. */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

/** The signed-in user's id, or null. Backed by the NextAuth session. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** The full signed-in user (safe fields only), or null. */
export async function getSessionUser(): Promise<PublicUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await getUserById(userId);
  return user ? toPublicUser(user) : null;
}
