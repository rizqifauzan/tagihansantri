import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ message: "Session tidak ditemukan" }, { status: 401 });
  }

  return NextResponse.json({
    username: session.username,
    role: session.role,
  });
}
