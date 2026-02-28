import { DiskonEligibilityRule, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parseBoolean, parsePageQuery } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const VALID_RULE = new Set(Object.values(DiskonEligibilityRule));
const VALID_SIBLING_MIN = new Set([2, 3, 4]);

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { q, page, pageSize } = parsePageQuery(req);
  const where: Prisma.DiskonKategoriWhereInput = q
    ? {
        OR: [
          { kode: { contains: q, mode: "insensitive" } },
          { nama: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.diskonKategori.count({ where }),
    prisma.diskonKategori.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { diskonKomponen: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

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
    const created = await prisma.diskonKategori.create({
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
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ message: "Kode kategori sudah digunakan" }, { status: 409 });
    }

    return NextResponse.json({ message: "Gagal membuat kategori diskon" }, { status: 500 });
  }
}
