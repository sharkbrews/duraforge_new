import { promises as fs } from "fs";
import path from "path";
import type { Order, User } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function getUsers(): Promise<User[]> {
  return readJson<User[]>("users.json", []);
}

export async function saveUsers(users: User[]): Promise<void> {
  await writeJson("users.json", users);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  const normalised = email.trim().toLowerCase();
  return users.find((u) => u.email === normalised);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function getOrders(): Promise<Order[]> {
  return readJson<Order[]>("orders.json", []);
}

export async function saveOrders(orders: Order[]): Promise<void> {
  await writeJson("orders.json", orders);
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  const orders = await getOrders();
  return orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | undefined> {
  const orders = await getOrders();
  return orders.find((o) => o.orderNumber === orderNumber);
}

export async function nextOrderNumber(): Promise<string> {
  const orders = await getOrders();
  const year = new Date().getFullYear();
  const prefix = `DRG-ORD-${year}-`;
  const existing = orders
    .map((o) => o.orderNumber)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
