import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const upiId = process.env.VEDHA_UPI_ID?.trim() ?? "";
  return NextResponse.json({ upiEnabled: Boolean(upiId), upiId }, { headers: { "Cache-Control": "no-store" } });
}
