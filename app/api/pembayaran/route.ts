import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parsePageQuery } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { q, page, pageSize } = parsePageQuery(req);
  const picUserId = (req.nextUrl.searchParams.get("picUserId") || "").trim();
  const where = q
    ? {
        OR: [
          { tagihan: { santri: { nama: { contains: q, mode: "insensitive" } } } },
          { tagihan: { santri: { nis: { contains: q, mode: "insensitive" } } } },
          { tagihan: { komponen: { nama: { contains: q, mode: "insensitive" } } } },
          { referensi: { contains: q, mode: "insensitive" } },
          { adminUsername: { contains: q, mode: "insensitive" } },
          { kwitansi: { nomor: { contains: q, mode: "insensitive" } } },
          { tagihan: { picUser: { username: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {
        ...(picUserId ? { tagihan: { picUserId } } : {}),
      };

  if (q && picUserId) {
    (where as any).AND = [{ tagihan: { picUserId } }];
  }

  const [total, rows] = await Promise.all([
    db.pembayaran.count({ where }),
    db.pembayaran.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        kwitansi: true,
        tagihan: {
          select: {
            id: true,
            periodeKey: true,
            nominalAwal: true,
            nominalDiskon: true,
            nominal: true,
            nominalTerbayar: true,
            status: true,
            picUser: { select: { id: true, username: true, active: true } },
            santri: { select: { id: true, nis: true, nama: true } },
            komponen: { select: { id: true, kode: true, nama: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
