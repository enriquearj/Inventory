-- ═══════════════════════════════════════════
-- G&Z LLC — Sistema de Almacén
-- Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════

-- 1. Categories
create table if not exists categories (
  id    text primary key,
  name  text not null,
  emoji text not null default '📦',
  color text not null default '#475569'
);

-- 2. Products
create table if not exists products (
  id          integer primary key,
  category_id text not null references categories(id) on delete cascade,
  name        text not null
);

-- 3. Inventory counts (upsertable)
create table if not exists inventory_counts (
  product_id  integer primary key references products(id) on delete cascade,
  quantity    integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- 4. Damaged / defective counts (upsertable)
create table if not exists damaged_counts (
  product_id  integer primary key references products(id) on delete cascade,
  quantity    integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────
-- For a private internal tool, allow all operations.
-- For production with user auth, restrict to authenticated users.

alter table categories      enable row level security;
alter table products        enable row level security;
alter table inventory_counts enable row level security;
alter table damaged_counts   enable row level security;

-- Public access policies (adjust for production)
create policy "public_categories"      on categories      for all using (true) with check (true);
create policy "public_products"        on products        for all using (true) with check (true);
create policy "public_inventory"       on inventory_counts for all using (true) with check (true);
create policy "public_damaged"         on damaged_counts   for all using (true) with check (true);

-- ── Real-time ─────────────────────────────────
-- Enable real-time for inventory_counts so multiple
-- users can see each other's count updates live.
-- Go to: Supabase Dashboard → Database → Replication
-- and add the "inventory_counts" table.

-- ── Helpful index ─────────────────────────────
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_counts_updated on inventory_counts(updated_at);
create index if not exists idx_damaged_updated on damaged_counts(updated_at);
