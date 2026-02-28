import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parseBoolean } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
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
    const updated = await prisma.kelas.update({
      where: { id },
      data: { nama, active },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Kelas tidak ditemukan" }, { status: 404 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Nama kelas sudah digunakan" },
        { status: 409 },
      );
    }

    return NextResponse.json({ message: "Gagal memperbarui kelas" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await prisma.kelas.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { message: "Kelas masih dipakai data santri. Hapus/pindah santri dulu." },
        { status: 409 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Kelas tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal menghapus kelas" }, { status: 500 });
  }
}
