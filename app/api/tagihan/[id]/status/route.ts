import { TagihanStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUS = new Set(Object.values(TagihanStatus));

function isTransitionAllowed(current: TagihanStatus, next: TagihanStatus): boolean {
  if (current === next) return true;
  if (current === "LUNAS" || current === "BATAL") return false;

  switch (current) {
    case "DRAFT":
      return next === "TERBIT" || next === "BATAL";
    case "TERBIT":
      return next === "SEBAGIAN" || next === "LUNAS" || next === "BATAL" || next === "DRAFT";
    case "SEBAGIAN":
      return next === "LUNAS" || next === "BATAL" || next === "TERBIT";
    default:
      return false;
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const nextStatusRaw = String(body?.status || "").trim();

  if (!VALID_STATUS.has(nextStatusRaw as TagihanStatus)) {
    return NextResponse.json({ message: "Status tagihan tidak valid" }, { status: 400 });
  }
  const nextStatus = nextStatusRaw as TagihanStatus;

  const existing = await db.tagihan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Tagihan tidak ditemukan" }, { status: 404 });
  }

  const paymentCount = await db.pembayaran.count({ where: { tagihanId: id } });

  if (!isTransitionAllowed(existing.status, nextStatus)) {
    return NextResponse.json(
      { message: `Perubahan status dari ${existing.status} ke ${nextStatus} tidak diizinkan` },
      { status: 400 },
    );
  }

  if (existing.nominal <= 0 && nextStatus === "TERBIT") {
    return NextResponse.json(
      { message: "Tagihan nominal 0 harus berstatus LUNAS dan tidak bisa diset ke TERBIT" },
      { status: 400 },
    );
  }

  if ((nextStatus === "DRAFT" || nextStatus === "TERBIT") && paymentCount > 0) {
    return NextResponse.json(
      { message: "Tagihan yang sudah memiliki pembayaran tidak bisa dikembalikan ke DRAFT/TERBIT" },
      { status: 400 },
    );
  }

  const nextNominalTerbayar =
    nextStatus === "DRAFT" || nextStatus === "TERBIT"
      ? 0
      : nextStatus === "LUNAS"
        ? existing.nominal
        : existing.nominalTerbayar;

  const updated = await db.tagihan.update({
    where: { id },
    data: {
      status: nextStatus,
      nominalTerbayar: nextNominalTerbayar,
    },
    include: {
      santri: { select: { id: true, nis: true, nama: true } },
      komponen: { select: { id: true, kode: true, nama: true } },
    },
  });

  return NextResponse.json(updated);
}
