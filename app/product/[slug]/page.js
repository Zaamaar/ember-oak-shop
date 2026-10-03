import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AddToCart from '@/components/AddToCart';
import { money, tileClass } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const supabase = createClient();
  const { data } = await supabase.from('products').select('name').eq('slug', params.slug).maybeSingle();
  return { title: data ? `${data.name} · Ember & Oak` : 'Ember & Oak' };
}

export default async function ProductPage({ params }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('products')
    .select('id, slug, name, description, price_cents, emoji, stock')
    .eq('slug', params.slug)
    .maybeSingle();
  if (!p) notFound();

  const stock =
    p.stock <= 0
      ? { cls: 'out', text: 'Sold out' }
      : p.stock <= 10
      ? { cls: 'low', text: `Only ${p.stock} left` }
      : { cls: 'ok', text: 'In stock' };

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link href="/">Shop</Link> / {p.name}
      </div>
      <div className="pdp">
        <div className={`tile ${tileClass(p.slug)}`} aria-hidden>
          <span>{p.emoji}</span>
        </div>
        <div>
          <h1>{p.name}</h1>
          <div className="price">{money(p.price_cents)}</div>
          <p className="desc">{p.description}</p>
          <div className={`stock ${stock.cls}`}>{stock.text}</div>
          <AddToCart product={{ id: p.id, name: p.name, price_cents: p.price_cents, emoji: p.emoji, stock: p.stock }} />
        </div>
      </div>
    </div>
  );
}
