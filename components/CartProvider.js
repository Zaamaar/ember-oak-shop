'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const CartContext = createContext(null);
const KEY = 'shop-cart-v1'; // guest (signed-out) cart only

function readGuest() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeGuest(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

// Load the signed-in user's cart (RLS limits rows to their own). Returns null on error.
async function fetchCart(supabase) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('quantity, product:products ( id, name, price_cents, emoji )')
    .order('updated_at', { ascending: true });
  if (error || !data) return null;
  return data
    .filter((r) => r.product)
    .map((r) => ({
      id: r.product.id,
      name: r.product.name,
      price_cents: r.product.price_cents,
      emoji: r.product.emoji,
      quantity: r.quantity,
    }));
}

export function CartProvider({ children }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState([]); // [{ id, name, price_cents, emoji, quantity }]
  const [ready, setReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const ownerRef = useRef(null); // 'guest' or the user's id: who the current items belong to
  const pendingRef = useRef(0); // writes in flight, so realtime refreshes don't fight them

  // 1. Track who is signed in.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data?.user?.id ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // 2. Load the right cart whenever the signed-in user changes.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    if (!userId) {
      ownerRef.current = 'guest';
      setItems(readGuest());
      setReady(true);
      return;
    }

    (async () => {
      // Merge anything the visitor added as a guest into their account cart, once.
      const guest = readGuest();
      if (guest.length) {
        const server = (await fetchCart(supabase)) || [];
        const existing = new Map(server.map((i) => [i.id, i.quantity]));
        const rows = guest.map((g) => ({
          user_id: userId,
          product_id: g.id,
          quantity: (existing.get(g.id) || 0) + g.quantity,
        }));
        const { error } = await supabase.from('cart_items').upsert(rows, { onConflict: 'user_id,product_id' });
        if (!error) writeGuest([]);
      }
      const fresh = await fetchCart(supabase);
      if (cancelled) return;
      ownerRef.current = userId;
      if (fresh) setItems(fresh);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authReady, supabase]);

  // 3. Guests keep their cart in the browser.
  useEffect(() => {
    if (ready && !userId && ownerRef.current === 'guest') writeGuest(items);
  }, [items, ready, userId]);

  // 4. Realtime: refresh when another device changes this user's cart.
  useEffect(() => {
    if (!userId) return;
    let timer;
    const refresh = async () => {
      if (pendingRef.current > 0) {
        timer = setTimeout(refresh, 200);
        return;
      }
      const fresh = await fetchCart(supabase);
      if (fresh) {
        itemsRef.current = fresh;
        setItems(fresh);
      }
    };
    const channel = supabase
      .channel(`cart:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${userId}` },
        () => {
          clearTimeout(timer);
          timer = setTimeout(refresh, 150);
        }
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Write helper: run a database change, and re-sync from the server if it fails.
  const write = useCallback(
    async (run) => {
      pendingRef.current += 1;
      try {
        const { error } = await run();
        if (error) {
          const fresh = await fetchCart(supabase);
          if (fresh) {
            itemsRef.current = fresh;
            setItems(fresh);
          }
        }
      } finally {
        pendingRef.current -= 1;
      }
    },
    [supabase]
  );

  const value = useMemo(() => {
    const apply = (next) => {
      itemsRef.current = next;
      setItems(next);
    };

    const add = (p) => {
      const cur = itemsRef.current;
      const found = cur.find((i) => i.id === p.id);
      const quantity = (found ? found.quantity : 0) + 1;
      apply(
        found
          ? cur.map((i) => (i.id === p.id ? { ...i, quantity } : i))
          : [...cur, { id: p.id, name: p.name, price_cents: p.price_cents, emoji: p.emoji, quantity: 1 }]
      );
      if (userId) {
        write(() =>
          supabase.from('cart_items').upsert({ user_id: userId, product_id: p.id, quantity }, { onConflict: 'user_id,product_id' })
        );
      }
    };

    const setQty = (id, quantity) => {
      const cur = itemsRef.current;
      apply(quantity <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, quantity } : i)));
      if (!userId) return;
      if (quantity <= 0) {
        write(() => supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', id));
      } else {
        write(() =>
          supabase.from('cart_items').upsert({ user_id: userId, product_id: id, quantity }, { onConflict: 'user_id,product_id' })
        );
      }
    };

    const clear = () => {
      apply([]);
      if (userId) write(() => supabase.from('cart_items').delete().eq('user_id', userId));
    };

    const count = items.reduce((n, i) => n + i.quantity, 0);
    const total = items.reduce((n, i) => n + i.quantity * i.price_cents, 0);
    return { items, add, setQty, clear, count, total, ready };
  }, [items, ready, userId, supabase, write]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
export const money = (cents) => `$${(cents / 100).toFixed(2)}`;
