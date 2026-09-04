import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let checkout: unknown;
  try { checkout = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid checkout information." }, { status: 400 }); }
  if (!checkout || typeof checkout !== "object") return NextResponse.json({ error: "Invalid checkout information." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_guest_order", { checkout });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
