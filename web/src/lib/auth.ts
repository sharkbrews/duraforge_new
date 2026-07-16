import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { PublicUser, User } from "./types";
import { getUserById } from "./store";

const SESSION_COOKIE = "duraforge_session";
const AUTH_SECRET =
  process.env.AUTH_SECRET ?? "duraforge-dev-secret-change-before-go-live";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (attempt.length !== expected.length) return false;
  return timingSafeEqual(attempt, expected);
}

function signPayload(payload: string): string {
  return createHash("sha256")
    .update(`${payload}.${AUTH_SECRET}`)
    .digest("hex");
}

export function createSessionToken(userId: string): string {
  const issued = Date.now().toString();
  const payload = `${userId}.${issued}`;
  return `${payload}.${signPayload(payload)}`;
}

function parseSessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  if (signPayload(payload) !== parts[2]) return null;
  const issued = parseInt(parts[1], 10);
  // 30-day session
  if (Number.isNaN(issued) || Date.now() - issued > 30 * 24 * 60 * 60 * 1000) {
    return null;
  }
  return parts[0];
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await getUserById(userId);
  return user ? toPublicUser(user) : null;
}

export function newUserId(): string {
  return `usr_${randomBytes(12).toString("hex")}`;
}

export function newOrderId(): string {
  return `ord_${randomBytes(12).toString("hex")}`;
}
