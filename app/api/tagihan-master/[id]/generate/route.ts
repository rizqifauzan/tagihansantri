import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { applyKomponenDiscount } from "@/lib/tagihan-discount";
import { resolvePicForTargets } from "@/lib/tagihan-pic";
import {
  determineMonthlyStatus,
  existingSantriIdsForPeriod,
  isWithinRange,
  resolveTargetSantri,
  toInsidentalPeriodKey,
  toMonthlyDueDate,
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

  const body = await req.json().catch(() => ({}));
  const confirmed = Boolean(body?.confirmed);
  const source = body?.source === "auto" ? "auto" : "manual";
  const requestedMonth = Number(body?.periodeBulan || 0);
  const requestedYear = Number(body?.periodeTahun || 0);

  if (!confirmed) return NextResponse.json({ message: "Konfirmasi final diperlukan" }, { status: 400 });

  const { id } = await params;
  const master: any = await db.tagihanMaster.findUnique({
    where: { id },
    include: {
      komponen: { select: { id: true, tipe: true } },
      picKelas: { select: { kelasId: true, picUserId: true } },
      details: true,
    },
  });

  if (!master) return NextResponse.json({ message: "Master tagihan tidak ditemukan" }, { status: 404 });
  if (master.status === "ENDED") return NextResponse.json({ message: "Master ENDED" }, { status: 400 });
  if (source === "auto" && !master.autoGenerateEnabled) {
    return NextResponse.json({ ok: true, skipped: true, message: "Auto generate OFF" });
  }

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

  const targets = await resolveTargetSantri({
    targetType: master.targetType,
    nominalGlobal: master.nominalGlobal,
    details: master.details,
    periodMonth,
    periodYear,
  });

  const existingSet = await existingSantriIdsForPeriod({
    komponenId: master.komponenId,
    periodeKey,
    santriIds: targets.map((t: any) => t.santriId),
  });

  const toCreate = targets.filter((t: any) => !existingSet.has(t.santriId));
  const discountedToCreate = await applyKomponenDiscount({
    komponenId: master.komponenId,
    targets: toCreate.map((t: any) => ({ santriId: t.santriId, nominal: t.nominal })),
  });
  const resolvedPics = await resolvePicForTargets(
    {
      picMode: master.picMode,
      picGlobalUserId: master.picGlobalUserId,
      picPutraUserId: master.picPutraUserId,
      picPutriUserId: master.picPutriUserId,
      picKelas: master.picKelas,
    },
    toCreate.map((t: any) => ({ santriId: t.santriId, nominal: t.nominal })),
  );
  const picMap = new Map(resolvedPics.map((row) => [row.santriId, row.picUserId]));
  const generatedDueDate =
    master.komponen.tipe === "BULANAN" && periodMonth && periodYear
      ? toMonthlyDueDate(master.jatuhTempo, periodMonth, periodYear)
      : master.jatuhTempo;

  const now = getWibMonthYear();
  const nextStatus =
    master.komponen.tipe === "BULANAN" && master.startBulan && master.startTahun && master.endBulan && master.endTahun
      ? determineMonthlyStatus({
          startBulan: master.startBulan,
          startTahun: master.startTahun,
          endBulan: master.endBulan,
          endTahun: master.endTahun,
          nowMonth: now.month,
          nowYear: now.year,
          manualInactive: !master.autoGenerateEnabled,
        })
      : master.autoGenerateEnabled
        ? "ACTIVE"
        : "INACTIVE";

  const { master: updatedMaster, createdCount } = await prisma.$transaction(async (tx) => {
    const t = tx as any;
    let insertedCount = 0;

    if (toCreate.length) {
      const created = await t.tagihan.createMany({
        skipDuplicates: true,
        data: discountedToCreate.map((r: any) => {
          const isZeroBill = r.nominalAkhir <= 0;
          return {
            masterId: master.id,
            santriId: r.santriId,
            komponenId: master.komponenId,
            periodeKey,
            nominalAwal: r.nominalAwal,
            nominalDiskon: r.nominalDiskon,
            nominal: r.nominalAkhir,
            nominalTerbayar: isZeroBill ? r.nominalAkhir : 0,
            picUserId: picMap.get(r.santriId) || null,
            jatuhTempo: generatedDueDate,
            status: isZeroBill ? "LUNAS" : (master.komponen.tipe === "INSIDENTAL" ? "DRAFT" : "TERBIT"),
          };
        }),
      });
      insertedCount = created.count;
    }

    const updated = await t.tagihanMaster.update({
      where: { id: master.id },
      data: { status: nextStatus, lastGeneratedPeriod: periodeKey },
    });

    await t.tagihanGenerateLog.create({
      data: {
        masterId: master.id,
        periodeKey,
        source,
        totalTarget: targets.length,
        generated: insertedCount,
        skipped: targets.length - insertedCount,
        success: true,
        message: "Generate selesai",
      },
    });

    return { master: updated, createdCount: insertedCount };
  });

  return NextResponse.json({
    ok: true,
    master: updatedMaster,
    periodeKey,
    generatedCount: createdCount,
    skippedCount: targets.length - createdCount,
    totalTarget: targets.length,
  });
}
