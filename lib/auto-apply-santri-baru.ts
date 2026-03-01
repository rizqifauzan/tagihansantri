import { Gender, SantriStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyKomponenDiscount } from "@/lib/tagihan-discount";
import { resolvePicForTargets } from "@/lib/tagihan-pic";
import { toInsidentalPeriodKey } from "@/lib/tagihan-master";

type NewSantriInput = {
  id: string;
  gender: Gender;
  kelasId: string;
  createdAt: Date;
  status: SantriStatus;
};

function resolveNominalForSantri(master: {
  targetType: "SEMUA_SANTRI" | "GENDER" | "KELAS" | "SPESIFIK_SANTRI" | "SANTRI_BARU";
  nominalGlobal: number | null;
  details: Array<{ gender: Gender | null; kelasId: string | null; santriId: string | null; nominal: number }>;
}, santri: { id: string; gender: Gender; kelasId: string }): number | null {
  if (master.targetType === "SANTRI_BARU" || master.targetType === "SEMUA_SANTRI") {
    return master.nominalGlobal && master.nominalGlobal > 0 ? master.nominalGlobal : null;
  }
  if (master.targetType === "GENDER") {
    const d = master.details.find((item) => item.gender === santri.gender);
    return d && d.nominal > 0 ? d.nominal : null;
  }
  if (master.targetType === "KELAS") {
    const d = master.details.find((item) => item.kelasId === santri.kelasId);
    return d && d.nominal > 0 ? d.nominal : null;
  }
  if (master.targetType === "SPESIFIK_SANTRI") {
    const d = master.details.find((item) => item.santriId === santri.id);
    return d && d.nominal > 0 ? d.nominal : null;
  }
  return null;
}

export async function autoApplySantriBaruTagihan(santri: NewSantriInput): Promise<number> {
  const db = prisma as any;
  const masters = await db.tagihanMaster.findMany({
    where: {
      autoGenerateEnabled: true,
      status: "ACTIVE",
      komponen: { tipe: "SANTRI_BARU", active: true },
    },
    include: {
      details: true,
      picKelas: { select: { kelasId: true, picUserId: true } },
    },
  });

  if (!masters.length) return 0;

  let createdCount = 0;
  for (const master of masters) {
    const nominalAwalBase = resolveNominalForSantri(master, santri);
    if (!nominalAwalBase) continue;

    const discounted = await applyKomponenDiscount({
      komponenId: master.komponenId,
      targets: [{ santriId: santri.id, nominal: nominalAwalBase }],
    });
    const row = discounted[0];
    if (!row) continue;

    const dueDate = master.jatuhTempoHari && master.jatuhTempoHari > 0
      ? new Date(santri.createdAt.getTime() + master.jatuhTempoHari * 24 * 60 * 60 * 1000)
      : master.jatuhTempo;
    const periodeKey = toInsidentalPeriodKey(santri.createdAt, dueDate);

    const resolvedPic = await resolvePicForTargets(
      {
        picMode: master.picMode,
        picGlobalUserId: master.picGlobalUserId,
        picPutraUserId: master.picPutraUserId,
        picPutriUserId: master.picPutriUserId,
        picKelas: master.picKelas,
      },
      [{ santriId: santri.id, nominal: nominalAwalBase }],
    );
    const picUserId = resolvedPic[0]?.picUserId || null;

    const isZeroBill = row.nominalAkhir <= 0;
    const created = await db.tagihan.createMany({
      skipDuplicates: true,
      data: [
        {
          masterId: master.id,
          santriId: santri.id,
          komponenId: master.komponenId,
          periodeKey,
          nominalAwal: row.nominalAwal,
          nominalDiskon: row.nominalDiskon,
          nominal: row.nominalAkhir,
          nominalTerbayar: isZeroBill ? row.nominalAkhir : 0,
          picUserId,
          jatuhTempo: dueDate,
          status: isZeroBill ? "LUNAS" : "TERBIT",
        },
      ],
    });
    createdCount += Number(created?.count || 0);
  }

  return createdCount;
}
