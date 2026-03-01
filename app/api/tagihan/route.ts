import { TagihanStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parsePageQuery } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const VALID_STATUS = new Set(Object.values(TagihanStatus));

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { q, page, pageSize } = parsePageQuery(req);
  const santriId = (req.nextUrl.searchParams.get("santriId") || "").trim();
  const picUserId = (req.nextUrl.searchParams.get("picUserId") || "").trim();
  const statusRaw = (req.nextUrl.searchParams.get("status") || "").trim() as TagihanStatus;
  const periodeKey = (req.nextUrl.searchParams.get("periodeKey") || "").trim();
  const status = VALID_STATUS.has(statusRaw) ? statusRaw : null;

  const where = {
    ...(q
      ? {
          OR: [
            { santri: { nama: { contains: q, mode: "insensitive" } } },
            { santri: { nis: { contains: q, mode: "insensitive" } } },
            { komponen: { nama: { contains: q, mode: "insensitive" } } },
            { komponen: { kode: { contains: q, mode: "insensitive" } } },
            { picUser: { username: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(santriId ? { santriId } : {}),
    ...(picUserId ? { picUserId } : {}),
    ...(status ? { status } : {}),
    ...(periodeKey ? { periodeKey } : {}),
  };

  const [total, rows] = await Promise.all([
    db.tagihan.count({ where }),
    db.tagihan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        santri: { select: { id: true, nis: true, nama: true, status: true, kelas: { select: { nama: true } } } },
        komponen: { select: { id: true, kode: true, nama: true, tipe: true } },
        master: { select: { id: true, namaTagihan: true, targetType: true } },
        picUser: { select: { id: true, username: true, active: true } },
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
