import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parsePageQuery } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { q, page, pageSize } = parsePageQuery(req);

  const where: Prisma.DiskonKomponenWhereInput = q
    ? {
        OR: [
          { komponen: { nama: { contains: q, mode: "insensitive" } } },
          { komponen: { kode: { contains: q, mode: "insensitive" } } },
          { kategori: { kode: { contains: q, mode: "insensitive" } } },
          { kategori: { nama: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.diskonKomponen.count({ where }),
    prisma.diskonKomponen.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        komponen: { select: { id: true, kode: true, nama: true } },
        kategori: { select: { id: true, kode: true, nama: true, eligibilityRule: true } },
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
  const komponenId = String(body?.komponenId || "").trim();
  const kategoriId = String(body?.kategoriId || "").trim();
  const persentase = Number(body?.persentase || 0);

  if (!komponenId) {
    return NextResponse.json({ message: "Komponen wajib dipilih" }, { status: 400 });
  }
  if (!kategoriId) {
    return NextResponse.json({ message: "Kategori wajib dipilih" }, { status: 400 });
  }
  if (Number.isNaN(persentase) || persentase <= 0 || persentase > 100) {
    return NextResponse.json(
      { message: "Persentase harus di antara 0.01 sampai 100" },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.diskonKomponen.create({
      data: { komponenId, kategoriId, persentase },
      include: {
        komponen: { select: { id: true, kode: true, nama: true } },
        kategori: { select: { id: true, kode: true, nama: true, eligibilityRule: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Konfigurasi diskon untuk pasangan komponen-kategori sudah ada" },
        { status: 409 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { message: "Komponen atau kategori tidak valid" },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Gagal membuat konfigurasi diskon" }, { status: 500 });
  }
}
