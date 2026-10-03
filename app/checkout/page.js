'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCart, money } from '@/components/CartProvider';

function CheckoutInner() {
  const router = useRouter();
  const { items, total, clear, ready } = useCart();
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  if (!ready || user === undefined) return null;

  if (items.length === 0) {
    return (
      <div className="center">
        <h1>Nothing to check out</h1>
        <Link href="/" className="btn">Browse the shop</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="center">
        <h1>Sign in to check out</h1>
        <p className="sub">We use Google sign-in so your orders are saved to your account.</p>
        <Link href="/login?next=/checkout" className="btn">Continue with Google</Link>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        full_name: f.get('full_name'),
        phone: f.get('phone'),
        address: f.get('address'),
        city: f.get('city'),
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.');
      setBusy(false);
      return;
    }
    clear();
    router.push(`/order/${data.orderId}`);
  }

  return (
    <>
      <h1>Checkout</h1>
      <div className="checkout">
        <form className="stack" onSubmit={submit}>
          <label>Full name<input name="full_name" required autoComplete="name" /></label>
          <label>Phone (optional)<input name="phone" autoComplete="tel" /></label>
          <label>Street address<input name="address" required autoComplete="street-address" /></label>
          <label>City<input name="city" required autoComplete="address-level2" /></label>
          <p className="sub" style={{ margin: 0 }}>Confirmation goes to {user.email}.</p>
          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Placing order…' : `Place order · ${money(total)}`}</button>
        </form>
        <aside className="lines">
          {items.map((i) => (
            <div className="line" key={i.id}>
              <span style={{ fontSize: 28 }}>{i.emoji}</span>
              <div className="grow">{i.name} × {i.quantity}</div>
              <div>{money(i.price_cents * i.quantity)}</div>
            </div>
          ))}
          <div className="row total"><span>Total</span><span>{money(total)}</span></div>
        </aside>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <div className="wrap">
      <CheckoutInner />
    </div>
  );
}
