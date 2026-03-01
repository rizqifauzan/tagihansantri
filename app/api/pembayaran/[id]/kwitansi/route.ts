import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { renderKwitansiHtml } from "@/lib/kwitansi";

type Params = { params: Promise<{ id: string }> };
type KwitansiTemplate = "RINGKAS" | "LENGKAP";

const VALID_TEMPLATE = new Set<KwitansiTemplate>(["RINGKAS", "LENGKAP"]);

export async function GET(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;
  const { id } = await params;
  const templateRaw = String(req.nextUrl.searchParams.get("template") || "LENGKAP").trim() as KwitansiTemplate;
  const template = VALID_TEMPLATE.has(templateRaw) ? templateRaw : "LENGKAP";

  const pembayaran = await db.pembayaran.findUnique({
    where: { id },
    include: {
      kwitansi: true,
      tagihan: {
        include: {
          santri: { select: { nis: true, nama: true } },
          komponen: { select: { nama: true } },
        },
      },
    },
  });

  if (!pembayaran) return NextResponse.json({ message: "Pembayaran tidak ditemukan" }, { status: 404 });
  if (!pembayaran.kwitansi) return NextResponse.json({ message: "Kwitansi tidak ditemukan" }, { status: 404 });

  const html = renderKwitansiHtml(template, {
    nomor: pembayaran.kwitansi.nomor,
    tanggalBayar: pembayaran.tanggalBayar,
    namaSantri: pembayaran.tagihan.santri.nama,
    nis: pembayaran.tagihan.santri.nis,
    namaKomponen: pembayaran.tagihan.komponen.nama,
    nominalAwal: pembayaran.tagihan.nominalAwal,
    nominalDiskon: pembayaran.tagihan.nominalDiskon,
    nominalTagihan: pembayaran.tagihan.nominal,
    nominalTerbayar: pembayaran.tagihan.nominalTerbayar,
    nominalBelumDibayar: Math.max(0, pembayaran.tagihan.nominal - pembayaran.tagihan.nominalTerbayar),
    nominal: pembayaran.nominal,
    metode: pembayaran.metode,
    referensi: pembayaran.referensi,
    adminUsername: pembayaran.adminUsername,
    appName: env.appName,
    logoUrl: pembayaran.kwitansi.logoUrl,
    stempelUrl: pembayaran.kwitansi.stempelUrl,
  });

  return NextResponse.json({
    nomor: pembayaran.kwitansi.nomor,
    template,
    html,
    pembayaran: {
      id: pembayaran.id,
      nominal: pembayaran.nominal,
      metode: pembayaran.metode,
      referensi: pembayaran.referensi,
      tanggalBayar: pembayaran.tanggalBayar,
      adminUsername: pembayaran.adminUsername,
    },
  });
}
