import { Gender } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { parsePageQuery } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { RuleCakupanType, validateRuleInput } from "@/lib/rule-tagihan";

const VALID_CAKUPAN = new Set<RuleCakupanType>(["GLOBAL", "KELAS", "GENDER", "SANTRI"]);
const VALID_GENDER = new Set(Object.values(Gender));

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { q, page, pageSize } = parsePageQuery(req);
  const where = q
    ? {
        OR: [
          { komponen: { nama: { contains: q, mode: "insensitive" } } },
          { komponen: { kode: { contains: q, mode: "insensitive" } } },
          { kelas: { nama: { contains: q, mode: "insensitive" } } },
          { santri: { nama: { contains: q, mode: "insensitive" } } },
          { santri: { nis: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    (prisma as any).ruleTagihan.count({ where }),
    (prisma as any).ruleTagihan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        komponen: { select: { id: true, kode: true, nama: true } },
        kelas: { select: { id: true, nama: true } },
        santri: { select: { id: true, nis: true, nama: true } },
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

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const cakupanRaw = String(body?.cakupan || "").trim() as RuleCakupanType;

  if (!VALID_CAKUPAN.has(cakupanRaw)) {
    return NextResponse.json({ message: "Cakupan rule tidak valid" }, { status: 400 });
  }

  const genderRaw = String(body?.gender || "").trim();
  const gender = genderRaw ? (genderRaw as Gender) : null;
  if (gender && !VALID_GENDER.has(gender)) {
    return NextResponse.json({ message: "Gender tidak valid" }, { status: 400 });
  }

  const input = {
    komponenId: String(body?.komponenId || "").trim(),
    nominal: Number(body?.nominal || 0),
    cakupan: cakupanRaw,
    kelasId: String(body?.kelasId || "").trim() || null,
    gender,
    santriId: String(body?.santriId || "").trim() || null,
  };

  const validationError = validateRuleInput(input);
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  try {
    const created = await (prisma as any).ruleTagihan.create({
      data: {
        komponenId: input.komponenId,
        nominal: input.nominal,
        cakupan: input.cakupan,
        kelasId: input.kelasId,
        gender: input.gender,
        santriId: input.santriId,
      },
      include: {
        komponen: { select: { id: true, kode: true, nama: true } },
        kelas: { select: { id: true, nama: true } },
        santri: { select: { id: true, nis: true, nama: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Relasi komponen/kelas/santri tidak valid" },
      { status: 400 },
    );
  }
}
