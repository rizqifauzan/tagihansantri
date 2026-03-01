import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/api-auth";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { generateKwitansiNumber, renderKwitansiHtml } from "@/lib/kwitansi";

type Params = { params: Promise<{ id: string }> };
type PaymentMethod = "TUNAI" | "TRANSFER";

const VALID_METHOD = new Set<PaymentMethod>(["TUNAI", "TRANSFER"]);

function deriveStatus(totalPaid: number, totalBill: number): "SEBAGIAN" | "LUNAS" {
  return totalPaid >= totalBill ? "LUNAS" : "SEBAGIAN";
}

export async function GET(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;
  const { id } = await params;

  const rows = await db.pembayaran.findMany({
    where: { tagihanId: id },
    orderBy: { createdAt: "desc" },
    include: { kwitansi: true },
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const session = await getAdminSession(req);
  const db = prisma as any;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const nominal = Number(body?.nominal || 0);
  const metode = String(body?.metode || "").trim() as PaymentMethod;
  const referensi = String(body?.referensi || "").trim() || null;

  if (!Number.isFinite(nominal) || nominal <= 0) {
    return NextResponse.json({ message: "Nominal pembayaran harus > 0" }, { status: 400 });
  }
  if (!VALID_METHOD.has(metode)) {
    return NextResponse.json({ message: "Metode pembayaran tidak valid" }, { status: 400 });
  }
  if (metode === "TRANSFER" && !referensi) {
    return NextResponse.json({ message: "Referensi wajib diisi untuk transfer" }, { status: 400 });
  }

  const existing = await db.tagihan.findUnique({
    where: { id },
    include: {
      santri: { select: { nis: true, nama: true } },
      komponen: { select: { nama: true } },
    },
  });
  if (!existing) return NextResponse.json({ message: "Tagihan tidak ditemukan" }, { status: 404 });
  if (existing.status === "BATAL") return NextResponse.json({ message: "Tagihan BATAL tidak bisa dibayar" }, { status: 400 });
  if (existing.status === "DRAFT") return NextResponse.json({ message: "Tagihan DRAFT harus dipublish dulu" }, { status: 400 });
  if (existing.status === "LUNAS") return NextResponse.json({ message: "Tagihan sudah LUNAS" }, { status: 400 });

  const sisa = Math.max(0, existing.nominal - Number(existing.nominalTerbayar || 0));
  if (sisa <= 0) {
    return NextResponse.json({ message: "Tagihan sudah lunas" }, { status: 400 });
  }

  const nominalAccepted = Math.min(nominal, sisa);
  const adminUsername = session?.username || env.adminUsername;
  const nomorKwitansi = generateKwitansiNumber();

  const result = await prisma.$transaction(async (tx) => {
    const payment = await (tx as any).pembayaran.create({
      data: {
        tagihanId: id,
        nominal: nominalAccepted,
        metode,
        referensi,
        adminUsername,
      },
    });

    const totalPaidAgg = await (tx as any).pembayaran.aggregate({
      where: { tagihanId: id },
      _sum: { nominal: true },
    });
    const totalPaid = Number(totalPaidAgg?._sum?.nominal || 0);
    const nextStatus = deriveStatus(totalPaid, existing.nominal);

    const updatedTagihan = await (tx as any).tagihan.update({
      where: { id },
      data: {
        nominalTerbayar: totalPaid,
        status: nextStatus,
      },
    });

    const kwitansi = await (tx as any).kwitansi.create({
      data: {
        nomor: nomorKwitansi,
        pembayaranId: payment.id,
        template: "LENGKAP",
        adminUsername,
        logoUrl: env.receiptLogoUrl || null,
        stempelUrl: env.receiptStampUrl || null,
      },
    });

    return { payment, kwitansi, updatedTagihan };
  });

  const receiptBaseData = {
    nomor: result.kwitansi.nomor,
    tanggalBayar: result.payment.tanggalBayar,
    namaSantri: existing.santri.nama,
    nis: existing.santri.nis,
    namaKomponen: existing.komponen.nama,
    nominalAwal: result.updatedTagihan.nominalAwal,
    nominalDiskon: result.updatedTagihan.nominalDiskon,
    nominalTagihan: result.updatedTagihan.nominal,
    nominalTerbayar: result.updatedTagihan.nominalTerbayar,
    nominalBelumDibayar: Math.max(0, result.updatedTagihan.nominal - result.updatedTagihan.nominalTerbayar),
    nominal: result.payment.nominal,
    metode: result.payment.metode,
    referensi: result.payment.referensi,
    adminUsername: result.payment.adminUsername,
    appName: env.appName,
    logoUrl: result.kwitansi.logoUrl,
    stempelUrl: result.kwitansi.stempelUrl,
  };

  return NextResponse.json({
    message: nominal > nominalAccepted
      ? `Pembayaran diterima Rp${nominalAccepted}. Kelebihan tidak dicatat.`
      : "Pembayaran berhasil dicatat.",
    pembayaran: result.payment,
    kwitansi: result.kwitansi,
    tagihan: result.updatedTagihan,
    templates: {
      ringkasHtml: renderKwitansiHtml("RINGKAS", receiptBaseData),
      lengkapHtml: renderKwitansiHtml("LENGKAP", receiptBaseData),
    },
  });
}
