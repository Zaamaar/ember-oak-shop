'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartProvider';
import { money, tileClass } from '@/lib/format';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  function onAdd() {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  }

  return (
    <div className="pcard">
      <Link href={`/product/${product.slug}`} className={`tile ${tileClass(product.slug)}`} aria-label={product.name}>
        <span aria-hidden>{product.emoji}</span>
      </Link>
      <div className="pbody">
        <h3><Link href={`/product/${product.slug}`}>{product.name}</Link></h3>
        <p>{product.description}</p>
        <div className="row">
          <span className="price">{money(product.price_cents)}</span>
          <button className={`btn ${added ? 'done' : ''}`} onClick={onAdd} disabled={soldOut}>
            {soldOut ? 'Sold out' : added ? 'Added ✓' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
