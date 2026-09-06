"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../lib";

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

export async function createOffer(data: FormData) {
  const { supabase, user } = await requireAdmin();
  const title = text(data, "title");
  const message = text(data, "message");
  const startsAt = indiaDate(text(data, "starts_at"));
  const endsAt = indiaDate(text(data, "ends_at"));
  const active = data.get("active") === "on";
  if (!title) throw new Error("Enter an offer name.");
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error("The end date must be after the start date.");

  const saleRows: { variant_id: number; sale_price_paise: number }[] = [];
  for (const [key, value] of data.entries()) {
    if (!key.startsWith("sale_") || !String(value).trim()) continue;
    const variantId = Number(key.slice(5));
    const salePrice = Math.round(Number(value) * 100);
    const regularPrice = Number(data.get(`regular_${variantId}`));
    if (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= regularPrice) throw new Error("Every sale price must be lower than its regular price.");
    saleRows.push({ variant_id: variantId, sale_price_paise: salePrice });
  }
  if (!saleRows.length) throw new Error("Enter a sale price for at least one product.");
  if (active) await supabase.from("offers").update({ active: false, updated_at: new Date().toISOString() }).eq("active", true);
  const { data: offer, error } = await supabase.from("offers").insert({ title, message: message || null, discount_kind: "none", starts_at: startsAt?.toISOString() ?? null, ends_at: endsAt?.toISOString() ?? null, active }).select("id").single();
  if (error) throw new Error(error.message);
  const { error: rowsError } = await supabase.from("offer_products").insert(saleRows.map((row) => ({ ...row, offer_id: offer.id })));
  if (rowsError) { await supabase.from("offers").delete().eq("id", offer.id); throw new Error(`${rowsError.message}. Run supabase/offers-setup.sql first.`); }
  const image = data.get("banner_image");
  if (image instanceof File && image.size > 0) {
    try { await uploadBanner(supabase, offer.id, image); }
    catch (problem) { await supabase.from("offers").delete().eq("id", offer.id); throw problem; }
  }
  await supabase.from("audit_log").insert({ admin_user_id: user.id, action: "offer_created", entity_type: "offer", entity_id: String(offer.id), details: { title, products: saleRows.length, active } });
  refreshOffers();
  redirect("/admin/offers?saved=1");
}

export async function setOfferActive(data: FormData) {
  const { supabase, user } = await requireAdmin();
  const offerId = Number(data.get("offer_id"));
  const active = data.get("active") === "true";
  if (active) await supabase.from("offers").update({ active: false, updated_at: new Date().toISOString() }).eq("active", true);
  const { error } = await supabase.from("offers").update({ active, updated_at: new Date().toISOString() }).eq("id", offerId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ admin_user_id: user.id, action: active ? "offer_activated" : "offer_deactivated", entity_type: "offer", entity_id: String(offerId) });
  refreshOffers();
}

function indiaDate(value: string) { return value ? new Date(`${value}:00+05:30`) : null; }
function refreshOffers() { revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/admin/offers"); }

async function uploadBanner(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], offerId: number, file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error("The banner image must be 5 MB or smaller.");
  const extensions: Record<string,string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) throw new Error("Upload a JPG, PNG, or WebP banner image.");
  const path = `offers/${offerId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(`${uploadError.message}. Run supabase/storage-setup.sql if storage is not configured.`);
  const { error } = await supabase.from("offers").update({ image_path: path }).eq("id", offerId);
  if (error) { await supabase.storage.from("product-images").remove([path]); throw new Error(error.message); }
}
