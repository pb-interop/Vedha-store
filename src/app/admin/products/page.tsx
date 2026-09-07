import { AdminHeader } from "../admin-nav";
import { requireAdmin } from "../lib";
import { removeProductImage, updateProduct } from "./actions";
import { AddProductForm } from "./add-product-form";
import { ProductPreview } from "./product-preview";
import styles from "../admin.module.css";

type Category = { id: number; name: string; slug: string };
type Variant = { id: number; label: string; price_paise: number; stock_quantity: number };
type ProductImage = { id: number; storage_path: string; alt_text: string; sort_order: number };
type ProductRow = {
  id: number;
  category_id: number;
  name: string;
  sku: string | null;
  active: boolean;
  featured: boolean;
  categories: { name: string } | { name: string }[] | null;
  product_variants: Variant[];
  product_images: ProductImage[];
};

export default async function ProductsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: categories }, { data: products, error }] = await Promise.all([
    supabase.from("categories").select("id,name,slug").order("sort_order"),
    supabase.from("products").select("id,category_id,name,sku,active,featured,categories(name),product_variants(id,label,price_paise,stock_quantity),product_images(id,storage_path,alt_text,sort_order)").order("name"),
  ]);
  if (error) throw new Error(error.message);

  const categoryRows = (categories ?? []) as Category[];
  const productRows = (products ?? []) as ProductRow[];
  const categoryOptions = categoryRows.map((category) => {
    const code = categoryCode(category.slug);
    const prefix = `VH-${code}-`;
    const highest = productRows.filter((product) => product.category_id === category.id).reduce((maximum, product) => {
      const number = product.sku?.startsWith(prefix) ? Number(product.sku.slice(prefix.length)) : 0;
      return Number.isInteger(number) ? Math.max(maximum, number) : maximum;
    }, 0);
    return { id: category.id, name: category.name, nextSku: `${prefix}${String(highest + 1).padStart(3, "0")}` };
  });

  return <main className={styles.page}><div className={styles.shell}>
    <AdminHeader />
    <section className={styles.heading}><span>Catalogue</span><h1>Products</h1><p>Add products, update prices and upload up to eight photographs per item.</p></section>
    <details className={styles.addPanel}><summary>＋ Add a new product</summary><AddProductForm categories={categoryOptions}/></details>
    <div className={styles.productTable}>{productRows.map((product) => {
      const variant = product.product_variants[0];
      const category = Array.isArray(product.categories) ? product.categories[0] : product.categories;
      const images = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
      const imageUrls = images.map((image) => supabase.storage.from("product-images").getPublicUrl(image.storage_path).data.publicUrl);
      return <form action={updateProduct} className={styles.productEntry} key={product.id}>
        <div className={styles.productLine}>
          <input type="hidden" name="product_id" value={product.id}/><input type="hidden" name="variant_id" value={variant?.id}/><input type="hidden" name="product_name" value={product.name}/>
          <div className={styles.productIdentity}><span className={styles.productInitial}>{product.name.charAt(0)}</span><span><b>{product.sku}</b><small>{category?.name} · {variant?.label} · Stock {variant?.stock_quantity}</small></span></div>
          <label>Name<input name="name" defaultValue={product.name} required/></label>
          <label>Price ₹<input name="price" type="number" min="0" step="0.01" defaultValue={(variant?.price_paise ?? 0) / 100} required/></label>
          <label className={styles.check}><input name="active" type="checkbox" defaultChecked={product.active}/> Show</label>
          <label className={styles.check}><input name="featured" type="checkbox" defaultChecked={product.featured}/> Featured</label>
        </div>
        <div className={styles.imageManager}>
          <div className={styles.imageStrip}>{images.length ? images.map((image) => {
            const url = supabase.storage.from("product-images").getPublicUrl(image.storage_path).data.publicUrl;
            return <div className={styles.imageTile} key={image.id}><div className={styles.imagePreview} role="img" aria-label={image.alt_text} style={{ backgroundImage: `url("${url}")` }}/><button type="submit" name="image_id" value={image.id} formAction={removeProductImage}>Remove</button></div>;
          }) : <p>No photographs uploaded. The storefront uses generated package artwork.</p>}</div>
          <div className={styles.imageUpload}>
            <label>Upload Photo<input name="image" type="file" accept="image/jpeg,image/png,image/webp"/></label>
            <div className={styles.productButtons}><ProductPreview category={category?.name ?? "Other"} weight={variant?.label ?? ""} stock={variant?.stock_quantity ?? 0} currentImages={imageUrls}/><button className={styles.save} type="submit">Save</button></div>
          </div>
        </div>
      </form>;
    })}</div>
  </div></main>;
}

function categoryCode(slug: string) {
  const codes: Record<string, string> = { "kanji-powders": "KAN", "podi-varieties": "POD", "spices-and-masalas": "MAS", "pickles-and-thokku": "PIC", "rice-mix-pastes": "RIC", ladoos: "LAD", snacks: "SNA", "herbal-products": "HER" };
  return codes[slug] ?? slug.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "X");
}
