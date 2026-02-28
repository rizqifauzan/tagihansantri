import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  determineMonthlyStatus,
  existingSantriIdsForPeriod,
  isWithinRange,
  resolveTargetSantri,
  toMonthlyPeriodKey,
} from "@/lib/tagihan-master";

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

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const now = getWibMonthYear();
  const periodKey = toMonthlyPeriodKey(now.month, now.year);

  const masters = await prisma.tagihanMaster.findMany({
    where: {
      autoGenerateEnabled: true,
      status: { in: ["SCHEDULED", "ACTIVE"] },
      komponen: { tipe: "BULANAN" },
    },
    include: { details: true },
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
      await prisma.tagihanMaster.update({ where: { id: master.id }, data: { status } });
      continue;
    }

    const targets = await resolveTargetSantri({
      targetType: master.targetType,
      nominalGlobal: master.nominalGlobal,
      details: master.details,
    });

    const existingSet = await existingSantriIdsForPeriod({
      komponenId: master.komponenId,
      periodeKey: periodKey,
      santriIds: targets.map((t) => t.santriId),
    });

    const toCreate = targets.filter((t) => !existingSet.has(t.santriId));

    await prisma.$transaction(async (tx) => {
      if (toCreate.length) {
        await tx.tagihan.createMany({
          data: toCreate.map((t) => ({
            masterId: master.id,
            santriId: t.santriId,
            komponenId: master.komponenId,
            periodeKey: periodKey,
            nominal: t.nominal,
            jatuhTempo: master.jatuhTempo,
            status: "TERBIT",
          })),
        });
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
          generated: toCreate.length,
          skipped: targets.length - toCreate.length,
          success: true,
          message: "Auto generate bulanan",
        },
      });
    });

    processed += 1;
    totalGenerated += toCreate.length;
    totalSkipped += targets.length - toCreate.length;
  }

  return NextResponse.json({
    ok: true,
    periodKey,
    processed,
    generated: totalGenerated,
    skipped: totalSkipped,
  });
}
