import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const money = (c) => `$${(c / 100).toFixed(2)}`;

export default async function OrderPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/order/${params.id}`);

  // RLS: only the owner can read this row.
  const { data: order } = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!order) notFound();
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <h1>Thank you, {order.full_name.split(' ')[0]}.</h1>
      <p className="sub">
        Order #{order.id.slice(0, 8).toUpperCase()} is confirmed.{' '}
        {order.email_sent ? `A receipt is on its way to ${order.email}.` : 'We could not send the confirmation email, but your order is saved.'}
      </p>
      <div className="lines">
        {(items ?? []).map((i) => (
          <div className="line" key={i.id}>
            <div className="grow">{i.name} × {i.quantity}</div>
            <div>{money(i.unit_price_cents * i.quantity)}</div>
          </div>
        ))}
      </div>
      <div className="row total"><span>Total</span><span>{money(order.total_cents)}</span></div>
      <p className="sub">Shipping to {order.address}, {order.city}</p>
      <Link href="/" className="btn ghost">Keep shopping</Link>
    </div>
  );
}
