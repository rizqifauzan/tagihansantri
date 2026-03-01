import { DiskonEligibilityRule } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DiscountedTarget = {
  santriId: string;
  nominalAwal: number;
  persentaseDiskon: number;
  nominalDiskon: number;
  nominalAkhir: number;
  kategoriDiskon: { id: string; kode: string; nama: string } | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function applyKomponenDiscount(input: {
  komponenId: string;
  targets: Array<{ santriId: string; nominal: number }>;
}): Promise<DiscountedTarget[]> {
  if (!input.targets.length) return [];

  const santriIds = Array.from(new Set(input.targets.map((t) => t.santriId)));
  const [configs, santriRows] = await Promise.all([
    prisma.diskonKomponen.findMany({
      where: {
        komponenId: input.komponenId,
        kategori: { active: true },
      },
      include: {
        kategori: {
          select: {
            id: true,
            kode: true,
            nama: true,
            eligibilityRule: true,
            siblingCountMin: true,
          },
        },
      },
    }),
    prisma.santri.findMany({
      where: { id: { in: santriIds } },
      select: {
        id: true,
        keluargaId: true,
        yatim: true,
        keluargaNdalem: true,
      },
    }),
  ]);

  if (!configs.length) {
    return input.targets.map((t) => ({
      santriId: t.santriId,
      nominalAwal: round2(t.nominal),
      persentaseDiskon: 0,
      nominalDiskon: 0,
      nominalAkhir: round2(t.nominal),
      kategoriDiskon: null,
    }));
  }

  const keluargaIds = Array.from(new Set(santriRows.map((s) => s.keluargaId).filter(Boolean) as string[]));
  const keluargaRows = keluargaIds.length
    ? await prisma.keluarga.findMany({
        where: { id: { in: keluargaIds } },
        select: { id: true, _count: { select: { santri: true } } },
      })
    : [];

  const santriMap = new Map(santriRows.map((s) => [s.id, s]));
  const keluargaCountMap = new Map(keluargaRows.map((k) => [k.id, k._count.santri]));

  return input.targets.map((target) => {
    const santri = santriMap.get(target.santriId);
    const nominalAwal = round2(target.nominal);

    if (!santri) {
      return {
        santriId: target.santriId,
        nominalAwal,
        persentaseDiskon: 0,
        nominalDiskon: 0,
        nominalAkhir: nominalAwal,
        kategoriDiskon: null,
      };
    }

    const eligible = configs.filter((c) => {
      switch (c.kategori.eligibilityRule) {
        case DiskonEligibilityRule.SIBLING_FAMILY: {
          const minSibling = c.kategori.siblingCountMin || 2;
          const count = santri.keluargaId ? (keluargaCountMap.get(santri.keluargaId) || 0) : 0;
          return Boolean(santri.keluargaId && count >= minSibling);
        }
        case DiskonEligibilityRule.SANTRI_YATIM:
          return santri.yatim;
        case DiskonEligibilityRule.SANTRI_KELUARGA_NDALEM:
          return santri.keluargaNdalem;
        case DiskonEligibilityRule.NONE:
          return false;
        default:
          return false;
      }
    });

    const selected = eligible.sort((a, b) => b.persentase - a.persentase)[0] || null;
    const persentaseDiskon = selected?.persentase || 0;
    const nominalDiskon = round2((nominalAwal * persentaseDiskon) / 100);
    const nominalAkhir = round2(Math.max(0, nominalAwal - nominalDiskon));

    return {
      santriId: target.santriId,
      nominalAwal,
      persentaseDiskon,
      nominalDiskon,
      nominalAkhir,
      kategoriDiskon: selected
        ? { id: selected.kategori.id, kode: selected.kategori.kode, nama: selected.kategori.nama }
        : null,
    };
  });
}
