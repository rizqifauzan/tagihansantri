import { Gender, Prisma, TargetTagihanType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { toOptionalDate } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import {
  determineMonthlyStatus,
  toDetailCreate,
  validateMasterInput,
} from "@/lib/tagihan-master";

const VALID_TARGET = new Set(Object.values(TargetTagihanType));
const VALID_GENDER = new Set(Object.values(Gender));

type Params = { params: Promise<{ id: string }> };

function getWibMonthYear() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value || "0");
  const month = Number(parts.find((p) => p.type === "month")?.value || "0");
  return { year, month };
}

export async function PUT(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { id } = await params;
  const existing = await db.tagihanMaster.findUnique({
    where: { id },
    include: { komponen: { select: { tipe: true } } },
  });
  if (!existing) {
    return NextResponse.json({ message: "Master tagihan tidak ditemukan" }, { status: 404 });
  }
  if (existing.status === "ENDED") {
    return NextResponse.json({ message: "Master ENDED tidak bisa diedit" }, { status: 400 });
  }

  const body = await req.json();
  const targetType = String(body?.targetType || "").trim() as TargetTagihanType;
  if (!VALID_TARGET.has(targetType)) {
    return NextResponse.json({ message: "Target type tidak valid" }, { status: 400 });
  }

  const detailRaw = Array.isArray(body?.details) ? body.details : [];
  const details = detailRaw.map((d: any) => {
    const gender = d?.gender ? (String(d.gender).trim() as Gender) : null;
    return {
      gender: gender && VALID_GENDER.has(gender) ? gender : null,
      kelasId: String(d?.kelasId || "").trim() || null,
      santriId: String(d?.santriId || "").trim() || null,
      nominal: Number(d?.nominal || 0),
    };
  });

  const input = {
    komponenId: String(body?.komponenId || "").trim(),
    targetType,
    nominalGlobal:
      body?.nominalGlobal === null || body?.nominalGlobal === undefined
        ? null
        : Number(body.nominalGlobal),
    startBulan: body?.startBulan ? Number(body.startBulan) : null,
    startTahun: body?.startTahun ? Number(body.startTahun) : null,
    endBulan: body?.endBulan ? Number(body.endBulan) : null,
    endTahun: body?.endTahun ? Number(body.endTahun) : null,
    autoGenerateEnabled: Boolean(body?.autoGenerateEnabled ?? true),
    tanggalTerbit: toOptionalDate(body?.tanggalTerbit),
    jatuhTempo: toOptionalDate(body?.jatuhTempo),
    keterangan: String(body?.keterangan || "").trim() || null,
    details,
  };

  if (!input.jatuhTempo) {
    return NextResponse.json({ message: "Jatuh tempo wajib diisi" }, { status: 400 });
  }

  const validationError = await validateMasterInput({ ...input, jatuhTempo: input.jatuhTempo });
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  try {
    const komponen = await prisma.komponenTagihan.findUnique({ where: { id: input.komponenId } });
    if (!komponen) return NextResponse.json({ message: "Komponen tidak ditemukan" }, { status: 404 });

    const now = getWibMonthYear();
    const status =
      komponen.tipe === "BULANAN"
        ? determineMonthlyStatus({
            startBulan: input.startBulan || 1,
            startTahun: input.startTahun || now.year,
            endBulan: input.endBulan || 12,
            endTahun: input.endTahun || now.year,
            nowMonth: now.month,
            nowYear: now.year,
            manualInactive: !input.autoGenerateEnabled,
          })
        : input.autoGenerateEnabled
          ? "ACTIVE"
          : "INACTIVE";

    const updated = await prisma.$transaction(async (tx) => {
      const t = tx as any;
      await t.tagihanMasterDetail.deleteMany({ where: { masterId: id } });
      return t.tagihanMaster.update({
        where: { id },
        data: {
          komponenId: input.komponenId,
          targetType: input.targetType,
          status: status as any,
          autoGenerateEnabled: input.autoGenerateEnabled,
          nominalGlobal: input.nominalGlobal,
          startBulan: input.startBulan,
          startTahun: input.startTahun,
          endBulan: input.endBulan,
          endTahun: input.endTahun,
          tanggalTerbit: (input.tanggalTerbit ?? undefined) as any,
          jatuhTempo: input.jatuhTempo as any,
          keterangan: input.keterangan,
          details: { create: toDetailCreate(input.targetType, input.details) },
        },
        include: {
          komponen: { select: { id: true, kode: true, nama: true, tipe: true } },
          details: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: "Gagal memperbarui master tagihan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { id } = await params;

  try {
    await db.tagihanMaster.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Master tagihan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Gagal menghapus master tagihan" }, { status: 500 });
  }
}
