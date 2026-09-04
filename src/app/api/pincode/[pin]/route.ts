import { NextResponse } from "next/server";

type PostalOffice = { Block?: string; District?: string; State?: string };
type PostalResponse = { Status?: string; PostOffice?: PostalOffice[] | null };

export async function GET(_request: Request, context: RouteContext<"/api/pincode/[pin]">) {
  const { pin } = await context.params;
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error("Postal lookup failed");
    const payload = await response.json() as PostalResponse[];
    const office = payload[0]?.PostOffice?.[0];
    if (!office?.District || !office.State) return NextResponse.json({ error: "PIN code not found. Enter the city and state manually." }, { status: 404 });
    const city = office.Block && office.Block !== "NA" ? office.Block : office.District;
    return NextResponse.json({ city, state: office.State });
  } catch {
    return NextResponse.json({ error: "Postal lookup is temporarily unavailable. Enter the city and state manually." }, { status: 503 });
  }
}
