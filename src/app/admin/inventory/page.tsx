import { AdminHeader } from "../admin-nav";
import { requireAdmin } from "../lib";
import { setStock } from "./actions";
import styles from "../admin.module.css";

type VariantRow = { id:number; label:string; sku:string; stock_quantity:number; reserved_quantity:number; low_stock_threshold:number; products:{name:string;active:boolean}[] };

export default async function InventoryPage(){
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("product_variants").select("id,label,sku,stock_quantity,reserved_quantity,low_stock_threshold,products(name,active)").order("stock_quantity");
  if(error) throw new Error(error.message);
  const variants=(data ?? []) as VariantRow[];
  const low=variants.filter(v=>v.stock_quantity-v.reserved_quantity<=v.low_stock_threshold).length;
  return <main className={styles.page}><div className={styles.shell}><AdminHeader/><section className={styles.heading}><span>Stock control</span><h1>Inventory</h1><p>Enter the quantity physically available. Changes are recorded automatically.</p></section><div className={styles.inventorySummary}><div><span>Total products</span><b>{variants.length}</b></div><div><span>Low or out of stock</span><b>{low}</b></div><div><span>Total units</span><b>{variants.reduce((sum,v)=>sum+v.stock_quantity,0)}</b></div></div><div className={styles.inventoryList}>{variants.map(v=>{const available=v.stock_quantity-v.reserved_quantity;const status=available===0?"Out of stock":available<=v.low_stock_threshold?"Low stock":"In stock";return <form action={setStock} className={styles.inventoryRow} key={v.id}><input type="hidden" name="variant_id" value={v.id}/><div><strong>{v.products?.[0]?.name}</strong><small>{v.label} · {v.sku}</small></div><span className={status==="In stock"?styles.good:status==="Low stock"?styles.low:styles.out}>{status}</span><div className={styles.stockNumbers}><span>Reserved <b>{v.reserved_quantity}</b></span><span>Available <b>{available}</b></span></div><label>Physical stock<input name="stock_quantity" type="number" min={v.reserved_quantity} defaultValue={v.stock_quantity} required/></label><label>Reason<select name="reason" defaultValue="Stock count"><option>Stock count</option><option>New batch produced</option><option>Damaged item</option><option>Correction</option></select></label><button className={styles.save}>Update stock</button></form>})}</div></div></main>;
}
