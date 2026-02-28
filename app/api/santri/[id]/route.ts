import { Gender, Prisma, SantriStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { toOptionalDate } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const VALID_STATUS = new Set(Object.values(SantriStatus));
const VALID_GENDER = new Set(Object.values(Gender));

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json();
  const nama = String(body?.nama || "").trim();
  const status = String(body?.status || "").trim() as SantriStatus;
  const gender = String(body?.gender || "").trim() as Gender;
  const kelasId = String(body?.kelasId || "").trim();
  const keluargaId = String(body?.keluargaId || "").trim();
  const yatim = Boolean(body?.yatim);
  const keluargaNdalem = Boolean(body?.keluargaNdalem);
  const tanggalMasuk = toOptionalDate(body?.tanggalMasuk);
  const tanggalKeluar = toOptionalDate(body?.tanggalKeluar);

  if (nama.length < 2) {
    return NextResponse.json({ message: "Nama minimal 2 karakter" }, { status: 400 });
  }
  if (!VALID_STATUS.has(status)) {
    return NextResponse.json({ message: "Status santri tidak valid" }, { status: 400 });
  }
  if (!VALID_GENDER.has(gender)) {
    return NextResponse.json({ message: "Gender tidak valid" }, { status: 400 });
  }
  if (!kelasId) {
    return NextResponse.json({ message: "Kelas wajib dipilih" }, { status: 400 });
  }

  try {
    const updated = await prisma.santri.update({
      where: { id },
      data: {
        nama,
        status,
        gender,
        kelasId,
        keluargaId: keluargaId || null,
        yatim,
        keluargaNdalem,
        tanggalMasuk,
        tanggalKeluar,
      },
      include: {
        kelas: { select: { id: true, nama: true } },
        keluarga: { select: { id: true, kodeKeluarga: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Santri tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal memperbarui santri" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await prisma.santri.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Santri tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal menghapus santri" }, { status: 500 });
  }
}
