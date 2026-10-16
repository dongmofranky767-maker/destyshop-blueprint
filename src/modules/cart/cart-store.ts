// Panier stocké sur l'appareil (identifiants + quantités uniquement).
// Prix et disponibilité sont TOUJOURS revérifiés côté serveur (checkCart, puis place_order transactionnel).
import { useSyncExternalStore } from "react";

export type CartItem = { variantId: string; quantity: number };
const KEY = "destyshop.cart.v1";
const MAX_QTY = 99;
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: CartItem[] = EMPTY;

function read(): CartItem[] {
  const raw = localStorage.getItem(KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      cache = Array.isArray(parsed) ? parsed.filter((i) => typeof i.variantId === "string" && Number.isInteger(i.quantity) && i.quantity > 0) : EMPTY;
    } catch { cache = EMPTY; }
  }
  return cache;
}
function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

export const cart = {
  add(variantId: string, quantity = 1) {
    const items = read();
    const found = items.find((i) => i.variantId === variantId);
    write(found
      ? items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i))
      : [...items, { variantId, quantity: Math.min(MAX_QTY, quantity) }]);
  },
  setQuantity(variantId: string, quantity: number) {
    if (quantity <= 0) return cart.remove(variantId);
    write(read().map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)));
  },
  remove(variantId: string) { write(read().filter((i) => i.variantId !== variantId)); },
  clear() { write([]); },
};

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return { items, count: items.reduce((a, i) => a + i.quantity, 0) };
}
