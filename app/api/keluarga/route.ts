import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parsePageQuery } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { q, page, pageSize } = parsePageQuery(req);
  const where: Prisma.KeluargaWhereInput = q
    ? {
        OR: [
          { kodeKeluarga: { contains: q, mode: "insensitive" } },
          { namaKepalaFamily: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.keluarga.count({ where }),
    prisma.keluarga.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { santri: true },
        },
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
  const kodeKeluarga = String(body?.kodeKeluarga || "").trim();
  const namaKepalaFamily = String(body?.namaKepalaFamily || "").trim();
  const keterangan = String(body?.keterangan || "").trim();

  if (kodeKeluarga.length < 2) {
    return NextResponse.json(
      { message: "Kode keluarga minimal 2 karakter" },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.keluarga.create({
      data: {
        kodeKeluarga,
        namaKepalaFamily: namaKepalaFamily || null,
        keterangan: keterangan || null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Kode keluarga sudah digunakan" },
        { status: 409 },
      );
    }

    return NextResponse.json({ message: "Gagal membuat keluarga" }, { status: 500 });
  }
}
