import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { readTagihanV4History } from "@/lib/tagihan-v4-history";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const history = await readTagihanV4History();
  const found = history.find((entry) => entry.id === id);

  if (!found) {
    return NextResponse.json({ message: "Batch history tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: found });
}
