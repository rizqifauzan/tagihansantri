"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/app/dashboard/_components/primitives";

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

type MatrixColumn = {
  key: string;
  komponenId: string;
  komponenKode: string;
  komponenNama: string;
  periodeKey: string;
};

type MatrixRow = {
  santri: {
    id: string;
    nis: string;
    nama: string;
    kelas: { id: string; nama: string } | null;
  };
  cells: Record<string, string>;
  totalNominalAwal: number;
  totalNominalDiskon: number;
  totalNominal: number;
  totalTerbayar: number;
  totalSisa: number;
  countTagihan: number;
  countSudahDibayar: number;
  countBelumDibayar: number;
};

type MatrixResponse = {
  filter: MatrixFilter;
  sortBy: MatrixSortBy;
  order: MatrixSortOrder;
  countView: MatrixCountView;
  totalSantri: number;
  totalKolomTagihan: number;
  columns: MatrixColumn[];
  rows: MatrixRow[];
};
const formatNumber = (value: number) => value.toLocaleString("id-ID");

const FILTER_OPTIONS: Array<{ value: MatrixFilter; label: string }> = [
  { value: "ALL", label: "Semua Tagihan" },
  { value: "LUNAS", label: "Hanya Lunas" },
  { value: "SUDAH_DIBAYAR", label: "Sudah Dibayar (>0)" },
  { value: "BELUM_LUNAS", label: "Belum Lunas (Terbit/Sebagian)" },
  { value: "AKTIF_SAJA", label: "Kecualikan Batal & Draft" },
  { value: "BATAL", label: "Hanya Batal" },
  { value: "DRAFT", label: "Hanya Draft" },
];

export default function TagihanMatrixPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<MatrixFilter>("ALL");
  const [sortBy, setSortBy] = useState<MatrixSortBy>("NIS");
  const [order, setOrder] = useState<MatrixSortOrder>("asc");
  const [countView, setCountView] = useState<MatrixCountView>("BELUM_DIBAYAR");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<MatrixResponse>({
    filter: "ALL",
    sortBy: "NIS",
    order: "asc",
    countView: "BELUM_DIBAYAR",
    totalSantri: 0,
    totalKolomTagihan: 0,
    columns: [],
    rows: [],
  });

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        filter,
        sortBy,
        order,
        countView,
      });
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/tagihan-matrix?${params.toString()}`);
      const json = (await res.json()) as MatrixResponse | { message?: string };
      if (!res.ok) {
        const err = "message" in json ? json.message : "";
        throw new Error(err || "Gagal memuat matrix tagihan");
      }
      setData(json as MatrixResponse);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedColumns = useMemo(() => {
    const map = new Map<string, { label: string; cols: MatrixColumn[] }>();
    for (const col of data.columns) {
      const key = col.komponenId;
      const label = `${col.komponenKode} - ${col.komponenNama}`;
      const entry = map.get(key) || { label, cols: [] };
      entry.cols.push(col);
      map.set(key, entry);
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      komponenId: key,
      label: value.label,
      cols: value.cols,
    }));
  }, [data.columns]);

  const summaryColumnCount = data.countView === "SEMUA" ? 8 : 6;

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Laporan Matrix</h2>
          <p>Monitoring seluruh tagihan santri dalam tampilan matrix komponen dan periode.</p>
        </div>
      </header>

      <Card>
      <p className="hint-text">
        Header: Komponen Tagihan lalu Periode. Baris: daftar santri. Sel berisi nominal tagihan.
      </p>
      <div className="row-actions" style={{ marginBottom: 12 }}>
        <input
          placeholder="Cari NIS/Nama/Kelas"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 220, maxWidth: 320 }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as MatrixFilter)}>
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as MatrixSortBy)}>
          <option value="NIS">Urut NIS</option>
          <option value="KELAS">Urut Kelas</option>
          <option value="JUMLAH_TAGIHAN">Urut Jumlah Tagihan</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value as MatrixSortOrder)}>
          <option value="asc">Naik</option>
          <option value="desc">Turun</option>
        </select>
        <select value={countView} onChange={(e) => setCountView(e.target.value as MatrixCountView)}>
          <option value="JUMLAH_TAGIHAN">Jumlah Tagihan</option>
          <option value="SUDAH_DIBAYAR">Jumlah Tagihan yang Sudah Dibayarkan</option>
          <option value="BELUM_DIBAYAR">Jumlah Tagihan yang Belum Dibayarkan</option>
          <option value="SEMUA">Semua</option>
        </select>
        <button type="button" onClick={() => loadData()} disabled={loading}>
          {loading ? "Memuat..." : "Terapkan"}
        </button>
      </div>

      <p className="hint-text">
        Total Santri: {formatNumber(data.totalSantri)} | Total Kolom Tagihan: {formatNumber(data.totalKolomTagihan)}
      </p>
      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap matrix-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="sticky-col sticky-col-1" rowSpan={2}>NIS</th>
              <th className="sticky-col sticky-col-2" rowSpan={2}>Nama</th>
              <th rowSpan={2}>Kelas</th>
              {groupedColumns.map((group) => (
                <th key={group.komponenId} colSpan={group.cols.length}>
                  {group.label}
                </th>
              ))}
              {data.countView === "SEMUA" ? (
                <>
                  <th rowSpan={2}>Semua Tagihan</th>
                  <th rowSpan={2}>Sudah Dibayar</th>
                  <th rowSpan={2}>Belum Dibayar</th>
                </>
              ) : null}
              {data.countView === "JUMLAH_TAGIHAN" ? <th rowSpan={2}>Jumlah Tagihan</th> : null}
              {data.countView === "SUDAH_DIBAYAR" ? <th rowSpan={2}>Sudah Dibayar</th> : null}
              {data.countView === "BELUM_DIBAYAR" ? <th rowSpan={2}>Belum Dibayar</th> : null}
              <th rowSpan={2}>Nominal Tagihan Awal</th>
              <th rowSpan={2}>Nominal Diskon</th>
              <th rowSpan={2}>Nominal Tagihan</th>
              <th rowSpan={2}>Nominal Terbayar</th>
              <th rowSpan={2}>Nominal Belum Dibayar</th>
            </tr>
            <tr>
              {data.columns.map((col) => (
                <th key={col.key}>{col.periodeKey}</th>
              ))}
            </tr>
          </thead>
          <tbody>
              {data.rows.map((row) => (
              <tr key={row.santri.id}>
                <td className="sticky-col sticky-col-1">{row.santri.nis}</td>
                <td className="sticky-col sticky-col-2">{row.santri.nama}</td>
                <td>{row.santri.kelas?.nama || "-"}</td>
                {data.columns.map((col) => (
                  <td key={`${row.santri.id}-${col.key}`}>{row.cells[col.key] || "-"}</td>
                ))}
                {data.countView === "SEMUA" ? (
                  <>
                    <td>{formatNumber(row.countTagihan)}</td>
                    <td>{formatNumber(row.countSudahDibayar)}</td>
                    <td>{formatNumber(row.countBelumDibayar)}</td>
                  </>
                ) : null}
                {data.countView === "JUMLAH_TAGIHAN" ? (
                  <td>{formatNumber(row.countTagihan)}</td>
                ) : null}
                {data.countView === "SUDAH_DIBAYAR" ? (
                  <td>{formatNumber(row.countSudahDibayar)}</td>
                ) : null}
                {data.countView === "BELUM_DIBAYAR" ? (
                  <td>{formatNumber(row.countBelumDibayar)}</td>
                ) : null}
                <td>{formatNumber(row.totalNominalAwal)}</td>
                <td>{formatNumber(row.totalNominalDiskon)}</td>
                <td>{formatNumber(row.totalNominal)}</td>
                <td>{formatNumber(row.totalTerbayar)}</td>
                <td>{formatNumber(row.totalSisa)}</td>
              </tr>
            ))}
            {!data.rows.length ? (
              <tr>
                <td colSpan={3 + data.columns.length + summaryColumnCount}>
                  {loading ? "Memuat..." : "Tidak ada data santri"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      </Card>
    </section>
  );
}
