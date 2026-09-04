-- Vedha Store schema. Run once in a new Supabase project's SQL Editor.
create extension if not exists pgcrypto;

create type public.order_status as enum ('new','confirmed','preparing','packed','shipped','delivered','cancelled');
create type public.payment_method as enum ('upi','cod');
create type public.payment_status as enum ('verification_required','pending','paid','failed','refunded','due_on_delivery');

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.products (
  id bigint generated always as identity primary key,
  category_id bigint references public.categories(id),
  name text not null, slug text not null unique, sku text unique,
  short_description text, description text, ingredients text, allergens text,
  usage text, storage_instructions text, vegetarian boolean not null default true,
  active boolean not null default true, featured boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  label text not null, sku text not null unique, price_paise integer not null check(price_paise>=0),
  stock_quantity integer not null default 0 check(stock_quantity>=0),
  reserved_quantity integer not null default 0 check(reserved_quantity>=0 and reserved_quantity<=stock_quantity),
  low_stock_threshold integer not null default 5 check(low_stock_threshold>=0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  storage_path text not null, alt_text text not null, sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id bigint not null references public.product_variants(id),
  quantity_change integer not null, reason text not null,
  order_id bigint, admin_user_id uuid references public.admin_users(user_id),
  created_at timestamptz not null default now()
);
create table public.customers (
  id bigint generated always as identity primary key,
  name text not null, phone text not null, email text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index customers_phone_idx on public.customers(phone);
create table public.addresses (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  address_line1 text not null, address_line2 text, city text not null, state text not null,
  postal_code text not null, landmark text, created_at timestamptz not null default now()
);
create table public.orders (
  id bigint generated always as identity primary key,
  order_number text not null unique,
  customer_id bigint not null references public.customers(id),
  status public.order_status not null default 'new',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null,
  subtotal_paise integer not null check(subtotal_paise>=0), shipping_paise integer not null default 0 check(shipping_paise>=0),
  discount_paise integer not null default 0 check(discount_paise>=0), total_paise integer not null check(total_paise>=0),
  shipping_name text not null, shipping_phone text not null, shipping_address jsonb not null,
  customer_note text, admin_note text, courier_name text, tracking_number text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.inventory_movements add constraint inventory_order_fk foreign key(order_id) references public.orders(id);
create index orders_phone_idx on public.orders(shipping_phone);
create index orders_status_idx on public.orders(status,created_at desc);
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  variant_id bigint references public.product_variants(id),
  product_name text not null, variant_label text not null, sku text not null,
  quantity integer not null check(quantity>0), unit_price_paise integer not null check(unit_price_paise>=0),
  line_total_paise integer not null check(line_total_paise>=0)
);
create table public.payments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id), method public.payment_method not null,
  status public.payment_status not null, amount_paise integer not null check(amount_paise>=0),
  upi_reference text, verified_by uuid references public.admin_users(user_id), verified_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.offers (
  id bigint generated always as identity primary key,
  title text not null, message text, image_path text, button_label text, button_url text,
  discount_kind text check(discount_kind in ('none','percentage','fixed')) default 'none',
  discount_value integer check(discount_value>=0), starts_at timestamptz, ends_at timestamptz,
  active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.invoices (
  id bigint generated always as identity primary key,
  order_id bigint not null unique references public.orders(id), invoice_number text not null unique,
  pdf_path text, issued_at timestamptz not null default now(), cancelled_at timestamptz
);
create table public.audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references public.admin_users(user_id), action text not null,
  entity_type text not null, entity_id text, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_users where user_id=auth.uid() and active=true);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security; alter table public.categories enable row level security;
alter table public.products enable row level security; alter table public.product_variants enable row level security;
alter table public.product_images enable row level security; alter table public.inventory_movements enable row level security;
alter table public.customers enable row level security; alter table public.addresses enable row level security;
alter table public.orders enable row level security; alter table public.order_items enable row level security;
alter table public.payments enable row level security; alter table public.offers enable row level security;
alter table public.invoices enable row level security; alter table public.audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories,public.products,public.product_variants,public.product_images,public.offers to anon,authenticated;
grant all on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

create policy public_active_categories on public.categories for select to anon,authenticated using(active=true);
create policy public_active_products on public.products for select to anon,authenticated using(active=true);
create policy public_active_variants on public.product_variants for select to anon,authenticated using(active=true);
create policy public_product_images on public.product_images for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and p.active=true));
create policy public_active_offers on public.offers for select to anon,authenticated using(active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));

create policy admins_manage_admins on public.admin_users for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_categories on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_products on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_variants on public.product_variants for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_images on public.product_images for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_inventory on public.inventory_movements for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_customers on public.customers for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_addresses on public.addresses for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_orders on public.orders for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_order_items on public.order_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_payments on public.payments for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_offers on public.offers for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_manage_invoices on public.invoices for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admins_read_audit on public.audit_log for select to authenticated using(public.is_admin());
create policy admins_add_audit on public.audit_log for insert to authenticated with check(public.is_admin());

-- After creating the admin in Authentication, run this once with their values:
-- insert into public.admin_users(user_id,display_name) values ('AUTH-USER-UUID','Vedha Administrator');
