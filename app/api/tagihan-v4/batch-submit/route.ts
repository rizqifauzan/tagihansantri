import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/api-auth";
import { env } from "@/lib/env";
import { generateKwitansiNumber } from "@/lib/kwitansi";
import { prisma } from "@/lib/prisma";
import { appendTagihanV4History, TagihanV4HistoryItem } from "@/lib/tagihan-v4-history";

type PaymentMethod = "TUNAI" | "TRANSFER";

type BatchDraftItem = {
  tagihanId: string;
  nis: string;
  santriNama: string;
  kelas: string;
  tagihanLabel: string;
  action: "edit" | "lunas";
  nominalBayar: number;
};

const VALID_METHOD = new Set<PaymentMethod>(["TUNAI", "TRANSFER"]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const session = await getAdminSession(req);
  const adminUsername = session?.username || env.adminUsername;

  const formData = await req.formData();
  const batchName = String(formData.get("batchName") || "").trim();
  const metode = String(formData.get("metode") || "TUNAI").trim() as PaymentMethod;
  const itemsRaw = String(formData.get("items") || "[]");

  if (!batchName) {
    return NextResponse.json({ message: "Nama batch wajib diisi" }, { status: 400 });
  }
  if (!VALID_METHOD.has(metode)) {
    return NextResponse.json({ message: "Metode pembayaran tidak valid" }, { status: 400 });
  }

  let items: BatchDraftItem[] = [];
  try {
    const parsed = JSON.parse(itemsRaw);
    if (!Array.isArray(parsed)) throw new Error("invalid");
    items = parsed as BatchDraftItem[];
  } catch {
    return NextResponse.json({ message: "Format items tidak valid" }, { status: 400 });
  }

  if (!items.length) {
    return NextResponse.json({ message: "Tidak ada item pembayaran" }, { status: 400 });
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (!item.tagihanId) {
      return NextResponse.json({ message: "tagihanId wajib diisi" }, { status: 400 });
    }
    if (seen.has(item.tagihanId)) {
      return NextResponse.json({ message: `Duplikat tagihanId: ${item.tagihanId}` }, { status: 400 });
    }
    seen.add(item.tagihanId);

    if (!Number.isFinite(Number(item.nominalBayar)) || Number(item.nominalBayar) <= 0) {
      return NextResponse.json({ message: `Nominal tidak valid untuk ${item.tagihanId}` }, { status: 400 });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const processed: Array<{ tagihanId: string; pembayaranId: string; nominal: number }> = [];

      for (const item of items) {
        const nominal = Number(item.nominalBayar);

        const tagihan = await (tx as any).tagihan.findUnique({
          where: { id: item.tagihanId },
          select: {
            id: true,
            nominal: true,
            nominalTerbayar: true,
            status: true,
          },
        });

        if (!tagihan) throw new Error(`Tagihan tidak ditemukan: ${item.tagihanId}`);
        if (tagihan.status === "BATAL") throw new Error(`Tagihan ${item.tagihanId} berstatus BATAL`);
        if (tagihan.status === "DRAFT") throw new Error(`Tagihan ${item.tagihanId} berstatus DRAFT`);
        if (tagihan.status === "LUNAS") throw new Error(`Tagihan ${item.tagihanId} sudah LUNAS`);

        const sisa = Math.max(0, Number(tagihan.nominal) - Number(tagihan.nominalTerbayar || 0));
        if (sisa <= 0) throw new Error(`Tagihan ${item.tagihanId} sudah lunas`);
        if (nominal > sisa) throw new Error(`Nominal melebihi sisa tagihan untuk ${item.tagihanId}`);

        const pembayaran = await (tx as any).pembayaran.create({
          data: {
            tagihanId: item.tagihanId,
            nominal,
            metode,
            referensi: null,
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

    const batchId = `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "tagihan-v4", batchId);
    await mkdir(uploadDir, { recursive: true });

    const uploadedFiles = formData
      .getAll("proofs")
      .filter((item): item is File => item instanceof File && item.size > 0);

    const files: Array<{ name: string; url: string; size: number }> = [];
    for (const file of uploadedFiles) {
      const safeName = `${Date.now()}-${sanitizeFileName(file.name || "file")}`;
      const fullPath = path.join(uploadDir, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(fullPath, buffer);
      files.push({
        name: file.name || safeName,
        url: `/uploads/tagihan-v4/${batchId}/${safeName}`,
        size: file.size,
      });
    }

    const historyItems: TagihanV4HistoryItem[] = items.map((item) => ({
      tagihanId: item.tagihanId,
      nis: item.nis,
      santriNama: item.santriNama,
      kelas: item.kelas,
      tagihanLabel: item.tagihanLabel,
      action: item.action,
      nominalBayar: Number(item.nominalBayar),
    }));

    const totalSantri = new Set(items.map((item) => item.nis)).size;
    const totalNominal = historyItems.reduce((sum, item) => sum + item.nominalBayar, 0);

    await appendTagihanV4History({
      id: batchId,
      batchName,
      metode,
      adminUsername,
      createdAt: new Date().toISOString(),
      totalItem: items.length,
      totalSantri,
      totalNominal,
      items: historyItems,
      files,
    });

    return NextResponse.json({
      message: "Submit batch berhasil",
      batchId,
      totalItem: result.length,
      totalSantri,
      totalNominal,
      files,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Submit batch gagal" },
      { status: 400 },
    );
  }
}
