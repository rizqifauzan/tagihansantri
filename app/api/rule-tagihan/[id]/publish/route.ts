import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hasPublishedConflict } from "@/lib/rule-tagihan";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const existing = await (prisma as any).ruleTagihan.findUnique({
    where: { id },
    select: {
      id: true,
      komponenId: true,
      cakupan: true,
      kelasId: true,
      gender: true,
      santriId: true,
      status: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Rule tidak ditemukan" }, { status: 404 });
  }
  if (existing.status === "PUBLISHED") {
    return NextResponse.json({ message: "Rule sudah published" }, { status: 400 });
  }

  const conflict = await hasPublishedConflict(existing);
  if (conflict.conflict) {
    return NextResponse.json(
      {
        message: "Rule bentrok dengan rule published lain. Simpan draft boleh, publish ditolak.",
        conflictingRuleId: conflict.conflictingRuleId,
      },
      { status: 409 },
    );
  }

  const published = await (prisma as any).ruleTagihan.update({
    where: { id },
    data: { status: "PUBLISHED" },
    include: {
      komponen: { select: { id: true, kode: true, nama: true } },
      kelas: { select: { id: true, nama: true } },
      santri: { select: { id: true, nis: true, nama: true } },
    },
  });

  return NextResponse.json(published);
}
