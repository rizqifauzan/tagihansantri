import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { applyKomponenDiscount } from "@/lib/tagihan-discount";
import { resolvePicForTargets } from "@/lib/tagihan-pic";
import {
  existingSantriIdsForPeriod,
  isWithinRange,
  resolveTargetSantri,
  toInsidentalPeriodKey,
  toMonthlyPeriodKey,
} from "@/lib/tagihan-master";

type Params = { params: Promise<{ id: string }> };

function getWibMonthYear() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  return {
    year: Number(parts.find((p) => p.type === "year")?.value || "0"),
    month: Number(parts.find((p) => p.type === "month")?.value || "0"),
  };
}

export async function POST(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const payload = await req.json().catch(() => ({}));
  const requestedMonth = Number(payload?.periodeBulan || 0);
  const requestedYear = Number(payload?.periodeTahun || 0);

  const { id } = await params;
  const master: any = await db.tagihanMaster.findUnique({
    where: { id },
    include: {
      komponen: { select: { id: true, kode: true, nama: true, tipe: true } },
      picGlobalUser: { select: { id: true, username: true } },
      picPutraUser: { select: { id: true, username: true } },
      picPutriUser: { select: { id: true, username: true } },
      picKelas: { select: { kelasId: true, picUserId: true, picUser: { select: { id: true, username: true } } } },
      details: true,
    },
  });

  if (!master) return NextResponse.json({ message: "Master tagihan tidak ditemukan" }, { status: 404 });

  let periodeKey = "";
  let periodMonth: number | null = null;
  let periodYear: number | null = null;
  if (master.komponen.tipe === "BULANAN") {
    const now = getWibMonthYear();
    const month = requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : now.month;
    const year = requestedYear >= 2000 && requestedYear <= 3000 ? requestedYear : now.year;

    if (
      !master.startBulan ||
      !master.startTahun ||
      !master.endBulan ||
      !master.endTahun ||
      !isWithinRange(month, year, master.startBulan, master.startTahun, master.endBulan, master.endTahun)
    ) {
      return NextResponse.json({ message: "Periode di luar rentang start-end" }, { status: 400 });
    }

    periodeKey = toMonthlyPeriodKey(month, year);
    periodMonth = month;
    periodYear = year;
  } else {
    periodeKey = toInsidentalPeriodKey(master.tanggalTerbit, master.jatuhTempo);
  }

  const targetRows = await resolveTargetSantri({
    targetType: master.targetType,
    nominalGlobal: master.nominalGlobal,
    details: master.details,
    periodMonth,
    periodYear,
  });

  const existingSet = await existingSantriIdsForPeriod({
    komponenId: master.komponenId,
    periodeKey,
    santriIds: targetRows.map((row) => row.santriId),
  });
  const willGenerateRows = targetRows.filter((row) => !existingSet.has(row.santriId));
  const discountedRows = await applyKomponenDiscount({
    komponenId: master.komponenId,
    targets: willGenerateRows.map((row) => ({ santriId: row.santriId, nominal: row.nominal })),
  });
  const discountedMap = new Map(discountedRows.map((row) => [row.santriId, row]));
  const picRows = await resolvePicForTargets(
    {
      picMode: master.picMode,
      picGlobalUserId: master.picGlobalUserId,
      picPutraUserId: master.picPutraUserId,
      picPutriUserId: master.picPutriUserId,
      picKelas: master.picKelas.map((item: any) => ({ kelasId: item.kelasId, picUserId: item.picUserId })),
    },
    willGenerateRows.map((row) => ({ santriId: row.santriId, nominal: row.nominal })),
  );
  const picMap = new Map(picRows.map((row) => [row.santriId, row.picUserId]));
  const picUserIds = Array.from(new Set(picRows.map((row) => row.picUserId).filter(Boolean) as string[]));
  const picUsers = picUserIds.length
    ? await db.user.findMany({
        where: { id: { in: picUserIds } },
        select: { id: true, username: true },
      })
    : [];
  const picUserMap = new Map(picUsers.map((u: { id: string; username: string }) => [u.id, u.username]));

  const previewLimit = 50;
  const previewTargets = willGenerateRows.slice(0, previewLimit);
  const previewSantriIds = previewTargets.map((row) => row.santriId);
  const santriRows: Array<{ id: string; nis: string; nama: string }> = await db.santri.findMany({
    where: { id: { in: previewSantriIds } },
    select: { id: true, nis: true, nama: true },
  });
  const santriMap = new Map(santriRows.map((s) => [s.id, s]));

  const totalNominalAwal = discountedRows.reduce((acc, row) => acc + row.nominalAwal, 0);
  const totalDiskon = discountedRows.reduce((acc, row) => acc + row.nominalDiskon, 0);
  const totalNominal = discountedRows.reduce((acc, row) => acc + row.nominalAkhir, 0);
  return NextResponse.json({
    targetCount: willGenerateRows.length,
    totalNominal,
    totalNominalAwal,
    totalDiskon,
    periodeKey,
    skippedDuplicateCount: targetRows.length - willGenerateRows.length,
    previewLimit,
    preview: previewTargets.map((row) => {
      const santri = santriMap.get(row.santriId);
      const discounted = discountedMap.get(row.santriId);
      return {
        santriId: row.santriId,
        nis: santri?.nis || "-",
        nama: santri?.nama || "-",
        nominalAwal: discounted?.nominalAwal ?? row.nominal,
        persentaseDiskon: discounted?.persentaseDiskon ?? 0,
        nominalDiskon: discounted?.nominalDiskon ?? 0,
        nominalAkhir: discounted?.nominalAkhir ?? row.nominal,
        kategoriDiskon: discounted?.kategoriDiskon || null,
        picUserId: picMap.get(row.santriId) || null,
        picUsername: (() => {
          const picUserId = picMap.get(row.santriId) || null;
          return picUserId ? (picUserMap.get(picUserId) || null) : null;
        })(),
      };
    }),
  });
}
