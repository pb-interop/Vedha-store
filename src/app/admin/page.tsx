import Link from "next/link";
import { isApprovedAdmin, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { signIn } from "./actions";
import { AdminHeader } from "./admin-nav";
import styles from "./admin.module.css";

const errors: Record<string, string> = {
  missing: "Enter both email and password.",
  unauthorized: "This email is not approved for Vedha administration.",
  invalid: "The email or password is incorrect.",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const query = await searchParams;
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isApprovedAdmin(user.email)) {
    return <Login error={typeof query.error === "string" ? errors[query.error] : undefined} />;
  }

  const [products, orders, customers, variants] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("product_variants").select("stock_quantity,reserved_quantity,low_stock_threshold"),
  ]);
  const databaseReady = !products.error && !orders.error && !customers.error && !variants.error;
  const lowStock = (variants.data ?? []).filter((item) =>
    item.stock_quantity - item.reserved_quantity <= item.low_stock_threshold
  ).length;

  const actions = [
    { name: "Products", description: "Add items, prices and details", href: "/admin/products" },
    { name: "Inventory", description: "Update stock and review low-stock items", href: "/admin/inventory" },
    { name: "Orders", description: "View customers, addresses, payment and fulfilment", href: "/admin/orders" },
  ];
  const upcoming = [
    ["Offers", "Create sale and festival banners"],
    ["Customers", "Search customers by name or phone"],
    ["Invoices", "Print, download and resend invoices"],
  ];

  return <main className={styles.page}><div className={styles.shell}>
    <AdminHeader />
    <section className={styles.heading}><span>Administrator</span><h1>Store overview</h1><p>{databaseReady ? "Your live Vedha catalogue and inventory are ready." : "Some store information could not be loaded."}</p></section>
    <section className={styles.metrics}>
      <Metric label="Products" value={products.count ?? 0} note="Catalogue items" />
      <Metric label="New orders" value={orders.count ?? 0} note="Awaiting action" />
      <Metric label="Customers" value={customers.count ?? 0} note="Guest customers" />
      <Metric label="Low stock" value={lowStock} note="Needs attention" />
    </section>
    <section className={styles.actions}>
      {actions.map((action) => <Link className={styles.action} href={action.href} key={action.name}><b>{action.name}</b><span>{action.description}</span></Link>)}
      {upcoming.map(([name, description]) => <div className={`${styles.action} ${styles.upcoming}`} key={name}><b>{name}</b><span>{description}<small>Coming next</small></span></div>)}
    </section>
  </div></main>;
}

function Brand() {
  return <div className={styles.brand}><span className={styles.mark}>V</span><span><strong>VEDHA</strong><small>Store administration</small></span></div>;
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Login({ error }: { error?: string }) {
  return <main className={styles.page}><section className={styles.login}><Brand/><h1>Administrator sign in</h1><p>Only the Vedha store administrator can access products, inventory and orders.</p>{error && <p className={styles.error}>{error}</p>}<form action={signIn}><label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button className={styles.primary}>Sign in</button></form><p className={styles.privacy}>Customers never use this page and do not need accounts.</p><Link className={styles.back} href="/">← Return to store</Link></section></main>;
}

function Setup() {
  return <main className={styles.page}><section className={styles.setup}><Brand/><h1>Database setup required</h1><p>The administrator interface is installed safely, but it needs your Supabase project before login can be activated.</p><div className={styles.steps}><div className={styles.step}><b>1</b><p>Create a free Supabase project.</p></div><div className={styles.step}><b>2</b><p>Run <code>supabase/schema.sql</code> and then <code>supabase/seed.sql</code> in its SQL Editor.</p></div><div className={styles.step}><b>3</b><p>Copy <code>.env.example</code> to <code>.env.local</code> and enter the project URL, publishable key and approved administrator email.</p></div><div className={styles.step}><b>4</b><p>Create that administrator in Supabase Authentication, then restart the application.</p></div></div><Link className={styles.back} href="/">← Return to store</Link></section></main>;
}
