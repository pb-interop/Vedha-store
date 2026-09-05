import Link from "next/link";
import { signOut } from "./actions";
import styles from "./admin.module.css";

export function AdminHeader() {
  return <><header className={styles.topbar}><Link className={styles.brand} href="/admin"><span className={styles.mark}>V</span><span><strong>VEDHA</strong><small>Store administration</small></span></Link><form action={signOut}><button className={styles.logout}>Sign out</button></form></header><nav className={styles.adminNav}><Link href="/admin">Dashboard</Link><Link href="/admin/products">Products</Link><Link href="/admin/inventory">Inventory</Link><Link href="/admin/orders">Orders</Link><span>Offers</span><span>Invoices</span></nav></>;
}
