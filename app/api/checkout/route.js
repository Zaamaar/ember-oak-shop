import { NextResponse } from 'next/server';
import { createClient, createAdmin } from '@/lib/supabase/server';
import { sendOrderEmail } from '@/lib/mailgun';

export async function POST(request) {
  // 1. Who is ordering? (Google session via Supabase)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  // 2. Validate input
  const body = await request.json().catch(() => null);
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const full_name = clean(body?.full_name, 120);
  const address = clean(body?.address, 240);
  const city = clean(body?.city, 120);
  const phone = clean(body?.phone, 40) || null;
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (!full_name || !address || !city) return NextResponse.json({ error: 'Name, address and city are required.' }, { status: 400 });
  if (rawItems.length === 0 || rawItems.length > 50) return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });

  const wanted = new Map();
  for (const it of rawItems) {
    const qty = Number.isInteger(it?.quantity) ? it.quantity : 0;
    if (typeof it?.id !== 'string' || qty < 1 || qty > 99) return NextResponse.json({ error: 'Invalid cart.' }, { status: 400 });
    wanted.set(it.id, (wanted.get(it.id) || 0) + qty);
  }

  // 3. Price everything on the server. Never trust prices from the browser.
  const admin = createAdmin();
  const { data: products, error: pErr } = await admin
    .from('products')
    .select('id, name, price_cents, stock')
    .in('id', [...wanted.keys()]);
  if (pErr) return NextResponse.json({ error: 'Could not load products.' }, { status: 500 });
  if (!products || products.length !== wanted.size) return NextResponse.json({ error: 'Some items are no longer available.' }, { status: 400 });

  const lines = [];
  let total = 0;
  for (const p of products) {
    const quantity = wanted.get(p.id);
    if (p.stock < quantity) return NextResponse.json({ error: `Not enough stock for ${p.name}.` }, { status: 400 });
    lines.push({ product_id: p.id, name: p.name, unit_price_cents: p.price_cents, quantity });
    total += p.price_cents * quantity;
  }

  // 4. Persist order + items
  const { data: order, error: oErr } = await admin
    .from('orders')
    .insert({ user_id: user.id, email: user.email, full_name, address, city, phone, total_cents: total })
    .select()
    .single();
  if (oErr) return NextResponse.json({ error: 'Could not save your order.' }, { status: 500 });

  const { error: iErr } = await admin.from('order_items').insert(lines.map((l) => ({ ...l, order_id: order.id })));
  if (iErr) {
    await admin.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Could not save your order.' }, { status: 500 });
  }

  // Decrement stock (best effort; swap for an RPC if you need strict inventory under load)
  await Promise.all(
    products.map((p) => admin.from('products').update({ stock: p.stock - wanted.get(p.id) }).eq('id', p.id))
  );

  // 5. Confirmation email. A mail failure must not lose the order.
  try {
    await sendOrderEmail({ order, items: lines });
    await admin.from('orders').update({ email_sent: true }).eq('id', order.id);
  } catch (e) {
    console.error('Mailgun send failed:', e?.message || e);
  }

  return NextResponse.json({ orderId: order.id });
}
