"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type BatchHistoryEntry = {
  id: string;
  batchName: string;
  metode: "TUNAI" | "TRANSFER";
  adminUsername: string;
  createdAt: string;
  totalItem: number;
  totalSantri: number;
  totalNominal: number;
};

const PAGE_SIZE = 10;

const fmt = (n: number) => n.toLocaleString("id-ID");
const fmtDateTime = (v: string) =>
  new Date(v).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

function inDateRange(value: string, fromDate: string, toDate: string) {
  const d = new Date(value);
  if (fromDate) {
    const from = new Date(`${fromDate}T00:00:00`);
    if (d < from) return false;
  }
  if (toDate) {
    const to = new Date(`${toDate}T23:59:59`);
    if (d > to) return false;
  }
  return true;
}

export default function TagihanV4HistoryPage() {
  const [rows, setRows] = useState<BatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [metode, setMetode] = useState<"ALL" | "TUNAI" | "TRANSFER">("ALL");
  const [admin, setAdmin] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/tagihan-v4/batch-history");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat history batch");
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal memuat history batch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, [loadHistory]);

  const adminOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.adminUsername))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (metode !== "ALL" && row.metode !== metode) return false;
      if (admin !== "ALL" && row.adminUsername !== admin) return false;
      if (!inDateRange(row.createdAt, dateFrom, dateTo)) return false;
      if (!search.trim()) return true;
      return row.batchName.toLowerCase().includes(search.trim().toLowerCase());
    });
  }, [rows, metode, admin, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const pageStart = filteredRows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, filteredRows.length);

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>History Batch V4</h2>
          <p>Audit semua submit batch pembayaran dari Tagihan V4.</p>
        </div>
        <div className="row-actions">
          <Link href="/tagihan-v4" className="btn-secondary">
            Kembali ke V4
          </Link>
          <button type="button" className="btn-secondary" onClick={() => loadHistory()} disabled={loading}>
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </header>

      <div className="v4-history-filter">
        <input
          placeholder="Cari nama batch..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <select
          value={metode}
          onChange={(event) => {
            setMetode(event.target.value as "ALL" | "TUNAI" | "TRANSFER");
            setPage(1);
          }}
        >
          <option value="ALL">Semua Metode</option>
          <option value="TUNAI">TUNAI</option>
          <option value="TRANSFER">TRANSFER</option>
        </select>

        <select
          value={admin}
          onChange={(event) => {
            setAdmin(event.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">Semua Admin</option>
          {adminOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(event) => {
            setDateFrom(event.target.value);
            setPage(1);
          }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => {
            setDateTo(event.target.value);
            setPage(1);
          }}
        />

        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setSearch("");
            setMetode("ALL");
            setAdmin("ALL");
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
        >
          Reset Filter
        </button>
      </div>

      {message ? <div className="v3-error">{message}</div> : null}

      {!rows.length && !loading ? (
        <div className="empty-state">
          <div className="empty-illustration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h3>Belum Ada History Batch</h3>
          <p>History akan muncul setelah proses submit draft pertama dilakukan.</p>
          <Link href="/tagihan-v4" className="btn-secondary">Kembali ke Tagihan V4</Link>
        </div>
      ) : (
        <>
          <div className="hint-text">
            Menampilkan {pageStart}-{pageEnd} dari {fmt(filteredRows.length)} batch.
          </div>

          <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Batch</th>
                    <th>Tanggal Submit</th>
                    <th>Total Transaksi</th>
                    <th>Total Nominal</th>
                    <th>Lihat Detail</th>
                  </tr>
                </thead>
              <tbody>
                {pagedRows.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>
                      <Link href={`/tagihan-v4/history/${encodeURIComponent(entry.id)}`}>
                        <strong>{entry.batchName}</strong>
                      </Link>
                      <div className="compact-row">
                        {entry.adminUsername} ·{" "}
                        <span className={`v4-method-chip is-${entry.metode.toLowerCase()}`}>{entry.metode}</span>
                      </div>
                    </td>
                    <td>{fmtDateTime(entry.createdAt)}</td>
                    <td>{fmt(entry.totalItem)}</td>
                    <td className="v4-td-money">Rp {fmt(entry.totalNominal)}</td>
                    <td>
                      <Link href={`/tagihan-v4/history/${encodeURIComponent(entry.id)}`} className="btn-secondary">
                        Lihat Detail
                      </Link>
                    </td>
                  </tr>
                ))}
                {!pagedRows.length ? (
                  <tr>
                    <td colSpan={6}>Tidak ada data sesuai filter.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="pagination v4-pagination">
            <button type="button" className="btn-secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              Sebelumnya
            </button>
            <span>
              Halaman {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Berikutnya
            </button>
          </div>
        </>
      )}
    </section>
  );
}
