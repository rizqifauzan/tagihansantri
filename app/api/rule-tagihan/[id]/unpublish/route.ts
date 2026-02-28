import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const updated = await (prisma as any).ruleTagihan.update({
      where: { id },
      data: { status: "DRAFT" },
      include: {
        komponen: { select: { id: true, kode: true, nama: true } },
        kelas: { select: { id: true, nama: true } },
        santri: { select: { id: true, nis: true, nama: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "Gagal unpublish rule" }, { status: 500 });
  }
}
