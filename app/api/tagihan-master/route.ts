import { Gender } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parsePageQuery, toOptionalDate } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import {
  determineMonthlyStatus,
  toDetailCreate,
  TargetTagihanTypeValue,
  validateMasterInput,
} from "@/lib/tagihan-master";

const VALID_TARGET = new Set<string>([
  "SEMUA_SANTRI",
  "GENDER",
  "KELAS",
  "SPESIFIK_SANTRI",
  "SANTRI_BARU",
]);
const VALID_GENDER = new Set(Object.values(Gender));
const PIC_MODES = ["GLOBAL", "BY_GENDER", "BY_KELAS"] as const;
type TagihanPicModeValue = (typeof PIC_MODES)[number];
const VALID_PIC_MODE = new Set<string>(PIC_MODES);

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

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { q, page, pageSize } = parsePageQuery(req);
  const where = q
    ? {
        OR: [
          { namaTagihan: { contains: q, mode: "insensitive" } },
          { komponen: { nama: { contains: q, mode: "insensitive" } } },
          { komponen: { kode: { contains: q, mode: "insensitive" } } },
          { keterangan: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    db.tagihanMaster.count({ where }),
    db.tagihanMaster.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        komponen: { select: { id: true, kode: true, nama: true, tipe: true } },
        picGlobalUser: { select: { id: true, username: true, active: true } },
        picPutraUser: { select: { id: true, username: true, active: true } },
        picPutriUser: { select: { id: true, username: true, active: true } },
        picKelas: {
          include: {
            kelas: { select: { id: true, nama: true } },
            picUser: { select: { id: true, username: true, active: true } },
          },
        },
        details: true,
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
  const db = prisma as any;

  const body = await req.json();
  const targetType = String(body?.targetType || "").trim() as TargetTagihanTypeValue;
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
    namaTagihan: String(body?.namaTagihan || "").trim() || null,
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
    jatuhTempoHari: body?.jatuhTempoHari ? Number(body.jatuhTempoHari) : null,
    picMode: String(body?.picMode || "GLOBAL").trim() as TagihanPicModeValue,
    picGlobalUserId: String(body?.picGlobalUserId || "").trim() || null,
    picPutraUserId: String(body?.picPutraUserId || "").trim() || null,
    picPutriUserId: String(body?.picPutriUserId || "").trim() || null,
    picKelas: Array.isArray(body?.picKelas)
      ? body.picKelas.map((item: any) => ({
          kelasId: String(item?.kelasId || "").trim(),
          picUserId: String(item?.picUserId || "").trim() || null,
        }))
      : [],
    tanggalTerbit: toOptionalDate(body?.tanggalTerbit),
    jatuhTempo: toOptionalDate(body?.jatuhTempo),
    keterangan: String(body?.keterangan || "").trim() || null,
    details,
  };

  if (input.targetType !== "SANTRI_BARU" && !input.jatuhTempo) {
    return NextResponse.json({ message: "Jatuh tempo wajib diisi" }, { status: 400 });
  }
  if (input.targetType === "SANTRI_BARU" && (!input.jatuhTempoHari || input.jatuhTempoHari < 1)) {
    return NextResponse.json({ message: "Jatuh tempo hari wajib diisi (minimal 1)" }, { status: 400 });
  }
  if (!VALID_PIC_MODE.has(input.picMode)) {
    return NextResponse.json({ message: "Mode PIC tidak valid" }, { status: 400 });
  }

  const picUserIds = Array.from(
    new Set(
      [
        input.picGlobalUserId,
        input.picPutraUserId,
        input.picPutriUserId,
        ...input.picKelas.map((item: { picUserId: string | null }) => item.picUserId),
      ].filter(Boolean) as string[],
    ),
  );
  if (picUserIds.length) {
    const activeUsers = await db.user.findMany({
      where: { id: { in: picUserIds }, active: true, isDeleted: false },
      select: { id: true },
    });
    const activeSet = new Set(activeUsers.map((u: { id: string }) => u.id));
    const invalid = picUserIds.find((id) => !activeSet.has(id));
    if (invalid) {
      return NextResponse.json({ message: "PIC harus user aktif" }, { status: 400 });
    }
  }

  const validationError = await validateMasterInput({
    ...input,
    jatuhTempo:
      input.jatuhTempo ||
      new Date(Date.now() + Number(input.jatuhTempoHari || 30) * 24 * 60 * 60 * 1000),
  });
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  try {
    const komponen = await prisma.komponenTagihan.findUnique({ where: { id: input.komponenId } });
    if (!komponen) return NextResponse.json({ message: "Komponen tidak ditemukan" }, { status: 404 });

    const now = getWibMonthYear();
    const effectiveAutoGenerateEnabled = komponen.tipe === "INSIDENTAL" ? false : input.autoGenerateEnabled;
    const status =
      komponen.tipe === "BULANAN"
        ? determineMonthlyStatus({
            startBulan: input.startBulan || 1,
            startTahun: input.startTahun || now.year,
            endBulan: input.endBulan || 12,
            endTahun: input.endTahun || now.year,
            nowMonth: now.month,
            nowYear: now.year,
            manualInactive: !effectiveAutoGenerateEnabled,
          })
        : komponen.tipe === "INSIDENTAL"
          ? "ACTIVE"
          : effectiveAutoGenerateEnabled
            ? "ACTIVE"
            : "INACTIVE";

    const created = await db.tagihanMaster.create({
      data: {
        komponenId: input.komponenId,
        namaTagihan: input.namaTagihan,
        targetType: input.targetType,
        status: status as any,
        autoGenerateEnabled: effectiveAutoGenerateEnabled,
        picMode: input.picMode,
        picGlobalUserId: input.picGlobalUserId,
        picPutraUserId: input.picPutraUserId,
        picPutriUserId: input.picPutriUserId,
        nominalGlobal: input.nominalGlobal,
        startBulan: input.startBulan,
        startTahun: input.startTahun,
        endBulan: input.endBulan,
        endTahun: input.endTahun,
        jatuhTempoHari: input.jatuhTempoHari,
        tanggalTerbit: input.targetType === "SANTRI_BARU" ? null : input.tanggalTerbit,
        jatuhTempo:
          input.jatuhTempo ||
          new Date(Date.now() + Number(input.jatuhTempoHari || 30) * 24 * 60 * 60 * 1000),
        keterangan: input.keterangan,
        picKelas: {
          create: input.picKelas
            .filter((item: { kelasId: string }) => item.kelasId)
            .map((item: { kelasId: string; picUserId: string | null }) => ({
                kelasId: item.kelasId,
                picUserId: item.picUserId,
              })),
        },
        details: {
          create: toDetailCreate(input.targetType, input.details),
        },
      },
      include: {
        komponen: { select: { id: true, kode: true, nama: true, tipe: true } },
        picGlobalUser: { select: { id: true, username: true, active: true } },
        picPutraUser: { select: { id: true, username: true, active: true } },
        picPutriUser: { select: { id: true, username: true, active: true } },
        picKelas: {
          include: {
            kelas: { select: { id: true, nama: true } },
            picUser: { select: { id: true, username: true, active: true } },
          },
        },
        details: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Gagal membuat master tagihan" }, { status: 500 });
  }
}
