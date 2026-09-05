-- Run once after orders-setup.sql to activate safe administrator order updates.
create or replace function public.admin_update_order(
  target_order_id bigint,
  next_status public.order_status,
  next_payment_status public.payment_status
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_order record;
  ordered_item record;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;

  select id, order_number, status, payment_method, payment_status
  into current_order from public.orders where id=target_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if current_order.status in ('delivered','cancelled') and next_status <> current_order.status then
    raise exception 'A delivered or cancelled order cannot be reopened.';
  end if;

  if current_order.status <> next_status and next_status in ('cancelled','delivered') then
    for ordered_item in select variant_id, quantity from public.order_items where order_id=target_order_id and variant_id is not null loop
      if next_status = 'cancelled' then
        update public.product_variants
        set reserved_quantity=greatest(0,reserved_quantity-ordered_item.quantity),updated_at=now()
        where id=ordered_item.variant_id;
        insert into public.inventory_movements(variant_id,quantity_change,reason,order_id,admin_user_id)
        values(ordered_item.variant_id,0,'Reservation released: order cancelled',target_order_id,auth.uid());
      else
        update public.product_variants
        set stock_quantity=stock_quantity-ordered_item.quantity,
            reserved_quantity=reserved_quantity-ordered_item.quantity,
            updated_at=now()
        where id=ordered_item.variant_id and stock_quantity>=ordered_item.quantity and reserved_quantity>=ordered_item.quantity;
        if not found then raise exception 'Inventory reservation is inconsistent for order %.',current_order.order_number; end if;
        insert into public.inventory_movements(variant_id,quantity_change,reason,order_id,admin_user_id)
        values(ordered_item.variant_id,-ordered_item.quantity,'Order delivered',target_order_id,auth.uid());
      end if;
    end loop;
  end if;

  if next_status='delivered' and current_order.payment_method='cod' then next_payment_status := 'paid'; end if;
  update public.orders set status=next_status,payment_status=next_payment_status,updated_at=now() where id=target_order_id;
  update public.payments set status=next_payment_status,
    verified_by=case when next_payment_status='paid' then auth.uid() else verified_by end,
    verified_at=case when next_payment_status='paid' then now() else verified_at end
  where order_id=target_order_id;
  insert into public.audit_log(admin_user_id,action,entity_type,entity_id,details)
  values(auth.uid(),'order_updated','order',target_order_id::text,jsonb_build_object('order_number',current_order.order_number,'previous_status',current_order.status,'status',next_status,'previous_payment_status',current_order.payment_status,'payment_status',next_payment_status));
end;
$$;

revoke all on function public.admin_update_order(bigint,public.order_status,public.payment_status) from public;
grant execute on function public.admin_update_order(bigint,public.order_status,public.payment_status) to authenticated;
