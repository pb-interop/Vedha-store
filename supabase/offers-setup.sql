-- Run once before re-running orders-setup.sql to activate product sale prices.
create table if not exists public.offer_products (
  offer_id bigint not null references public.offers(id) on delete cascade,
  variant_id bigint not null references public.product_variants(id) on delete cascade,
  sale_price_paise integer not null check(sale_price_paise>=0),
  primary key(offer_id,variant_id)
);

alter table public.offer_products enable row level security;
revoke all on public.offer_products from anon,authenticated;
grant select on public.offer_products to anon,authenticated;
grant all on public.offer_products to authenticated;

drop policy if exists public_active_offer_products on public.offer_products;
create policy public_active_offer_products on public.offer_products for select to anon,authenticated using(
  exists(select 1 from public.offers o where o.id=offer_id and o.active=true and (o.starts_at is null or o.starts_at<=now()) and (o.ends_at is null or o.ends_at>=now()))
);
drop policy if exists admins_manage_offer_products on public.offer_products;
create policy admins_manage_offer_products on public.offer_products for all to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.active_sale_price(target_variant_id bigint)
returns integer language sql stable security definer set search_path=public,pg_temp as $$
  select least(v.price_paise,coalesce(min(case when o.id is not null then op.sale_price_paise end),v.price_paise))
  from public.product_variants v
  left join public.offer_products op on op.variant_id=v.id
  left join public.offers o on o.id=op.offer_id and o.active=true
    and (o.starts_at is null or o.starts_at<=now()) and (o.ends_at is null or o.ends_at>=now())
  where v.id=target_variant_id group by v.price_paise;
$$;
revoke all on function public.active_sale_price(bigint) from public;
