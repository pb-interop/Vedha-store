"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../lib";

export async function setStock(data: FormData) {
  const { supabase, user } = await requireAdmin();
  const variantId = Number(data.get("variant_id"));
  const newQuantity = Number(data.get("stock_quantity"));
  const reason = String(data.get("reason") ?? "Manual stock count").trim() || "Manual stock count";
  if (!Number.isInteger(newQuantity) || newQuantity < 0) throw new Error("Stock must be a whole number of zero or more.");
  const { data: variant, error: readError } = await supabase.from("product_variants").select("stock_quantity,reserved_quantity").eq("id", variantId).single();
  if (readError) throw new Error(readError.message);
  if (newQuantity < variant.reserved_quantity) throw new Error(`Stock cannot be below ${variant.reserved_quantity}, because those items are reserved.`);
  const change = newQuantity - variant.stock_quantity;
  if (change === 0) return;
  const { error } = await supabase.from("product_variants").update({ stock_quantity: newQuantity, updated_at: new Date().toISOString() }).eq("id", variantId);
  if (error) throw new Error(error.message);
  await supabase.from("inventory_movements").insert({ variant_id: variantId, quantity_change: change, reason, admin_user_id: user.id });
  await supabase.from("audit_log").insert({ admin_user_id: user.id, action: "stock_adjusted", entity_type: "product_variant", entity_id: String(variantId), details: { previous: variant.stock_quantity, current: newQuantity, reason } });
  revalidatePath("/admin"); revalidatePath("/admin/inventory"); revalidatePath("/admin/products");
}
