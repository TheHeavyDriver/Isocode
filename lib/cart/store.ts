"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "sahaj.cart.v1";
const MAX_QTY = 999;

export interface CartLine {
  productId: string;
  qtyCases: number;
}

const EMPTY: CartLine[] = [];
let snapshot: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function sanitize(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const seen = new Map<string, number>();
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as CartLine).productId !== "string" ||
      typeof (entry as CartLine).qtyCases !== "number"
    ) {
      continue;
    }
    const productId = (entry as CartLine).productId;
    const qty = Math.floor((entry as CartLine).qtyCases);
    if (qty <= 0) continue;
    seen.set(productId, Math.min(MAX_QTY, (seen.get(productId) ?? 0) + qty));
  }
  return Array.from(seen.entries()).map(([productId, qtyCases]) => ({
    productId,
    qtyCases,
  }));
}

function readStorage(): CartLine[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return sanitize(JSON.parse(raw));
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  snapshot = readStorage();
  loaded = true;
}

function notify() {
  for (const listener of listeners) listener();
}

function commit(next: CartLine[]) {
  snapshot = next;
  loaded = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable in private browsing; the in-memory cart still works.
    }
  }
  notify();
}

export function subscribe(listener: () => void): () => void {
  ensureLoaded();
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    snapshot = readStorage();
    notify();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): CartLine[] {
  ensureLoaded();
  return snapshot;
}

export function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

export function setCartQty(productId: string, qtyCases: number) {
  ensureLoaded();
  const qty = Math.max(0, Math.min(MAX_QTY, Math.floor(qtyCases)));
  const existing = snapshot.find((line) => line.productId === productId);

  if (qty === 0) {
    if (!existing) return;
    commit(snapshot.filter((line) => line.productId !== productId));
    return;
  }

  if (existing) {
    commit(
      snapshot.map((line) =>
        line.productId === productId ? { ...line, qtyCases: qty } : line,
      ),
    );
    return;
  }

  commit([...snapshot, { productId, qtyCases: qty }]);
}

export function addCartQty(productId: string, qtyCases = 1) {
  ensureLoaded();
  const existing = snapshot.find((line) => line.productId === productId);
  setCartQty(productId, (existing?.qtyCases ?? 0) + qtyCases);
}

export function removeCartLine(productId: string) {
  setCartQty(productId, 0);
}

export function clearCart() {
  commit([]);
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    lines,
    count: lines.reduce((sum, line) => sum + line.qtyCases, 0),
    lineCount: lines.length,
    qtyFor: (productId: string) =>
      lines.find((line) => line.productId === productId)?.qtyCases ?? 0,
    setQty: setCartQty,
    add: addCartQty,
    remove: removeCartLine,
    clear: clearCart,
  };
}
