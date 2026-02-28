import { DiskonEligibilityRule } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const santriId = String(body?.santriId || "").trim();
  const komponenId = String(body?.komponenId || "").trim();
  const nominalAwal = Number(body?.nominalAwal || 0);

  if (!santriId) {
    return NextResponse.json({ message: "Santri wajib dipilih" }, { status: 400 });
  }
  if (!komponenId) {
    return NextResponse.json({ message: "Komponen wajib dipilih" }, { status: 400 });
  }
  if (Number.isNaN(nominalAwal) || nominalAwal <= 0) {
    return NextResponse.json({ message: "Nominal awal harus lebih dari 0" }, { status: 400 });
  }

  const santri = await prisma.santri.findUnique({
    where: { id: santriId },
    include: {
      keluarga: {
        select: {
          id: true,
          _count: { select: { santri: true } },
        },
      },
    },
  });

  if (!santri) {
    return NextResponse.json({ message: "Santri tidak ditemukan" }, { status: 404 });
  }

  const configs = await prisma.diskonKomponen.findMany({
    where: {
      komponenId,
      kategori: {
        active: true,
      },
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
  });

  const eligible = configs
    .map((c) => {
      let isEligible = false;

      switch (c.kategori.eligibilityRule) {
        case DiskonEligibilityRule.SIBLING_FAMILY:
          {
            const minSibling = c.kategori.siblingCountMin || 2;
          isEligible = Boolean(
            santri.keluargaId && (santri.keluarga?._count?.santri || 0) >= minSibling,
          );
          }
          break;
        case DiskonEligibilityRule.SANTRI_YATIM:
          isEligible = santri.yatim;
          break;
        case DiskonEligibilityRule.SANTRI_KELUARGA_NDALEM:
          isEligible = santri.keluargaNdalem;
          break;
        case DiskonEligibilityRule.NONE:
          isEligible = false;
          break;
      }

      return {
        kategoriId: c.kategori.id,
        kode: c.kategori.kode,
        nama: c.kategori.nama,
        eligibilityRule: c.kategori.eligibilityRule,
        siblingCountMin: c.kategori.siblingCountMin,
        persentase: c.persentase,
        eligible: isEligible,
      };
    })
    .filter((c) => c.eligible);

  const selected = eligible.sort((a, b) => b.persentase - a.persentase)[0] || null;
  const persentaseTerpilih = selected?.persentase || 0;
  const nominalDiskon = round2((nominalAwal * persentaseTerpilih) / 100);
  const nominalAkhir = round2(Math.max(0, nominalAwal - nominalDiskon));

  return NextResponse.json({
    santri: {
      id: santri.id,
      nis: santri.nis,
      nama: santri.nama,
      keluargaId: santri.keluargaId,
      yatim: santri.yatim,
      keluargaNdalem: santri.keluargaNdalem,
      jumlahSaudaraDalamKeluarga: santri.keluarga?._count?.santri || 0,
    },
    nominalAwal,
    eligibleKategori: eligible,
    selectedKategori: selected,
    persentaseTerpilih,
    nominalDiskon,
    nominalAkhir,
  });
}
