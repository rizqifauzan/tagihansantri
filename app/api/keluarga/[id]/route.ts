import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
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
    const updated = await prisma.keluarga.update({
      where: { id },
      data: {
        kodeKeluarga,
        namaKepalaFamily: namaKepalaFamily || null,
        keterangan: keterangan || null,
      },
    });
    return NextResponse.json(updated);
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

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Data keluarga tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal memperbarui keluarga" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await prisma.keluarga.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { message: "Keluarga masih dipakai oleh data santri" },
        { status: 409 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Data keluarga tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal menghapus keluarga" }, { status: 500 });
  }
}
