import { DiskonEligibilityRule, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parseBoolean } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const VALID_RULE = new Set(Object.values(DiskonEligibilityRule));
const VALID_SIBLING_MIN = new Set([2, 3, 4]);

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json();
  const kode = String(body?.kode || "").trim().toUpperCase();
  const nama = String(body?.nama || "").trim();
  const eligibilityRule = String(body?.eligibilityRule || "").trim() as DiskonEligibilityRule;
  const siblingCountMinRaw =
    body?.siblingCountMin === null || body?.siblingCountMin === undefined
      ? null
      : Number(body?.siblingCountMin);
  const active = parseBoolean(body?.active, true);

  if (kode.length < 2) {
    return NextResponse.json({ message: "Kode minimal 2 karakter" }, { status: 400 });
  }
  if (nama.length < 2) {
    return NextResponse.json({ message: "Nama minimal 2 karakter" }, { status: 400 });
  }
  if (!VALID_RULE.has(eligibilityRule)) {
    return NextResponse.json({ message: "Rule eligibility tidak valid" }, { status: 400 });
  }
  if (eligibilityRule === DiskonEligibilityRule.SIBLING_FAMILY) {
    if (
      siblingCountMinRaw === null ||
      Number.isNaN(siblingCountMinRaw) ||
      !VALID_SIBLING_MIN.has(siblingCountMinRaw)
    ) {
      return NextResponse.json(
        { message: "Kategori bersaudara wajib siblingCountMin: 2, 3, atau 4" },
        { status: 400 },
      );
    }
  }
  if (
    eligibilityRule !== DiskonEligibilityRule.SIBLING_FAMILY &&
    siblingCountMinRaw !== null
  ) {
    return NextResponse.json(
      { message: "siblingCountMin hanya boleh diisi untuk kategori bersaudara" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.diskonKategori.update({
      where: { id },
      data: {
        kode,
        nama,
        eligibilityRule,
        siblingCountMin:
          eligibilityRule === DiskonEligibilityRule.SIBLING_FAMILY
            ? siblingCountMinRaw
            : null,
        active,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ message: "Kode kategori sudah digunakan" }, { status: 409 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Kategori diskon tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal memperbarui kategori diskon" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await prisma.diskonKategori.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { message: "Kategori sedang dipakai konfigurasi komponen" },
        { status: 409 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Kategori diskon tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal menghapus kategori diskon" }, { status: 500 });
  }
}
