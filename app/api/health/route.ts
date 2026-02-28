import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "tagihan-santri2",
    timestamp: new Date().toISOString(),
  });
}
