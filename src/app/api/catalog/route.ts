import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CatalogRow = {
  id: number;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  ingredients: string | null;
  allergens: string | null;
  usage: string | null;
  storage_instructions: string | null;
  vegetarian: boolean;
  featured: boolean;
  categories: { name: string; sort_order: number } | { name: string; sort_order: number }[] | null;
  product_variants: {
    id: number;
    label: string;
    price_paise: number;
    stock_quantity: number;
    reserved_quantity: number;
    active: boolean;
  }[];
  product_images: {
    storage_path: string;
    alt_text: string;
    sort_order: number;
  }[];
};

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,short_description,description,ingredients,allergens,usage,storage_instructions,vegetarian,featured,categories(name,sort_order),product_variants(id,label,price_paise,stock_quantity,reserved_quantity,active),product_images(storage_path,alt_text,sort_order)")
    .eq("active", true)
    .order("name");

  if (error) {
    return NextResponse.json({ error: "The catalogue could not be loaded." }, { status: 500 });
  }

  const products = ((data ?? []) as CatalogRow[])
    .map((product) => {
      const variant = product.product_variants.find((item) => item.active);
      if (!variant) return null;
      const category = Array.isArray(product.categories) ? product.categories[0] : product.categories;
      const images = [...product.product_images]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((image) => ({
          url: supabase.storage.from("product-images").getPublicUrl(image.storage_path).data.publicUrl,
          alt: image.alt_text,
        }));
      return {
        id: product.id,
        slug: product.slug,
        cat: category?.name ?? "Other",
        categoryOrder: category?.sort_order ?? 999,
        name: product.name,
        wt: variant.label,
        price: variant.price_paise / 100,
        stock: Math.max(0, variant.stock_quantity - variant.reserved_quantity),
        featured: product.featured,
        description: product.description ?? product.short_description,
        ingredients: product.ingredients,
        allergens: product.allergens,
        usage: product.usage,
        storage: product.storage_instructions,
        vegetarian: product.vegetarian,
        images,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.categoryOrder - b!.categoryOrder) || a!.name.localeCompare(b!.name));

  return NextResponse.json({ products }, {
    headers: { "Cache-Control": "no-store" },
  });
}
