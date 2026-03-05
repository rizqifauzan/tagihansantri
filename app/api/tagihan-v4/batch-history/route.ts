import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { readTagihanV4History } from "@/lib/tagihan-v4-history";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const history = await readTagihanV4History();
  return NextResponse.json({ data: history });
}
