import { AdminHeader } from "../admin-nav";
import { requireAdmin } from "../lib";
import { setStock } from "./actions";
import styles from "../admin.module.css";

type ProductRelation = { name: string; categories: { name: string; sort_order: number } | { name: string; sort_order: number }[] | null };
type VariantRow = { id: number; label: string; sku: string; stock_quantity: number; reserved_quantity: number; low_stock_threshold: number; products: ProductRelation | ProductRelation[] | null };

export default async function InventoryPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("product_variants").select("id,label,sku,stock_quantity,reserved_quantity,low_stock_threshold,products(name,categories(name,sort_order))");
  if (error) throw new Error(error.message);
  const variants = ((data ?? []) as VariantRow[]).sort((a, b) => {
    const categoryDifference = details(a).categoryOrder - details(b).categoryOrder;
    return categoryDifference || details(a).productName.localeCompare(details(b).productName);
  });
  const low = variants.filter((variant) => variant.stock_quantity - variant.reserved_quantity <= variant.low_stock_threshold).length;
  const groups = new Map<string, VariantRow[]>();
  variants.forEach((variant) => { const category = details(variant).categoryName; groups.set(category, [...(groups.get(category) ?? []), variant]); });

  return <main className={styles.page}><div className={styles.shell}>
    <AdminHeader/>
    <section className={styles.heading}><span>Stock control</span><h1>Inventory</h1><p>Products are grouped by category. Enter the quantity physically available.</p></section>
    <div className={styles.inventorySummary}><div><span>Total products</span><b>{variants.length}</b></div><div><span>Low or out of stock</span><b>{low}</b></div><div><span>Total units</span><b>{variants.reduce((sum, variant) => sum + variant.stock_quantity, 0)}</b></div></div>
    <div className={styles.inventoryGroups}>{[...groups.entries()].map(([category, rows]) => <section className={styles.inventoryGroup} key={category}><header><h2>{category}</h2><span>{rows.length} products</span></header><div className={styles.inventoryList}>{rows.map((variant) => {
      const available = variant.stock_quantity - variant.reserved_quantity;
      const status = available === 0 ? "Out of stock" : available <= variant.low_stock_threshold ? "Low stock" : "In stock";
      return <form action={setStock} className={styles.inventoryRow} key={variant.id}>
        <input type="hidden" name="variant_id" value={variant.id}/>
        <div><strong>{details(variant).productName}</strong><small>{variant.label} · {variant.sku}</small></div>
        <span className={status === "In stock" ? styles.good : status === "Low stock" ? styles.low : styles.out}>{status}</span>
        <div className={styles.stockNumbers}><span>Reserved <b>{variant.reserved_quantity}</b></span><span>Available <b>{available}</b></span></div>
        <label>Physical stock<input name="stock_quantity" type="number" min={variant.reserved_quantity} defaultValue={variant.stock_quantity} required/></label>
        <label>Reason<select name="reason" defaultValue="Stock count"><option>Stock count</option><option>New batch produced</option><option>Damaged item</option><option>Correction</option></select></label>
        <button className={styles.save}>Update stock</button>
      </form>;
    })}</div></section>)}</div>
  </div></main>;
}

function details(variant: VariantRow) {
  const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
  const category = Array.isArray(product?.categories) ? product.categories[0] : product?.categories;
  return { productName: product?.name ?? "Unnamed product", categoryName: category?.name ?? "Other", categoryOrder: category?.sort_order ?? 999 };
}
