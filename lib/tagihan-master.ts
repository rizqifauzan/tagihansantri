import { Gender, KomponenTipe, SantriStatus, TargetTagihanType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export type MasterStatus = "SCHEDULED" | "ACTIVE" | "ENDED" | "INACTIVE";

export type MasterInput = {
  komponenId: string;
  targetType: TargetTagihanType;
  nominalGlobal?: number | null;
  startBulan?: number | null;
  startTahun?: number | null;
  endBulan?: number | null;
  endTahun?: number | null;
  autoGenerateEnabled?: boolean;
  tanggalTerbit?: Date | null;
  jatuhTempo: Date;
  keterangan?: string | null;
  details: Array<{
    gender?: Gender | null;
    kelasId?: string | null;
    santriId?: string | null;
    nominal: number;
  }>;
};

function invalidNominal(n?: number | null): boolean {
  return n === null || n === undefined || Number.isNaN(n) || n <= 0;
}

export function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

export function isWithinRange(
  periodMonth: number,
  periodYear: number,
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number,
): boolean {
  const p = monthIndex(periodYear, periodMonth);
  return p >= monthIndex(startYear, startMonth) && p <= monthIndex(endYear, endMonth);
}

export function toMonthlyPeriodKey(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function toInsidentalPeriodKey(tanggalTerbit: Date | null, jatuhTempo: Date): string {
  const terbit = tanggalTerbit ? tanggalTerbit.toISOString().slice(0, 10) : "-";
  const jt = jatuhTempo.toISOString().slice(0, 10);
  return `INS:${terbit}:${jt}`;
}

export function determineMonthlyStatus(input: {
  startBulan: number;
  startTahun: number;
  endBulan: number;
  endTahun: number;
  nowMonth: number;
  nowYear: number;
  manualInactive?: boolean;
}): MasterStatus {
  if (input.manualInactive) return "INACTIVE";

  const now = monthIndex(input.nowYear, input.nowMonth);
  const start = monthIndex(input.startTahun, input.startBulan);
  const end = monthIndex(input.endTahun, input.endBulan);

  if (now < start) return "SCHEDULED";
  if (now > end) return "ENDED";
  return "ACTIVE";
}

export async function validateMasterInput(input: MasterInput): Promise<string | null> {
  if (!input.komponenId) return "Komponen wajib dipilih";
  if (!input.jatuhTempo || Number.isNaN(input.jatuhTempo.getTime())) {
    return "Jatuh tempo tidak valid";
  }

  const komponen = await prisma.komponenTagihan.findUnique({ where: { id: input.komponenId } });
  if (!komponen) return "Komponen tidak ditemukan";

  if (komponen.tipe === KomponenTipe.BULANAN) {
    if (!input.startBulan || input.startBulan < 1 || input.startBulan > 12) {
      return "Start bulan wajib 1-12";
    }
    if (!input.startTahun || input.startTahun < 2000 || input.startTahun > 3000) {
      return "Start tahun tidak valid";
    }
    if (!input.endBulan || input.endBulan < 1 || input.endBulan > 12) {
      return "End bulan wajib 1-12";
    }
    if (!input.endTahun || input.endTahun < 2000 || input.endTahun > 3000) {
      return "End tahun tidak valid";
    }

    if (
      monthIndex(input.endTahun, input.endBulan) < monthIndex(input.startTahun, input.startBulan)
    ) {
      return "Rentang bulan tidak valid (end harus >= start)";
    }
  } else {
    if (!input.tanggalTerbit || Number.isNaN(input.tanggalTerbit.getTime())) {
      return "Tanggal terbit wajib untuk insidental";
    }
  }

  switch (input.targetType) {
    case TargetTagihanType.SEMUA_SANTRI:
      if (invalidNominal(input.nominalGlobal)) return "Nominal global wajib > 0";
      break;
    case TargetTagihanType.GENDER: {
      const l = input.details.find((d) => d.gender === Gender.L);
      const p = input.details.find((d) => d.gender === Gender.P);
      if (!l || !p) return "Nominal gender L dan P wajib diisi";
      if (invalidNominal(l.nominal) || invalidNominal(p.nominal)) {
        return "Nominal gender wajib > 0";
      }
      break;
    }
    case TargetTagihanType.KELAS: {
      const kelasAktif = await prisma.kelas.findMany({ where: { active: true }, select: { id: true } });
      const setDetail = new Set(input.details.filter((d) => d.kelasId).map((d) => d.kelasId as string));
      const missing = kelasAktif.some((k) => !setDetail.has(k.id));
      if (missing) return "Semua kelas aktif wajib diisi nominal";
      if (input.details.some((d) => invalidNominal(d.nominal))) return "Nominal kelas wajib > 0";
      break;
    }
    case TargetTagihanType.SPESIFIK_SANTRI:
      if (!input.details.length) return "Minimal satu santri wajib dipilih";
      if (input.details.some((d) => !d.santriId)) return "Santri target tidak valid";
      if (input.details.some((d) => invalidNominal(d.nominal))) return "Nominal tiap santri wajib > 0";
      break;
  }

  return null;
}

export async function resolveTargetSantri(master: {
  targetType: TargetTagihanType;
  nominalGlobal: number | null;
  details: Array<{ gender: Gender | null; kelasId: string | null; santriId: string | null; nominal: number }>;
}) {
  const aktifSantri = await prisma.santri.findMany({
    where: { status: SantriStatus.AKTIF },
    select: { id: true, gender: true, kelasId: true },
  });

  if (master.targetType === TargetTagihanType.SEMUA_SANTRI) {
    return aktifSantri.map((s) => ({ santriId: s.id, nominal: master.nominalGlobal || 0 }));
  }

  if (master.targetType === TargetTagihanType.GENDER) {
    const byGender = new Map(master.details.filter((d) => d.gender).map((d) => [d.gender as Gender, d.nominal]));
    return aktifSantri.filter((s) => byGender.has(s.gender)).map((s) => ({ santriId: s.id, nominal: byGender.get(s.gender) || 0 }));
  }

  if (master.targetType === TargetTagihanType.KELAS) {
    const byKelas = new Map(master.details.filter((d) => d.kelasId).map((d) => [d.kelasId as string, d.nominal]));
    return aktifSantri.filter((s) => byKelas.has(s.kelasId)).map((s) => ({ santriId: s.id, nominal: byKelas.get(s.kelasId) || 0 }));
  }

  const bySantri = new Map(master.details.filter((d) => d.santriId).map((d) => [d.santriId as string, d.nominal]));
  return aktifSantri.filter((s) => bySantri.has(s.id)).map((s) => ({ santriId: s.id, nominal: bySantri.get(s.id) || 0 }));
}

export async function existingSantriIdsForPeriod(input: { komponenId: string; periodeKey: string; santriIds: string[] }) {
  const existing = await (prisma as any).tagihan.findMany({
    where: {
      komponenId: input.komponenId,
      periodeKey: input.periodeKey,
      santriId: { in: input.santriIds },
    },
    select: { santriId: true },
  });

  return new Set(existing.map((e: { santriId: string }) => e.santriId));
}

export function toDetailCreate(targetType: TargetTagihanType, details: MasterInput["details"]) {
  if (targetType === TargetTagihanType.SEMUA_SANTRI) return [];
  return details.map((d) => ({
    gender: d.gender || null,
    kelasId: d.kelasId || null,
    santriId: d.santriId || null,
    nominal: d.nominal,
  }));
}
