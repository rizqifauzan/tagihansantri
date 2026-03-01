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
  toMonthlyDueDate,
  toMonthlyPeriodKey,
} from "@/lib/tagihan-master";

function getWibMonthYear() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value || "0");
  const month = Number(parts.find((p) => p.type === "month")?.value || "0");
  const day = Number(parts.find((p) => p.type === "day")?.value || "0");
  return { year, month, day };
}

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

async function runAutoGenerate(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;
  }

  const now = getWibMonthYear();
  if (now.day !== 10) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Bukan tanggal 10 WIB",
      wibDate: `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`,
    });
  }
  const periodKey = toMonthlyPeriodKey(now.month, now.year);

  const db = prisma as any;

  const masters = await db.tagihanMaster.findMany({
    where: {
      autoGenerateEnabled: true,
      status: { in: ["SCHEDULED", "ACTIVE"] },
      komponen: { tipe: "BULANAN" },
    },
    include: { details: true, picKelas: { select: { kelasId: true, picUserId: true } } },
  });

  let totalGenerated = 0;
  let totalSkipped = 0;
  let processed = 0;

  for (const master of masters) {
    if (!master.startBulan || !master.startTahun || !master.endBulan || !master.endTahun) continue;
    const startBulan = master.startBulan;
    const startTahun = master.startTahun;
    const endBulan = master.endBulan;
    const endTahun = master.endTahun;

    if (!isWithinRange(now.month, now.year, startBulan, startTahun, endBulan, endTahun)) {
      const status = determineMonthlyStatus({
        startBulan,
        startTahun,
        endBulan,
        endTahun,
        nowMonth: now.month,
        nowYear: now.year,
        manualInactive: !master.autoGenerateEnabled,
      });
      await db.tagihanMaster.update({ where: { id: master.id }, data: { status } });
      continue;
    }

    const targets = await resolveTargetSantri({
      targetType: master.targetType,
      nominalGlobal: master.nominalGlobal,
      details: master.details,
      periodMonth: now.month,
      periodYear: now.year,
    });

    const existingSet = await existingSantriIdsForPeriod({
      komponenId: master.komponenId,
      periodeKey: periodKey,
      santriIds: targets.map((t) => t.santriId),
    });

    const toCreate = targets.filter((t) => !existingSet.has(t.santriId));
    const discountedToCreate = await applyKomponenDiscount({
      komponenId: master.komponenId,
      targets: toCreate.map((t) => ({ santriId: t.santriId, nominal: t.nominal })),
    });
    const resolvedPics = await resolvePicForTargets(
      {
        picMode: master.picMode,
        picGlobalUserId: master.picGlobalUserId,
        picPutraUserId: master.picPutraUserId,
        picPutriUserId: master.picPutriUserId,
        picKelas: master.picKelas,
      },
      toCreate.map((t) => ({ santriId: t.santriId, nominal: t.nominal })),
    );
    const picMap = new Map(resolvedPics.map((row) => [row.santriId, row.picUserId]));

    const createdCount = await db.$transaction(async (tx: any) => {
      if (toCreate.length) {
        const created = await tx.tagihan.createMany({
          skipDuplicates: true,
          data: discountedToCreate.map((t) => {
            const isZeroBill = t.nominalAkhir <= 0;
            return {
              masterId: master.id,
              santriId: t.santriId,
              komponenId: master.komponenId,
              periodeKey: periodKey,
              nominalAwal: t.nominalAwal,
              nominalDiskon: t.nominalDiskon,
              nominal: t.nominalAkhir,
              nominalTerbayar: isZeroBill ? t.nominalAkhir : 0,
              picUserId: picMap.get(t.santriId) || null,
              jatuhTempo: toMonthlyDueDate(master.jatuhTempo, now.month, now.year),
              status: isZeroBill ? "LUNAS" : "TERBIT",
            };
          }),
        });
        await tx.tagihanMaster.update({
          where: { id: master.id },
          data: {
            status: determineMonthlyStatus({
              startBulan,
              startTahun,
              endBulan,
              endTahun,
              nowMonth: now.month,
              nowYear: now.year,
              manualInactive: !master.autoGenerateEnabled,
            }),
            lastGeneratedPeriod: periodKey,
          },
        });

        await tx.tagihanGenerateLog.create({
          data: {
            masterId: master.id,
            periodeKey: periodKey,
            source: "auto",
            totalTarget: targets.length,
            generated: created.count,
            skipped: targets.length - created.count,
            success: true,
            message: "Auto generate bulanan",
          },
        });

        return created.count;
      }

      await tx.tagihanMaster.update({
        where: { id: master.id },
        data: {
          status: determineMonthlyStatus({
            startBulan,
            startTahun,
            endBulan,
            endTahun,
            nowMonth: now.month,
            nowYear: now.year,
            manualInactive: !master.autoGenerateEnabled,
          }),
          lastGeneratedPeriod: periodKey,
        },
      });

      await tx.tagihanGenerateLog.create({
        data: {
          masterId: master.id,
          periodeKey: periodKey,
          source: "auto",
          totalTarget: targets.length,
          generated: 0,
          skipped: targets.length,
          success: true,
          message: "Auto generate bulanan",
        },
      });
      return 0;
    });

    processed += 1;
    totalGenerated += createdCount;
    totalSkipped += targets.length - createdCount;
  }

  return NextResponse.json({
    ok: true,
    periodKey,
    processed,
    generated: totalGenerated,
    skipped: totalSkipped,
  });
}

export async function GET(req: NextRequest) {
  return runAutoGenerate(req);
}

export async function POST(req: NextRequest) {
  return runAutoGenerate(req);
}
