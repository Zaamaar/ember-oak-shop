import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/orders');

  // RLS returns only this user's orders.
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_cents, status, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="wrap">
      <h1>My orders</h1>
      <p className="sub">Signed in as {user.email}</p>
      {(orders ?? []).length === 0 ? (
        <div className="center" style={{ paddingTop: 30 }}>
          <p className="sub">No orders yet.</p>
          <Link href="/#products" className="btn">Start shopping</Link>
        </div>
      ) : (
        <div className="otable">
          {orders.map((o) => (
            <Link key={o.id} href={`/order/${o.id}`} className="orow">
              <div>
                <div>Order #{o.id.slice(0, 8).toUpperCase()}</div>
                <div className="sub" style={{ margin: 0, fontSize: 14 }}>
                  {new Date(o.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="pill">{o.status}</span>
                <span className="price">{money(o.total_cents)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
