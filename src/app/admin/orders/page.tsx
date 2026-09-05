import { AdminHeader } from "../admin-nav";
import { requireAdmin } from "../lib";
import { updateOrder } from "./actions";
import styles from "../admin.module.css";

type OrderItem = { id: number; product_name: string; variant_label: string; sku: string; quantity: number; unit_price_paise: number; line_total_paise: number };
type Payment = { method: string; status: string; upi_reference: string | null };
type Address = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; landmark?: string };
type Order = {
  id: number; order_number: string; status: string; payment_method: string; payment_status: string;
  total_paise: number; shipping_name: string; shipping_phone: string; shipping_address: Address;
  customer_note: string | null; created_at: string; order_items: OrderItem[]; payments: Payment[];
};

const orderStatuses = ["new", "confirmed", "preparing", "packed", "shipped", "delivered", "cancelled"];
const paymentStatuses = ["verification_required", "pending", "paid", "failed", "refunded", "due_on_delivery"];

export default async function OrdersPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("orders").select("id,order_number,status,payment_method,payment_status,total_paise,shipping_name,shipping_phone,shipping_address,customer_note,created_at,order_items(id,product_name,variant_label,sku,quantity,unit_price_paise,line_total_paise),payments(method,status,upi_reference)").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const orders = (data ?? []) as Order[];
  const active = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const paymentChecks = orders.filter((order) => order.payment_status === "verification_required").length;

  return <main className={styles.page}><div className={styles.shell}>
    <AdminHeader/>
    <section className={styles.heading}><span>Order management</span><h1>Orders</h1><p>Review customer details, confirm payment, and move each order through fulfilment.</p></section>
    <div className={styles.orderSummary}><div><span>Total orders</span><b>{orders.length}</b></div><div><span>Active orders</span><b>{active}</b></div><div><span>UPI checks</span><b>{paymentChecks}</b></div></div>
    {orders.length === 0 ? <div className={styles.emptyAdmin}><h2>No orders yet</h2><p>A customer order will appear here immediately after checkout.</p></div> : <div className={styles.orderList}>{orders.map((order) => {
      const address = order.shipping_address ?? {};
      const terminal = ["delivered", "cancelled"].includes(order.status);
      const payment = order.payments[0];
      return <details className={styles.orderEntry} key={order.id} open={order.status === "new"}>
        <summary><div><strong>{order.order_number}</strong><span>{order.shipping_name} · {order.shipping_phone}</span></div><div><span className={styles.orderStatus}>{label(order.status)}</span><b>{money(order.total_paise)}</b><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}</small></div></summary>
        <div className={styles.orderBody}>
          <section><h3>Items</h3><div className={styles.orderItems}>{order.order_items.map((item) => <div key={item.id}><span><strong>{item.product_name}</strong><small>{item.variant_label} · {item.sku}</small></span><span>{item.quantity} × {money(item.unit_price_paise)}</span><b>{money(item.line_total_paise)}</b></div>)}</div></section>
          <section><h3>Shipping</h3><address><strong>{order.shipping_name}</strong><br/>{address.line1}{address.line2 && <><br/>{address.line2}</>}<br/>{address.city}, {address.state} {address.postal_code}{address.landmark && <><br/>Landmark: {address.landmark}</>}<br/><a href={`tel:${order.shipping_phone}`}>{order.shipping_phone}</a></address>{order.customer_note && <p>Note: {order.customer_note}</p>}</section>
          <section><h3>Payment</h3><p><b>{order.payment_method.toUpperCase()}</b><br/>{label(order.payment_status)}{payment?.upi_reference && <><br/>Reference: {payment.upi_reference}</>}</p></section>
        </div>
        <form action={updateOrder} className={styles.orderControls}>
          <input type="hidden" name="order_id" value={order.id}/>
          <label>Order status<select name="status" defaultValue={order.status} disabled={terminal}>{orderStatuses.map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
          <label>Payment status<select name="payment_status" defaultValue={order.payment_status}>{paymentStatuses.map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
          <button className={styles.save} disabled={terminal}>Save order</button>
          {terminal && <small>This order is complete and cannot be reopened.</small>}
        </form>
      </details>;
    })}</div>}
  </div></main>;
}

function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function money(paise: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100); }
