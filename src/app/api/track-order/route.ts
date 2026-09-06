import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let input: { order_number?: string; phone?: string };
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Enter a valid order number and phone number." }, { status: 400 }); }

  const orderNumber = String(input.order_number ?? "").trim().toUpperCase();
  const phone = String(input.phone ?? "").replace(/\D/g, "");
  if (!/^VH-\d{4}-\d{5}$/.test(orderNumber) || phone.length < 10 || phone.length > 15) {
    return NextResponse.json({ error: "Enter a valid Vedha order number and phone number." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_guest_order", { order_reference: orderNumber, phone_reference: phone });
  if (error) return NextResponse.json({ error: "Order tracking is temporarily unavailable." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "We could not find an order matching both details." }, { status: 404 });
  return NextResponse.json(data);
}
