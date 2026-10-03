-- Run with: psql "$SUPABASE_DB_URL" -f supabase/schema.sql
-- (or paste into the Supabase SQL editor)

create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  emoji text,
  stock integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  address text not null,
  city text not null,
  phone text,
  total_cents integer not null check (total_cents >= 0),
  status text not null default 'confirmed',
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0)
);

create index if not exists orders_user_id_idx on orders(user_id);
create index if not exists order_items_order_id_idx on order_items(order_id);

-- Row level security
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "products are public" on products;
create policy "products are public" on products for select using (true);

drop policy if exists "users read own orders" on orders;
create policy "users read own orders" on orders for select using (auth.uid() = user_id);

drop policy if exists "users read own order items" on order_items;
create policy "users read own order items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));

-- Orders are written only by the server (service role key bypasses RLS).

insert into products (slug, name, description, price_cents, emoji) values
  ('house-blend', 'House Blend', 'Chocolate and toasted hazelnut. Our everyday roast, 250g.', 1400, '☕'),
  ('ethiopia-guji', 'Ethiopia Guji', 'Bright, floral, blueberry finish. Light roast, 250g.', 1850, '🫐'),
  ('cold-brew-pack', 'Cold Brew Pack', 'Six steep bags, coarse ground. Just add water and wait.', 1600, '🧊'),
  ('ceramic-mug', 'Stoneware Mug', 'Hand-glazed, 350ml, dishwasher safe.', 2200, '🍵'),
  ('pour-over-set', 'Pour-Over Set', 'Dripper, server and 40 filters.', 4800, '🫖'),
  ('tote-bag', 'Canvas Tote', 'Heavy cotton, fits six bags of beans and a bad mood.', 1200, '👜')
on conflict (slug) do nothing;
