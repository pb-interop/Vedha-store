"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, slugify } from "../lib";

const required = (data: FormData, name: string) => {
  const value = String(data.get(name) ?? "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

export async function createProduct(data: FormData) {
  const { supabase, user } = await requireAdmin();
  const name = required(data, "name");
  const categoryId = Number(required(data, "category_id"));
  const { data: category, error: categoryError } = await supabase.from("categories").select("slug").eq("id", categoryId).single();
  if (categoryError) throw new Error(categoryError.message);
  const code = categoryCode(category.slug);
  const prefix = `VH-${code}-`;
  const { data: existing, error: skuError } = await supabase.from("products").select("sku").like("sku", `${prefix}%`);
  if (skuError) throw new Error(skuError.message);
  const highest = (existing ?? []).reduce((maximum, product) => {
    const number = Number(product.sku?.slice(prefix.length));
    return Number.isInteger(number) ? Math.max(maximum, number) : maximum;
  }, 0);
  const sku = `${prefix}${String(highest + 1).padStart(3, "0")}`;
  const label = required(data, "label");
  const pricePaise = Math.round(Number(required(data, "price")) * 100);
  const stock = Math.max(0, Number(data.get("stock") ?? 0));
  if (!Number.isFinite(pricePaise) || pricePaise < 0) throw new Error("Enter a valid price.");
  const { data: product, error } = await supabase.from("products").insert({ category_id: categoryId, name, slug: `${slugify(name)}-${Date.now().toString().slice(-5)}`, sku, short_description: String(data.get("description") ?? "").trim(), active: true }).select("id").single();
  if (error) throw new Error(error.message);
  const { error: variantError } = await supabase.from("product_variants").insert({ product_id: product.id, label, sku: `${sku}-${label.replace(/\s/g, "").toUpperCase()}`, price_paise: pricePaise, stock_quantity: stock });
  if (variantError) { await supabase.from("products").delete().eq("id", product.id); throw new Error(variantError.message); }
  await supabase.from("audit_log").insert({ admin_user_id: user.id, action: "product_created", entity_type: "product", entity_id: String(product.id), details: { name, sku } });
  revalidatePath("/admin"); revalidatePath("/admin/products"); revalidatePath("/admin/inventory");
}

function categoryCode(slug: string) {
  const codes: Record<string, string> = { "kanji-powders": "KAN", "podi-varieties": "POD", "spices-and-masalas": "MAS", "pickles-and-thokku": "PIC", "rice-mix-pastes": "RIC", ladoos: "LAD", snacks: "SNA", "herbal-products": "HER" };
  return codes[slug] ?? slug.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "X");
}

export async function updateProduct(data: FormData) {
  const { supabase, user } = await requireAdmin();
  const productId = Number(required(data, "product_id"));
  const variantId = Number(required(data, "variant_id"));
  const name = required(data, "name");
  const pricePaise = Math.round(Number(required(data, "price")) * 100);
  const active = data.get("active") === "on";
  const featured = data.get("featured") === "on";
  const { error } = await supabase.from("products").update({ name, active, featured, updated_at: new Date().toISOString() }).eq("id", productId);
  if (error) throw new Error(error.message);
  const { error: priceError } = await supabase.from("product_variants").update({ price_paise: pricePaise, updated_at: new Date().toISOString() }).eq("id", variantId);
  if (priceError) throw new Error(priceError.message);
  await supabase.from("audit_log").insert({ admin_user_id: user.id, action: "product_updated", entity_type: "product", entity_id: String(productId), details: { name, price_paise: pricePaise, active, featured } });
  const image = data.get("image");
  if (image instanceof File && image.size > 0) await uploadProductImage(data);
  revalidatePath("/admin/products");
}

export async function uploadProductImage(data: FormData) {
  const { supabase, user } = await requireAdmin();
  const productId = Number(required(data, "product_id"));
  const productName = String(data.get("name") ?? data.get("product_name") ?? "Product").trim() || "Product";
  const file = data.get("image");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose an image to upload.");
  if (file.size > 5 * 1024 * 1024) throw new Error("The image must be 5 MB or smaller.");
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) throw new Error("Upload a JPG, PNG, or WebP image.");

  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  if ((count ?? 0) >= 8) throw new Error("A product can have up to 8 images.");
  const storagePath = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(`${uploadError.message}. Run supabase/storage-setup.sql if storage is not configured yet.`);

  const { error } = await supabase.from("product_images").insert({ product_id: productId, storage_path: storagePath, alt_text: `${productName} product photograph`, sort_order: count ?? 0 });
  if (error) {
    await supabase.storage.from("product-images").remove([storagePath]);
    throw new Error(error.message);
  }
  await supabase.from("audit_log").insert({ admin_user_id: user.id, action: "product_image_uploaded", entity_type: "product", entity_id: String(productId), details: { storage_path: storagePath } });
  revalidatePath("/admin/products");
}

export async function removeProductImage(data: FormData) {
  const { supabase, user } = await requireAdmin();
  const imageId = Number(required(data, "image_id"));
  const { data: image, error: readError } = await supabase.from("product_images").select("product_id,storage_path").eq("id", imageId).single();
  if (readError) throw new Error(readError.message);
  const { error: storageError } = await supabase.storage.from("product-images").remove([image.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ admin_user_id: user.id, action: "product_image_removed", entity_type: "product", entity_id: String(image.product_id), details: { storage_path: image.storage_path } });
  revalidatePath("/admin/products");
}
