import { Prisma, TagihanStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type CellData = {
  display: string;
  tagihanId: string | null;
  sisa: number;
  nominal: number;
  nominalTerbayar: number;
  status: string;
};

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const db = prisma as any;

  const name = req.nextUrl.searchParams.get("name") || "";
  const masterIds =
    req.nextUrl.searchParams.get("masterIds")?.split(",").filter(Boolean) || [];
  const picUserIds =
    req.nextUrl.searchParams.get("picUserIds")?.split(",").filter(Boolean) || [];

  try {
    // 1. Filter options: Masters and PICs
    const [masters, pics] = await Promise.all([
      db.tagihanMaster.findMany({
        select: {
          id: true,
          namaTagihan: true,
          komponen: { select: { kode: true, nama: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.user.findMany({
        where: { active: true, isDeleted: false },
        select: { id: true, username: true },
        orderBy: { username: "asc" },
      }),
    ]);

    // 2. Build filters
    const santriWhere: Prisma.SantriWhereInput = name
      ? { nama: { contains: name, mode: "insensitive" } }
      : {};

    const tagihanWhere: Prisma.TagihanWhereInput = {
      status: { notIn: [TagihanStatus.BATAL, TagihanStatus.DRAFT] },
    };
    if (masterIds.length > 0) tagihanWhere.masterId = { in: masterIds };
    if (picUserIds.length > 0) tagihanWhere.picUserId = { in: picUserIds };
    if (name)
      tagihanWhere.santri = { nama: { contains: name, mode: "insensitive" } };

    // 3. Fetch data
    const [santriRows, tagihanRows] = await Promise.all([
      db.santri.findMany({
        where: santriWhere,
        select: {
          id: true,
          nis: true,
          nama: true,
          kelas: { select: { id: true, nama: true } },
        },
      }),
      db.tagihan.findMany({
        where: tagihanWhere,
        select: {
          id: true,
          santriId: true,
          masterId: true,
          komponenId: true,
          periodeKey: true,
          nominalAwal: true,
          nominalDiskon: true,
          nominal: true,
          nominalTerbayar: true,
          status: true,
          master: { select: { id: true, namaTagihan: true } },
          komponen: { select: { id: true, kode: true, nama: true } },
        },
      }),
    ]);

    // 4. Build matrix columns
    const columnMap = new Map<
      string,
      {
        key: string;
        masterId: string;
        masterLabel: string;
        komponenKode: string;
        komponenNama: string;
        periodeKey: string;
      }
    >();
    for (const row of tagihanRows) {
      const key = `${row.masterId}__${row.periodeKey}`;
      if (!columnMap.has(key)) {
        const masterLabel =
          row.master?.namaTagihan ||
          `${row.komponen.kode} - ${row.komponen.nama}`;
        columnMap.set(key, {
          key,
          masterId: row.masterId,
          masterLabel,
          komponenKode: row.komponen.kode,
          komponenNama: row.komponen.nama,
          periodeKey: row.periodeKey,
        });
      }
    }
    const columns = Array.from(columnMap.values()).sort((a, b) => {
      const byMaster = a.masterLabel.localeCompare(b.masterLabel, "id");
      if (byMaster !== 0) return byMaster;
      return a.periodeKey.localeCompare(b.periodeKey, "id");
    });

    // 5. Aggregate per-santri per-column.
    //    We store tagged tagihan entries per cell for rich edit-mode data.
    type BucketEntry = {
      tagihanId: string;
      nominal: number;
      nominalTerbayar: number;
      status: string;
    };
    const bySantri = new Map<
      string,
      {
        byColumn: Map<string, BucketEntry[]>;
        totalNominal: number;
        totalNominalDiskon: number;
        totalTerbayar: number;
        countTagihan: number;
      }
    >();
    for (const row of tagihanRows) {
      const colKey = `${row.masterId}__${row.periodeKey}`;
      const bucket = bySantri.get(row.santriId) || {
        byColumn: new Map(),
        totalNominal: 0,
        totalNominalDiskon: 0,
        totalTerbayar: 0,
        countTagihan: 0,
      };
      const entries = bucket.byColumn.get(colKey) || [];
      entries.push({
        tagihanId: row.id,
        nominal: row.nominal,
        nominalTerbayar: row.nominalTerbayar,
        status: row.status,
      });
      bucket.byColumn.set(colKey, entries);
      bucket.totalNominal += row.nominal;
      bucket.totalNominalDiskon += row.nominalDiskon;
      bucket.totalTerbayar += row.nominalTerbayar;
      bucket.countTagihan += 1;
      bySantri.set(row.santriId, bucket);
    }

    // 6. Build rows
    let rows = (santriRows as any[]).map((santri) => {
      const bucket = bySantri.get(santri.id);
      const cells: Record<string, CellData> = {};
      for (const col of columns) {
        const entries = bucket?.byColumn.get(col.key) || [];
        if (entries.length === 0) {
          cells[col.key] = {
            display: "—",
            tagihanId: null,
            sisa: 0,
            nominal: 0,
            nominalTerbayar: 0,
            status: "",
          };
        } else if (entries.length === 1) {
          const e = entries[0];
          const sisa = Math.max(0, e.nominal - e.nominalTerbayar);
          cells[col.key] = {
            display: e.nominal.toLocaleString("id-ID"),
            tagihanId: e.tagihanId,
            sisa,
            nominal: e.nominal,
            nominalTerbayar: e.nominalTerbayar,
            status: e.status,
          };
        } else {
          // Multiple tagihan in same cell – read-only
          cells[col.key] = {
            display: entries
              .map((e) => e.nominal.toLocaleString("id-ID"))
              .join(", "),
            tagihanId: null, // multi – not editable
            sisa: entries.reduce(
              (s, e) => s + Math.max(0, e.nominal - e.nominalTerbayar),
              0
            ),
            nominal: entries.reduce((s, e) => s + e.nominal, 0),
            nominalTerbayar: entries.reduce(
              (s, e) => s + e.nominalTerbayar,
              0
            ),
            status: "",
          };
        }
      }
      return {
        santri,
        cells,
        totalNominal: bucket?.totalNominal || 0,
        totalNominalDiskon: bucket?.totalNominalDiskon || 0,
        totalTerbayar: bucket?.totalTerbayar || 0,
        totalSisa: Math.max(
          0,
          (bucket?.totalNominal || 0) - (bucket?.totalTerbayar || 0)
        ),
        countTagihan: bucket?.countTagihan || 0,
      };
    });

    // Filter rows with no tagihan when filters are active
    if (masterIds.length > 0 || picUserIds.length > 0) {
      rows = rows.filter((r) => r.countTagihan > 0);
    }

    rows.sort((a, b) =>
      a.santri.nama.localeCompare(b.santri.nama, "id")
    );

    const mastersForFilter = (masters as any[]).map((m) => ({
      id: m.id,
      label:
        m.namaTagihan || `${m.komponen.kode} - ${m.komponen.nama}`,
    }));

    return NextResponse.json({ masters: mastersForFilter, pics, columns, rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Gagal memuat matrix tagihan v2" },
      { status: 500 }
    );
  }
}
