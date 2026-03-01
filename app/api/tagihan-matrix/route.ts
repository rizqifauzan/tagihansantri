import { Prisma, TagihanStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type MatrixFilter =
  | "ALL"
  | "LUNAS"
  | "SUDAH_DIBAYAR"
  | "BELUM_LUNAS"
  | "BATAL"
  | "DRAFT"
  | "AKTIF_SAJA";
type MatrixSortBy = "NIS" | "KELAS" | "JUMLAH_TAGIHAN";
type MatrixSortOrder = "asc" | "desc";
type MatrixCountView = "JUMLAH_TAGIHAN" | "SUDAH_DIBAYAR" | "BELUM_DIBAYAR" | "SEMUA";

const VALID_FILTERS: MatrixFilter[] = [
  "ALL",
  "LUNAS",
  "SUDAH_DIBAYAR",
  "BELUM_LUNAS",
  "BATAL",
  "DRAFT",
  "AKTIF_SAJA",
];
const VALID_SORT_BY: MatrixSortBy[] = ["NIS", "KELAS", "JUMLAH_TAGIHAN"];
const VALID_SORT_ORDER: MatrixSortOrder[] = ["asc", "desc"];
const VALID_COUNT_VIEW: MatrixCountView[] = [
  "JUMLAH_TAGIHAN",
  "SUDAH_DIBAYAR",
  "BELUM_DIBAYAR",
  "SEMUA",
];

function normalizeFilter(value: string): MatrixFilter {
  return VALID_FILTERS.includes(value as MatrixFilter) ? (value as MatrixFilter) : "ALL";
}

function normalizeSortBy(value: string): MatrixSortBy {
  return VALID_SORT_BY.includes(value as MatrixSortBy) ? (value as MatrixSortBy) : "NIS";
}

function normalizeSortOrder(value: string): MatrixSortOrder {
  return VALID_SORT_ORDER.includes(value as MatrixSortOrder) ? (value as MatrixSortOrder) : "asc";
}

function normalizeCountView(value: string): MatrixCountView {
  return VALID_COUNT_VIEW.includes(value as MatrixCountView)
    ? (value as MatrixCountView)
    : "BELUM_DIBAYAR";
}

function buildTagihanWhere(filter: MatrixFilter, q: string): Prisma.TagihanWhereInput {
  const base: Prisma.TagihanWhereInput = q
    ? {
        OR: [
          { santri: { nis: { contains: q, mode: "insensitive" } } },
          { santri: { nama: { contains: q, mode: "insensitive" } } },
          { santri: { kelas: { nama: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};

  if (filter === "ALL") return base;
  if (filter === "LUNAS") return { ...base, status: TagihanStatus.LUNAS };
  if (filter === "SUDAH_DIBAYAR") return { ...base, nominalTerbayar: { gt: 0 } };
  if (filter === "BELUM_LUNAS") return { ...base, status: { in: [TagihanStatus.TERBIT, TagihanStatus.SEBAGIAN] } };
  if (filter === "BATAL") return { ...base, status: TagihanStatus.BATAL };
  if (filter === "DRAFT") return { ...base, status: TagihanStatus.DRAFT };
  return { ...base, status: { notIn: [TagihanStatus.BATAL, TagihanStatus.DRAFT] } };
}

function formatNominal(value: number): string {
  return value.toLocaleString("id-ID");
}

function isPoolTimeoutError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2024"
  );
}

async function withPoolRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isPoolTimeoutError(error) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const filter = normalizeFilter((req.nextUrl.searchParams.get("filter") || "").trim().toUpperCase());
  const sortBy = normalizeSortBy((req.nextUrl.searchParams.get("sortBy") || "").trim().toUpperCase());
  const order = normalizeSortOrder((req.nextUrl.searchParams.get("order") || "").trim().toLowerCase());
  const countView = normalizeCountView(
    (req.nextUrl.searchParams.get("countView") || "").trim().toUpperCase(),
  );

  const santriWhere: Prisma.SantriWhereInput = q
    ? {
        OR: [
          { nis: { contains: q, mode: "insensitive" } },
          { nama: { contains: q, mode: "insensitive" } },
          { kelas: { nama: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  try {
    const santriRows = (await withPoolRetry(() =>
      db.santri.findMany({
        where: santriWhere,
        select: {
          id: true,
          nis: true,
          nama: true,
          kelas: { select: { id: true, nama: true } },
        },
      }),
    )) as any[];

    const tagihanRows = (await withPoolRetry(() =>
      db.tagihan.findMany({
        where: {
          ...buildTagihanWhere(filter, q),
        },
        select: {
          id: true,
          santriId: true,
          komponenId: true,
          periodeKey: true,
          nominalAwal: true,
          nominalDiskon: true,
          nominal: true,
          nominalTerbayar: true,
          status: true,
          komponen: { select: { id: true, kode: true, nama: true } },
        },
      }),
    )) as any[];

  const columnMap = new Map<
    string,
    {
      key: string;
      komponenId: string;
      komponenKode: string;
      komponenNama: string;
      periodeKey: string;
    }
  >();
  for (const row of tagihanRows) {
    const key = `${row.komponenId}__${row.periodeKey}`;
    if (!columnMap.has(key)) {
      columnMap.set(key, {
        key,
        komponenId: row.komponenId,
        komponenKode: row.komponen.kode,
        komponenNama: row.komponen.nama,
        periodeKey: row.periodeKey,
      });
    }
  }
  const columns = Array.from(columnMap.values()).sort((a, b) => {
    const komponenA = `${a.komponenKode} ${a.komponenNama}`;
    const komponenB = `${b.komponenKode} ${b.komponenNama}`;
    const byKomponen = komponenA.localeCompare(komponenB, "id");
    if (byKomponen !== 0) return byKomponen;
    return a.periodeKey.localeCompare(b.periodeKey, "id");
  });

  const bySantri = new Map<
    string,
    {
      byColumn: Map<
        string,
        Array<{
          nominalAwal: number;
          nominalDiskon: number;
          nominal: number;
          nominalTerbayar: number;
          isPaid: boolean;
        }>
      >;
      totalNominalAwal: number;
      totalNominalDiskon: number;
      totalNominal: number;
      totalTerbayar: number;
      countTagihan: number;
      countSudahDibayar: number;
      countBelumDibayar: number;
    }
  >();
  for (const row of tagihanRows) {
    const colKey = `${row.komponenId}__${row.periodeKey}`;
    const bucket = bySantri.get(row.santriId) || {
      byColumn: new Map<string, Array<{ nominal: number; nominalTerbayar: number; isPaid: boolean; nominalAwal: number; nominalDiskon: number }>>(),
      totalNominalAwal: 0,
      totalNominalDiskon: 0,
      totalNominal: 0,
      totalTerbayar: 0,
      countTagihan: 0,
      countSudahDibayar: 0,
      countBelumDibayar: 0,
    };
    const values = bucket.byColumn.get(colKey) || [];
    const isPaid = row.nominalTerbayar > 0;
    values.push({
      nominalAwal: row.nominalAwal,
      nominalDiskon: row.nominalDiskon,
      nominal: row.nominal,
      nominalTerbayar: row.nominalTerbayar,
      isPaid,
    });
    bucket.byColumn.set(colKey, values);
    bucket.totalNominalAwal += row.nominalAwal;
    bucket.totalNominalDiskon += row.nominalDiskon;
    bucket.totalNominal += row.nominal;
    bucket.totalTerbayar += row.nominalTerbayar;
    bucket.countTagihan += 1;
    if (isPaid) bucket.countSudahDibayar += 1;
    else bucket.countBelumDibayar += 1;
    bySantri.set(row.santriId, bucket);
  }

  const rows = santriRows.map((santri) => {
    const bucket = bySantri.get(santri.id);
    const cellMap: Record<string, string> = {};
    let visibleNominalAwal = 0;
    let visibleNominalDiskon = 0;
    let visibleNominal = 0;
    let visibleTerbayar = 0;
    let visibleCount = 0;
    for (const col of columns) {
      const values = bucket?.byColumn.get(col.key) || [];
      const filteredValues = values.filter((item) => {
        if (countView === "SUDAH_DIBAYAR") return item.isPaid;
        if (countView === "BELUM_DIBAYAR") return !item.isPaid;
        return true;
      });
      for (const item of filteredValues) {
        visibleNominalAwal += item.nominalAwal;
        visibleNominalDiskon += item.nominalDiskon;
        visibleNominal += item.nominal;
        visibleTerbayar += item.nominalTerbayar;
        visibleCount += 1;
      }
      cellMap[col.key] = filteredValues.length
        ? filteredValues.map((item) => formatNominal(item.nominal)).join(", ")
        : "-";
    }
    const totalNominalAwal = countView === "SEMUA" || countView === "JUMLAH_TAGIHAN"
      ? bucket?.totalNominalAwal || 0
      : visibleNominalAwal;
    const totalNominalDiskon = countView === "SEMUA" || countView === "JUMLAH_TAGIHAN"
      ? bucket?.totalNominalDiskon || 0
      : visibleNominalDiskon;
    const totalNominal = countView === "SEMUA" || countView === "JUMLAH_TAGIHAN"
      ? bucket?.totalNominal || 0
      : visibleNominal;
    const totalTerbayar = countView === "SEMUA" || countView === "JUMLAH_TAGIHAN"
      ? bucket?.totalTerbayar || 0
      : visibleTerbayar;
    return {
      santri: {
        id: santri.id,
        nis: santri.nis,
        nama: santri.nama,
        kelas: santri.kelas ? { id: santri.kelas.id, nama: santri.kelas.nama } : null,
      },
      cells: cellMap,
      totalNominalAwal,
      totalNominalDiskon,
      totalNominal,
      totalTerbayar,
      totalSisa: Math.max(0, totalNominal - totalTerbayar),
      countTagihan: countView === "SEMUA" || countView === "JUMLAH_TAGIHAN"
        ? bucket?.countTagihan || 0
        : visibleCount,
      countSudahDibayar: bucket?.countSudahDibayar || 0,
      countBelumDibayar: bucket?.countBelumDibayar || 0,
    };
  });

  rows.sort((a: any, b: any) => {
    let result = 0;
    if (sortBy === "KELAS") {
      const kelasA = a.santri.kelas?.nama || "";
      const kelasB = b.santri.kelas?.nama || "";
      result = kelasA.localeCompare(kelasB, "id");
      if (result === 0) result = a.santri.nis.localeCompare(b.santri.nis, "id");
    } else if (sortBy === "JUMLAH_TAGIHAN") {
      result = a.countTagihan - b.countTagihan;
      if (result === 0) result = a.santri.nis.localeCompare(b.santri.nis, "id");
    } else {
      result = a.santri.nis.localeCompare(b.santri.nis, "id");
    }
    return order === "asc" ? result : -result;
  });

    return NextResponse.json({
      filter,
      sortBy,
      order,
      countView,
      totalSantri: rows.length,
      totalKolomTagihan: columns.length,
      columns,
      rows,
    });
  } catch (error) {
    if (isPoolTimeoutError(error)) {
      return NextResponse.json(
        { message: "Koneksi database sedang penuh. Coba ulang beberapa detik lagi." },
        { status: 503 },
      );
    }
    return NextResponse.json({ message: "Gagal memuat matrix tagihan" }, { status: 500 });
  }
}
