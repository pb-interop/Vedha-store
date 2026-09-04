import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const storefront = await readFile(path.join(process.cwd(), "public", "storefront.html"), "utf8");
  const encoded = storefront.match(/--logo:url\("data:image\/png;base64,([^"\)]+)"\)/)?.[1];
  if (!encoded) return new NextResponse(null, { status: 404 });
  const image = new Uint8Array(Buffer.from(encoded, "base64"));
  return new NextResponse(image, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
