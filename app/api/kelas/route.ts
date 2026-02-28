import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parseBoolean, parsePageQuery } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { q, page, pageSize } = parsePageQuery(req);
  const activeParam = req.nextUrl.searchParams.get("active");
  const where: Prisma.KelasWhereInput = {
    ...(q
      ? {
          nama: {
            contains: q,
            mode: "insensitive",
          },
        }
      : {}),
    ...(activeParam !== null ? { active: parseBoolean(activeParam, true) } : {}),
  };

  try {
    const [total, rows] = await Promise.all([
      prisma.kelas.count({ where }),
      prisma.kelas.findMany({
        where,
        orderBy: { nama: "asc" },
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
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Koneksi database gagal. Periksa DATABASE_URL/TLS.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const nama = String(body?.nama || "").trim();
  const active = parseBoolean(body?.active, true);

  if (nama.length < 2) {
    return NextResponse.json(
      { message: "Nama kelas minimal 2 karakter" },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.kelas.create({
      data: { nama, active },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Nama kelas sudah digunakan" },
        { status: 409 },
      );
    }

    return NextResponse.json({ message: "Gagal membuat kelas" }, { status: 500 });
  }
}
