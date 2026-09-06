-- Run once after orders-setup.sql to activate secure guest order tracking.
create or replace function public.track_guest_order(order_reference text, phone_reference text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'customer_name', o.shipping_name,
    'status', o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'total_paise', o.total_paise,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.product_name,
        'variant', i.variant_label,
        'quantity', i.quantity,
        'unit_price_paise', i.unit_price_paise,
        'line_total_paise', i.line_total_paise
      ) order by i.id)
      from public.order_items i where i.order_id=o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where upper(o.order_number)=upper(trim(order_reference))
    and regexp_replace(o.shipping_phone, '\D', '', 'g')=regexp_replace(phone_reference, '\D', '', 'g')
  limit 1;
$$;

revoke all on function public.track_guest_order(text,text) from public;
grant execute on function public.track_guest_order(text,text) to anon, authenticated;
