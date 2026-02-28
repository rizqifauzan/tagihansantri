import { KomponenTipe, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parseBoolean } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const VALID_TIPE = new Set(Object.values(KomponenTipe));

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
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
    const updated = await prisma.komponenTagihan.update({
      where: { id },
      data: { kode, nama, tipe, active },
    });

    return NextResponse.json(updated);
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

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Komponen tagihan tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Gagal memperbarui komponen tagihan" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await prisma.komponenTagihan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Komponen tagihan tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Gagal menghapus komponen tagihan" },
      { status: 500 },
    );
  }
}
