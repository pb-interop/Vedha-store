"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../lib";

export async function updateOrder(data: FormData) {
  const { supabase } = await requireAdmin();
  const orderId = Number(data.get("order_id"));
  const status = String(data.get("status") ?? "");
  const paymentStatus = String(data.get("payment_status") ?? "");
  if (!Number.isInteger(orderId)) throw new Error("Invalid order.");
  const { error } = await supabase.rpc("admin_update_order", { target_order_id: orderId, next_status: status, next_payment_status: paymentStatus });
  if (error) throw new Error(`${error.message}. Run supabase/order-admin-setup.sql if order updates are not activated yet.`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
}
