import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Gunakan endpoint /generate untuk publish/generate tagihan" },
    { status: 400 },
  );
}
