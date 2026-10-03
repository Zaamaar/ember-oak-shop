import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/components/ProductCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createClient();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, name, description, price_cents, emoji, stock')
    .order('created_at');

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <p className="eyebrow">Roasted this week</p>
            <h1>Coffee worth waking up for.</h1>
            <p className="lead">Small-batch beans, honest brewing gear, packed and sent fresh. Pick your roast, we handle the rest.</p>
            <div className="cta">
              <Link href="/#products" className="btn big">Shop the range</Link>
              <Link href="/cart" className="btn big ghost">View cart</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden>
            <span className="big">☕</span>
            <span className="sm s1">🫐</span>
            <span className="sm s2">🫖</span>
            <span className="sm s3">🧊</span>
          </div>
        </div>
      </section>

      <section className="strip">
        <div className="wrap">
          <div><b>Small-batch roasted</b>Fresh every week</div>
          <div><b>Gear we use ourselves</b>Simple tools that last</div>
          <div><b>Orders in your account</b>Sign in with Google to track them</div>
        </div>
      </section>

      <div className="wrap" id="products">
        <div className="sechead">
          <h2>The shop</h2>
          <p>{(products ?? []).length} products</p>
        </div>
        {error && <p className="err">Could not load products: {error.message}</p>}
        <div className="grid">
          {(products ?? []).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </>
  );
}
