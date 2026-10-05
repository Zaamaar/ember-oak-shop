create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.cart_items enable row level security;

create policy "own cart: select" on public.cart_items
  for select using (auth.uid() = user_id);
create policy "own cart: insert" on public.cart_items
  for insert with check (auth.uid() = user_id);
create policy "own cart: update" on public.cart_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cart: delete" on public.cart_items
  for delete using (auth.uid() = user_id);

alter table public.cart_items replica identity full;
alter publication supabase_realtime add table public.cart_items;
