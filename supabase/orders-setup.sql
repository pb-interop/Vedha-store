-- Run once in Supabase SQL Editor to activate secure guest checkout.
create sequence if not exists public.order_number_seq start 1;

create or replace function public.place_guest_order(checkout jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  customer_name text := trim(checkout->>'name');
  customer_phone text := regexp_replace(coalesce(checkout->>'phone',''), '\D', '', 'g');
  payment_text text := checkout->>'payment_method';
  payment_kind public.payment_method;
  payment_state public.payment_status;
  customer_id_value bigint;
  address_id_value bigint;
  order_id_value bigint;
  order_number_value text;
  subtotal_value integer := 0;
  item jsonb;
  quantity_value integer;
  variant_record record;
begin
  if length(customer_name) < 2 or length(customer_name) > 120 then raise exception 'Enter a valid full name.'; end if;
  if length(customer_phone) < 10 or length(customer_phone) > 15 then raise exception 'Enter a valid phone number.'; end if;
  if length(trim(checkout->'address'->>'line1')) < 5 then raise exception 'Enter a valid address.'; end if;
  if length(trim(checkout->'address'->>'city')) < 2 then raise exception 'Enter a valid city.'; end if;
  if (checkout->'address'->>'postal_code') !~ '^[0-9]{6}$' then raise exception 'Enter a valid 6-digit PIN code.'; end if;
  if jsonb_typeof(checkout->'items') <> 'array' or jsonb_array_length(checkout->'items') = 0 then raise exception 'Your cart is empty.'; end if;
  if jsonb_array_length(checkout->'items') > 30 then raise exception 'Too many items in this order.'; end if;
  if (select count(*) from jsonb_array_elements(checkout->'items')) <>
     (select count(distinct (entry->>'product_id')::bigint) from jsonb_array_elements(checkout->'items') entry)
  then raise exception 'Duplicate products are not allowed.'; end if;

  if payment_text = 'upi' then
    if length(trim(coalesce(checkout->>'upi_reference',''))) < 6 then raise exception 'Enter the UPI transaction reference.'; end if;
    payment_kind := 'upi'; payment_state := 'verification_required';
  elsif payment_text = 'cod' then
    payment_kind := 'cod'; payment_state := 'due_on_delivery';
  else raise exception 'Choose a valid payment method.';
  end if;

  for item in select value from jsonb_array_elements(checkout->'items') loop
    quantity_value := (item->>'quantity')::integer;
    if quantity_value < 1 or quantity_value > 20 then raise exception 'Each quantity must be between 1 and 20.'; end if;
    select v.id, v.label, v.sku, v.price_paise, public.active_sale_price(v.id) as effective_price_paise, v.stock_quantity, v.reserved_quantity, p.name
      into variant_record
      from public.products p join public.product_variants v on v.product_id=p.id
      where p.id=(item->>'product_id')::bigint and p.active=true and v.active=true
      order by v.id limit 1 for update of v;
    if not found then raise exception 'A product in your cart is no longer available.'; end if;
    if variant_record.stock_quantity - variant_record.reserved_quantity < quantity_value then
      raise exception '% has only % available.', variant_record.name, variant_record.stock_quantity - variant_record.reserved_quantity;
    end if;
    subtotal_value := subtotal_value + variant_record.effective_price_paise * quantity_value;
  end loop;

  insert into public.customers(name,phone,email)
  values(customer_name,customer_phone,nullif(trim(checkout->>'email'),'')) returning id into customer_id_value;
  insert into public.addresses(customer_id,address_line1,address_line2,city,state,postal_code,landmark)
  values(customer_id_value,trim(checkout->'address'->>'line1'),nullif(trim(checkout->'address'->>'line2'),''),trim(checkout->'address'->>'city'),coalesce(nullif(trim(checkout->'address'->>'state'),''),'Tamil Nadu'),checkout->'address'->>'postal_code',nullif(trim(checkout->'address'->>'landmark'),''))
  returning id into address_id_value;

  order_number_value := 'VH-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text,5,'0');
  insert into public.orders(order_number,customer_id,status,payment_method,payment_status,subtotal_paise,shipping_paise,discount_paise,total_paise,shipping_name,shipping_phone,shipping_address,customer_note)
  values(order_number_value,customer_id_value,'new',payment_kind,payment_state,subtotal_value,0,0,subtotal_value,customer_name,customer_phone,checkout->'address',nullif(trim(checkout->>'note'),''))
  returning id into order_id_value;

  for item in select value from jsonb_array_elements(checkout->'items') loop
    quantity_value := (item->>'quantity')::integer;
    select v.id, v.label, v.sku, public.active_sale_price(v.id) as price_paise, p.name into variant_record
      from public.products p join public.product_variants v on v.product_id=p.id
      where p.id=(item->>'product_id')::bigint and p.active=true and v.active=true order by v.id limit 1;
    insert into public.order_items(order_id,variant_id,product_name,variant_label,sku,quantity,unit_price_paise,line_total_paise)
    values(order_id_value,variant_record.id,variant_record.name,variant_record.label,variant_record.sku,quantity_value,variant_record.price_paise,variant_record.price_paise*quantity_value);
    update public.product_variants set reserved_quantity=reserved_quantity+quantity_value,updated_at=now() where id=variant_record.id;
    insert into public.inventory_movements(variant_id,quantity_change,reason,order_id)
    values(variant_record.id,0,'Reserved for order '||order_number_value,order_id_value);
  end loop;
  insert into public.payments(order_id,method,status,amount_paise,upi_reference)
  values(order_id_value,payment_kind,payment_state,subtotal_value,nullif(trim(checkout->>'upi_reference'),''));
  return jsonb_build_object('order_number',order_number_value,'total_paise',subtotal_value,'payment_status',payment_state);
end;
$$;

revoke all on function public.place_guest_order(jsonb) from public;
grant execute on function public.place_guest_order(jsonb) to anon, authenticated;
