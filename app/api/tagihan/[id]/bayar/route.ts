import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const nominalBayar = Number(body?.nominal || 0);

  if (!Number.isFinite(nominalBayar) || nominalBayar <= 0) {
    return NextResponse.json({ message: "Nominal bayar harus > 0" }, { status: 400 });
  }

  const existing = await db.tagihan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Tagihan tidak ditemukan" }, { status: 404 });
  }
  if (existing.status === "BATAL") {
    return NextResponse.json({ message: "Tagihan BATAL tidak bisa dibayar" }, { status: 400 });
  }
  if (existing.status === "DRAFT") {
    return NextResponse.json({ message: "Tagihan DRAFT belum bisa dibayar. Publish dulu ke TERBIT." }, { status: 400 });
  }
  if (existing.status === "LUNAS") {
    return NextResponse.json({ message: "Tagihan sudah LUNAS" }, { status: 400 });
  }

  const nominalTerbayar = Math.min(existing.nominal, Number(existing.nominalTerbayar || 0) + nominalBayar);
  const status = nominalTerbayar >= existing.nominal ? "LUNAS" : "SEBAGIAN";

  const updated = await db.tagihan.update({
    where: { id },
    data: { nominalTerbayar, status },
    include: {
      santri: { select: { id: true, nis: true, nama: true } },
      komponen: { select: { id: true, kode: true, nama: true } },
    },
  });

  return NextResponse.json(updated);
}
