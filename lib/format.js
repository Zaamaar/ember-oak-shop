export const money = (cents) => `$${(cents / 100).toFixed(2)}`;

// Stable pastel tile (0-5) per product, derived from its slug.
export function tileClass(slug = '') {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `tile-${h % 6}`;
}
