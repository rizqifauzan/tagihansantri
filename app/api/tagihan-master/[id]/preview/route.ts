import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
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
      details: true,
    },
  });

  if (!master) return NextResponse.json({ message: "Master tagihan tidak ditemukan" }, { status: 404 });

  let periodeKey = "";
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
  } else {
    periodeKey = toInsidentalPeriodKey(master.tanggalTerbit, master.jatuhTempo);
  }

  const targetRows = await resolveTargetSantri({
    targetType: master.targetType,
    nominalGlobal: master.nominalGlobal,
    details: master.details,
  });

  const totalNominal = targetRows.reduce((acc, row) => acc + row.nominal, 0);
  return NextResponse.json({ targetCount: targetRows.length, totalNominal, periodeKey, preview: targetRows.slice(0, 25) });
}
