import { AdminHeader } from "../admin-nav";
import { requireAdmin } from "../lib";
import { createOffer, setOfferActive } from "./actions";
import { OfferSavedNotice } from "./offer-saved-notice";
import styles from "../admin.module.css";

type Category = { name: string; sort_order: number };
type Product = { id: number; name: string; sku: string | null; categories: Category | Category[] | null; product_variants: { id: number; label: string; price_paise: number }[] };
type Offer = { id: number; title: string; message: string | null; image_path: string | null; starts_at: string | null; ends_at: string | null; active: boolean; offer_products: { variant_id: number; sale_price_paise: number }[] };

export default async function OffersPage({ searchParams }: PageProps<"/admin/offers">) {
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: products, error }, { data: offers }] = await Promise.all([
    supabase.from("products").select("id,name,sku,categories(name,sort_order),product_variants(id,label,price_paise)").eq("active", true).order("name"),
    supabase.from("offers").select("id,title,message,image_path,starts_at,ends_at,active,offer_products(variant_id,sale_price_paise)").order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  const productGroups = groupProducts((products ?? []) as Product[]);
  const offerRows = (offers ?? []) as Offer[];

  return <main className={styles.page}><div className={styles.shell}>
    {query.saved === "1" && <OfferSavedNotice/>}
    <AdminHeader/>
    <section className={styles.heading}><span>Campaigns</span><h1>Offers</h1><p>Create a temporary offer price without changing the regular product price.</p></section>
    <details className={styles.addPanel} open={!offerRows.length}><summary>＋ Create a new offer</summary>
      <form action={createOffer} className={styles.offerForm}>
        <div className={styles.offerFields}><label>Offer name<input name="title" required placeholder="Diwali Sale"/></label><label className={styles.offerMessage}>Banner message<input name="message" placeholder="Festival favourites at special prices"/></label><label>Starts (optional)<input name="starts_at" type="datetime-local"/></label><label>Ends (optional)<input name="ends_at" type="datetime-local"/></label><label>Banner picture (optional)<input name="banner_image" type="file" accept="image/jpeg,image/png,image/webp"/></label><label className={`${styles.check} ${styles.displayWebsite}`}><input name="active" type="checkbox"/> Display on Website</label></div>
        <div className={styles.saleProducts}>
          <div className={styles.saleHeader}><strong>Products on Offer</strong><span>Enter an offer price only for products included in this offer.</span></div>
          {productGroups.map((group) => <section className={styles.saleCategory} key={group.name}>
            <header><h3>{group.name}</h3><span>{group.products.length} products</span></header>
            {group.products.map((product) => { const variant=product.product_variants[0]; if(!variant)return null; return <div className={styles.saleRow} key={variant.id}><span><b>{product.name}</b><small>{product.sku} · {variant.label}</small></span><span>Regular <b>{money(variant.price_paise)}</b></span><input type="hidden" name={`regular_${variant.id}`} value={variant.price_paise}/><label>Offer price ₹<input name={`sale_${variant.id}`} type="number" min="0" max={(variant.price_paise-1)/100} step="0.01" placeholder="Optional"/></label></div>; })}
          </section>)}
        </div>
        <button className={styles.save} type="submit">Save offer</button>
      </form>
    </details>
    <div className={styles.offerList}>{offerRows.map((offer) => <article className={styles.offerEntry} key={offer.id}>{offer.image_path && <div className={styles.offerThumb} role="img" aria-label={`${offer.title} banner`} style={{backgroundImage:`url("${supabase.storage.from("product-images").getPublicUrl(offer.image_path).data.publicUrl}")`}}/>}<div><span className={offer.active ? styles.offerLive : styles.offerOff}>{offer.active ? "Live" : "Off"}</span><h2>{offer.title}</h2><p>{offer.message || "No banner message"}</p><small>{dateRange(offer.starts_at,offer.ends_at)} · {offer.offer_products.length} discounted products</small></div><form action={setOfferActive}><input type="hidden" name="offer_id" value={offer.id}/><input type="hidden" name="active" value={String(!offer.active)}/><button className={offer.active ? styles.previewButton : styles.save}>{offer.active ? "Turn off" : "Display on Website"}</button></form></article>)}</div>
  </div></main>;
}

function money(paise:number){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(paise/100);}
function dateRange(start:string|null,end:string|null){const format=(value:string)=>new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeZone:"Asia/Kolkata"}).format(new Date(value));return `${start?format(start):"Starts now"} – ${end?format(end):"No end date"}`;}
function groupProducts(products:Product[]){
  const groups = new Map<string,{name:string;sortOrder:number;products:Product[]}>();
  for(const product of products){
    const category=Array.isArray(product.categories)?product.categories[0]:product.categories;
    const name=category?.name ?? "Other";
    if(!groups.has(name))groups.set(name,{name,sortOrder:category?.sort_order ?? 999,products:[]});
    groups.get(name)!.products.push(product);
  }
  return [...groups.values()].sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name));
}
