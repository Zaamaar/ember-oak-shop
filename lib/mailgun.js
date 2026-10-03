import formData from 'form-data';
import Mailgun from 'mailgun.js';

const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function sendOrderEmail({ order, items }) {
  const mg = new Mailgun(formData).client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
    url: process.env.MAILGUN_API_URL || 'https://api.mailgun.net',
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const short = order.id.slice(0, 8).toUpperCase();
  const lines = items.map((i) => `${i.quantity} x ${i.name}  ${money(i.unit_price_cents * i.quantity)}`);

  const text = [
    `Thanks for your order, ${order.full_name}.`,
    `Order #${short}`,
    '',
    ...lines,
    '',
    `Total: ${money(order.total_cents)}`,
    '',
    `Shipping to: ${order.address}, ${order.city}`,
    `View your order: ${site}/order/${order.id}`,
  ].join('\n');

  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity} &times; ${esc(i.name)}</td><td style="padding:6px 0;text-align:right">${money(
          i.unit_price_cents * i.quantity
        )}</td></tr>`
    )
    .join('');

  const html = `<div style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#2b2118">
    <h2 style="margin-bottom:4px">Order confirmed</h2>
    <p style="margin-top:0;color:#7a6a5a">Order #${short}</p>
    <p>Thanks, ${esc(order.full_name)}. Here is what we are packing:</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e6dccf;border-bottom:1px solid #e6dccf">${rows}
      <tr><td style="padding:10px 0;font-weight:bold">Total</td><td style="padding:10px 0;text-align:right;font-weight:bold">${money(order.total_cents)}</td></tr>
    </table>
    <p>Shipping to: ${esc(order.address)}, ${esc(order.city)}</p>
    <p><a href="${site}/order/${order.id}" style="color:#b4531f">View your order</a></p>
  </div>`;

  return mg.messages.create(process.env.MAILGUN_DOMAIN, {
    from: process.env.MAILGUN_FROM,
    to: [order.email],
    subject: `Order #${short} confirmed`,
    text,
    html,
  });
}
