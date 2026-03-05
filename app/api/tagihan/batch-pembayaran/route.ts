import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/api-auth";
import { env } from "@/lib/env";
import { generateKwitansiNumber } from "@/lib/kwitansi";
import { prisma } from "@/lib/prisma";

type PaymentMethod = "TUNAI" | "TRANSFER";

type BatchItem = {
  tagihanId: string;
  nominal: number;
  metode?: PaymentMethod;
  referensi?: string | null;
};

const VALID_METHOD = new Set<PaymentMethod>(["TUNAI", "TRANSFER"]);

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const session = await getAdminSession(req);
  const adminUsername = session?.username || env.adminUsername;
  const db = prisma as any;

  const body = await req.json().catch(() => ({}));
  const rawItems = Array.isArray(body?.items) ? (body.items as BatchItem[]) : [];

  if (!rawItems.length) {
    return NextResponse.json({ message: "Tidak ada item pembayaran" }, { status: 400 });
  }

  const seen = new Set<string>();
  for (const item of rawItems) {
    if (!item?.tagihanId) {
      return NextResponse.json({ message: "tagihanId wajib diisi" }, { status: 400 });
    }
    if (seen.has(item.tagihanId)) {
      return NextResponse.json({ message: `Duplikat tagihanId: ${item.tagihanId}` }, { status: 400 });
    }
    seen.add(item.tagihanId);

    if (!Number.isFinite(Number(item.nominal)) || Number(item.nominal) <= 0) {
      return NextResponse.json({ message: `Nominal tidak valid untuk tagihan ${item.tagihanId}` }, { status: 400 });
    }

    const metode = (item.metode || "TUNAI") as PaymentMethod;
    if (!VALID_METHOD.has(metode)) {
      return NextResponse.json({ message: `Metode tidak valid untuk tagihan ${item.tagihanId}` }, { status: 400 });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const processed: Array<{ tagihanId: string; pembayaranId: string; nominal: number }> = [];

      for (const item of rawItems) {
        const nominal = Number(item.nominal);
        const metode = (item.metode || "TUNAI") as PaymentMethod;
        const referensi = (item.referensi || "").trim() || null;

        const tagihan = await (tx as any).tagihan.findUnique({
          where: { id: item.tagihanId },
          select: {
            id: true,
            nominal: true,
            nominalTerbayar: true,
            status: true,
          },
        });

        if (!tagihan) {
          throw new Error(`Tagihan tidak ditemukan: ${item.tagihanId}`);
        }
        if (tagihan.status === "BATAL") {
          throw new Error(`Tagihan ${item.tagihanId} berstatus BATAL`);
        }
        if (tagihan.status === "DRAFT") {
          throw new Error(`Tagihan ${item.tagihanId} berstatus DRAFT`);
        }
        if (tagihan.status === "LUNAS") {
          throw new Error(`Tagihan ${item.tagihanId} sudah LUNAS`);
        }

        const sisa = Math.max(0, Number(tagihan.nominal) - Number(tagihan.nominalTerbayar || 0));
        if (sisa <= 0) {
          throw new Error(`Tagihan ${item.tagihanId} sudah lunas`);
        }
        if (nominal > sisa) {
          throw new Error(`Nominal melebihi sisa tagihan untuk ${item.tagihanId}`);
        }

        const pembayaran = await (tx as any).pembayaran.create({
          data: {
            tagihanId: item.tagihanId,
            nominal,
            metode,
            referensi,
            adminUsername,
          },
        });

        const nextTerbayar = Number(tagihan.nominalTerbayar || 0) + nominal;
        const nextStatus = nextTerbayar >= Number(tagihan.nominal) ? "LUNAS" : "SEBAGIAN";

        await (tx as any).tagihan.update({
          where: { id: item.tagihanId },
          data: {
            nominalTerbayar: nextTerbayar,
            status: nextStatus,
          },
        });

        await (tx as any).kwitansi.create({
          data: {
            nomor: generateKwitansiNumber(),
            pembayaranId: pembayaran.id,
            template: "LENGKAP",
            adminUsername,
            logoUrl: env.receiptLogoUrl || null,
            stempelUrl: env.receiptStampUrl || null,
          },
        });

        processed.push({ tagihanId: item.tagihanId, pembayaranId: pembayaran.id, nominal });
      }

      return processed;
    });

    return NextResponse.json({
      message: "Submit batch berhasil",
      totalItem: result.length,
      totalNominal: result.reduce((sum, item) => sum + item.nominal, 0),
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Submit batch gagal" },
      { status: 400 },
    );
  }
}
