import { KomponenTipe, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parseBoolean, parsePageQuery } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const VALID_TIPE = new Set(Object.values(KomponenTipe));

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { q, page, pageSize } = parsePageQuery(req);

  const where: Prisma.KomponenTagihanWhereInput = q
    ? {
        OR: [
          { nama: { contains: q, mode: "insensitive" } },
          { kode: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.komponenTagihan.count({ where }),
    prisma.komponenTagihan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
  const kode = String(body?.kode || "").trim();
  const nama = String(body?.nama || "").trim();
  const tipe = String(body?.tipe || "").trim() as KomponenTipe;
  const active = parseBoolean(body?.active, true);

  if (kode.length < 2) {
    return NextResponse.json({ message: "Kode minimal 2 karakter" }, { status: 400 });
  }
  if (nama.length < 2) {
    return NextResponse.json({ message: "Nama minimal 2 karakter" }, { status: 400 });
  }
  if (!VALID_TIPE.has(tipe)) {
    return NextResponse.json({ message: "Tipe komponen tidak valid" }, { status: 400 });
  }

  try {
    const created = await prisma.komponenTagihan.create({
      data: { kode, nama, tipe, active },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Kode komponen sudah digunakan" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Gagal membuat komponen tagihan" },
      { status: 500 },
    );
  }
}
