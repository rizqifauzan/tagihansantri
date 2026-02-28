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
    const updated = await prisma.diskonKomponen.update({
      where: { id },
      data: { komponenId, kategoriId, persentase },
      include: {
        komponen: { select: { id: true, kode: true, nama: true } },
        kategori: { select: { id: true, kode: true, nama: true, eligibilityRule: true } },
      },
    });

    return NextResponse.json(updated);
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
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Konfigurasi diskon tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Gagal memperbarui konfigurasi diskon" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await prisma.diskonKomponen.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Konfigurasi diskon tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Gagal menghapus konfigurasi diskon" }, { status: 500 });
  }
}
