import { Gender, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { RuleCakupanType, validateRuleInput } from "@/lib/rule-tagihan";

const VALID_CAKUPAN = new Set<RuleCakupanType>(["GLOBAL", "KELAS", "GENDER", "SANTRI"]);
const VALID_GENDER = new Set(Object.values(Gender));

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const existing = await (prisma as any).ruleTagihan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Rule tidak ditemukan" }, { status: 404 });
  }
  if (existing.status === "PUBLISHED") {
    return NextResponse.json(
      { message: "Rule PUBLISHED tidak bisa diubah. Unpublish dulu." },
      { status: 400 },
    );
  }

  const body = await req.json();
  const cakupanRaw = String(body?.cakupan || "").trim() as RuleCakupanType;

  if (!VALID_CAKUPAN.has(cakupanRaw)) {
    return NextResponse.json({ message: "Cakupan rule tidak valid" }, { status: 400 });
  }

  const genderRaw = String(body?.gender || "").trim();
  const gender = genderRaw ? (genderRaw as Gender) : null;
  if (gender && !VALID_GENDER.has(gender)) {
    return NextResponse.json({ message: "Gender tidak valid" }, { status: 400 });
  }

  const input = {
    komponenId: String(body?.komponenId || "").trim(),
    nominal: Number(body?.nominal || 0),
    cakupan: cakupanRaw,
    kelasId: String(body?.kelasId || "").trim() || null,
    gender,
    santriId: String(body?.santriId || "").trim() || null,
  };

  const validationError = validateRuleInput(input);
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  try {
    const updated = await (prisma as any).ruleTagihan.update({
      where: { id },
      data: {
        komponenId: input.komponenId,
        nominal: input.nominal,
        cakupan: input.cakupan,
        kelasId: input.kelasId,
        gender: input.gender,
        santriId: input.santriId,
      },
      include: {
        komponen: { select: { id: true, kode: true, nama: true } },
        kelas: { select: { id: true, nama: true } },
        santri: { select: { id: true, nis: true, nama: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { message: "Relasi komponen/kelas/santri tidak valid" },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Gagal memperbarui rule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await (prisma as any).ruleTagihan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Rule tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal menghapus rule" }, { status: 500 });
  }
}
