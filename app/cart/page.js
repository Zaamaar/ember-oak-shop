'use client';

import Link from 'next/link';
import { useCart, money } from '@/components/CartProvider';

function CartInner() {
  const { items, setQty, total, ready } = useCart();

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <div className="center">
        <h1>Your cart is empty</h1>
        <p className="sub">Nothing here yet.</p>
        <Link href="/" className="btn">Browse the shop</Link>
      </div>
    );
  }

  return (
    <>
      <h1>Your cart</h1>
      <div className="lines">
        {items.map((i) => (
          <div className="line" key={i.id}>
            <span style={{ fontSize: 34 }}>{i.emoji}</span>
            <div className="grow">
              <div>{i.name}</div>
              <div className="sub" style={{ margin: 0 }}>{money(i.price_cents)}</div>
            </div>
            <div className="qty">
              <button onClick={() => setQty(i.id, i.quantity - 1)} aria-label="Decrease">−</button>
              <span>{i.quantity}</span>
              <button onClick={() => setQty(i.id, i.quantity + 1)} aria-label="Increase">+</button>
            </div>
            <div className="price" style={{ minWidth: 70, textAlign: 'right' }}>{money(i.price_cents * i.quantity)}</div>
          </div>
        ))}
      </div>
      <div className="row total">
        <span>Total</span>
        <span>{money(total)}</span>
      </div>
      <p style={{ paddingBottom: 60 }}>
        <Link href="/checkout" className="btn">Go to checkout</Link>
      </p>
    </>
  );
}

export default function CartPage() {
  return (
    <div className="wrap">
      <CartInner />
    </div>
  );
}
