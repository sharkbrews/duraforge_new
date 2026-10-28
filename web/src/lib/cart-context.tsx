"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "duraforge_cart";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  addItem: (sku: string, qty?: number) => void;
  removeItem: (sku: string) => void;
  setQuantity: (sku: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let snapshot: CartItem[] | undefined;
const listeners = new Set<() => void>();

function getSnapshot(): CartItem[] {
  if (typeof window === "undefined") return [];
  snapshot ??= readCart();
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = () => {
    snapshot = readCart();
    listeners.forEach((current) => current());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function updateCart(updater: (current: CartItem[]) => CartItem[]): void {
  const next = updater(getSnapshot());
  snapshot = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => []);

  const addItem = useCallback((sku: string, qty = 1) => {
    updateCart((prev) => {
      const existing = prev.find((i) => i.sku === sku);
      if (existing) {
        return prev.map((i) =>
          i.sku === sku ? { ...i, quantity: i.quantity + qty } : i,
        );
      }
      return [...prev, { sku, quantity: qty }];
    });
  }, []);

  const removeItem = useCallback((sku: string) => {
    updateCart((prev) => prev.filter((i) => i.sku !== sku));
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    if (quantity < 1) {
      updateCart((prev) => prev.filter((i) => i.sku !== sku));
      return;
    }
    updateCart((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, quantity } : i)),
    );
  }, []);

  const clearCart = useCallback(() => updateCart(() => []), []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, itemCount, addItem, removeItem, setQuantity, clearCart }),
    [items, itemCount, addItem, removeItem, setQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
