import { Gender, Prisma, SantriStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parsePageQuery, toOptionalDate } from "@/lib/api-utils";
import { autoApplySantriBaruTagihan } from "@/lib/auto-apply-santri-baru";
import { buildNis, getNextNisSequence } from "@/lib/nis";
import { prisma } from "@/lib/prisma";

const VALID_STATUS = new Set(Object.values(SantriStatus));
const VALID_GENDER = new Set(Object.values(Gender));

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { q, page, pageSize } = parsePageQuery(req);
  const where: Prisma.SantriWhereInput = q
    ? {
        OR: [
          { nama: { contains: q, mode: "insensitive" } },
          { nis: { contains: q, mode: "insensitive" } },
          { kelas: { nama: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.santri.count({ where }),
    prisma.santri.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        kelas: {
          select: { id: true, nama: true },
        },
        keluarga: {
          select: { id: true, kodeKeluarga: true },
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
    const year = new Date().getFullYear();
    let seq = await getNextNisSequence(prisma);

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const nis = buildNis(year, seq + attempt);

      try {
        const created = await prisma.santri.create({
          data: {
            nis,
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

        let autoAppliedCount = 0;
        try {
          autoAppliedCount = await autoApplySantriBaruTagihan({
            id: created.id,
            gender: created.gender,
            kelasId: created.kelasId,
            createdAt: created.createdAt,
            status: created.status,
          });
        } catch (err) {
          console.error("Auto apply SANTRI_BARU gagal:", err);
        }
        return NextResponse.json({ ...created, autoAppliedTagihanCount: autoAppliedCount }, { status: 201 });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2003"
        ) {
          return NextResponse.json({ message: "Kelas tidak valid" }, { status: 400 });
        }

        return NextResponse.json({ message: "Gagal membuat santri" }, { status: 500 });
      }
    }

    return NextResponse.json(
      { message: "Gagal membuat NIS unik, coba lagi." },
      { status: 409 },
    );
  } catch {
    return NextResponse.json({ message: "Gagal membuat santri" }, { status: 500 });
  }
}
