'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartProvider';

export default function AddToCart({ product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  function onAdd() {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button className={`btn big ${added ? 'done' : ''}`} onClick={onAdd} disabled={soldOut}>
        {soldOut ? 'Sold out' : added ? 'Added ✓' : 'Add to cart'}
      </button>
      <Link href="/cart" className="btn big ghost">View cart</Link>
    </div>
  );
}
