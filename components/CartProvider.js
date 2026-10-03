'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'shop-cart-v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // [{ id, name, price_cents, emoji, quantity }]
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(saved)) setItems(saved);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const value = useMemo(() => {
    const add = (p) =>
      setItems((cur) => {
        const found = cur.find((i) => i.id === p.id);
        if (found) return cur.map((i) => (i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
        return [...cur, { id: p.id, name: p.name, price_cents: p.price_cents, emoji: p.emoji, quantity: 1 }];
      });
    const setQty = (id, quantity) =>
      setItems((cur) =>
        quantity <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, quantity } : i))
      );
    const clear = () => setItems([]);
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const total = items.reduce((n, i) => n + i.quantity * i.price_cents, 0);
    return { items, add, setQty, clear, count, total, ready };
  }, [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
export const money = (cents) => `$${(cents / 100).toFixed(2)}`;
