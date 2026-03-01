"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, EmptyState, Popover } from "@/app/dashboard/_components/primitives";
import { useToast } from "@/app/dashboard/_components/toast";

const formatNumber = (value: number) => value.toLocaleString("id-ID");

type Row = {
  id: string;
  nominal: number;
  metode: "TUNAI" | "TRANSFER";
  referensi: string | null;
  tanggalBayar: string;
  adminUsername: string;
  kwitansi: { id: string; nomor: string } | null;
  tagihan: {
    id: string;
    periodeKey: string;
    nominalAwal: number;
    nominalDiskon: number;
    nominal: number;
    nominalTerbayar: number;
    santri: { nis: string; nama: string };
    komponen: { kode: string; nama: string };
    picUser: { id: string; username: string; active: boolean } | null;
  };
};
type UserOption = { id: string; username: string; active: boolean };

type SortKey = "tanggal" | "nominal" | "santri";

export default function PembayaranPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [picUserId, setPicUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compactMode, setCompactMode] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("tanggal");
  const [sortAsc, setSortAsc] = useState(false);

  const { pushToast } = useToast();

  async function loadData(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", "20");
      if (q.trim()) params.set("q", q.trim());
      if (picUserId) params.set("picUserId", picUserId);

      const res = await fetch(`/api/pembayaran?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat data pembayaran");

      setRows(json.data);
      setPage(json.page);
      setTotalPages(json.totalPages);
      setSelectedIds([]);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/users?page=1&pageSize=500&active=true")
      .then((res) => res.json())
      .then((json) => setUsers(json.data || []))
      .catch(() => undefined);
  }, []);

  async function previewKwitansi(pembayaranId: string, template: "RINGKAS" | "LENGKAP") {
    setLoading(true);
    try {
      const res = await fetch(`/api/pembayaran/${pembayaranId}/kwitansi?template=${template}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat kwitansi");
      setReceiptHtml(json.html || "");
      pushToast(`Preview kwitansi ${template.toLowerCase()} dimuat`, "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }

  const processedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortBy === "tanggal") {
        return (new Date(a.tanggalBayar).getTime() - new Date(b.tanggalBayar).getTime()) * dir;
      }
      if (sortBy === "nominal") {
        return (a.nominal - b.nominal) * dir;
      }
      return a.tagihan.santri.nama.localeCompare(b.tagihan.santri.nama) * dir;
    });
  }, [rows, sortAsc, sortBy]);

  const allChecked = processedRows.length > 0 && processedRows.every((row) => selectedIds.includes(row.id));

  function toggleCheckAll() {
    if (allChecked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(processedRows.map((row) => row.id));
  }

  function toggleCheck(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Pembayaran</h2>
          <p>Riwayat transaksi, cicilan, dan preview kwitansi dalam satu tampilan ringkas.</p>
        </div>
      </header>

      <Card>
        <div className="toolbar-row">
          <div className="toolbar">
            <input
              placeholder="Cari santri/komponen/nomor kwitansi/referensi"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select value={picUserId} onChange={(e) => setPicUserId(e.target.value)}>
              <option value="">Semua PIC</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
            <button type="button" onClick={() => loadData(1)} disabled={loading}>Cari</button>
          </div>

          <Popover triggerLabel="Tampilan">
            <label className="checkbox-row compact-row">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
              />
              Mode kompak
            </label>
          </Popover>
        </div>

        {selectedIds.length ? (
          <div className="bulk-bar">
            <span>{selectedIds.length} pembayaran dipilih</span>
            <button type="button" className="btn-secondary" onClick={() => setSelectedIds([])}>Reset Pilihan</button>
          </div>
        ) : null}

        {!processedRows.length ? (
          <EmptyState
            title="Belum ada transaksi"
            description="Transaksi pembayaran akan muncul setelah admin mencatat pembayaran pada menu tagihan."
            cta="Muat Ulang"
            onAction={() => loadData(1)}
          />
        ) : (
          <div className="table-wrap">
            <table className={compactMode ? "table-compact" : ""}>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allChecked} onChange={toggleCheckAll} aria-label="Pilih semua" />
                  </th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => { setSortBy("tanggal"); setSortAsc((s) => sortBy === "tanggal" ? !s : false); }}>
                      Tanggal
                    </button>
                  </th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => { setSortBy("santri"); setSortAsc((s) => sortBy === "santri" ? !s : true); }}>
                      Santri
                    </button>
                  </th>
                  <th>Komponen</th>
                  <th>Periode</th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => { setSortBy("nominal"); setSortAsc((s) => sortBy === "nominal" ? !s : false); }}>
                      Nominal
                    </button>
                  </th>
                  <th>Metode</th>
                  <th>Kwitansi</th>
                  <th>PIC</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {processedRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleCheck(row.id)}
                        aria-label={`Pilih pembayaran ${row.id}`}
                      />
                    </td>
                    <td>{new Date(row.tanggalBayar).toISOString().slice(0, 10)}</td>
                    <td>{row.tagihan.santri.nis} - {row.tagihan.santri.nama}</td>
                    <td>{row.tagihan.komponen.kode} - {row.tagihan.komponen.nama}</td>
                    <td>{row.tagihan.periodeKey}</td>
                    <td>{formatNumber(row.nominal)}</td>
                    <td>{row.metode}</td>
                    <td>{row.kwitansi?.nomor || "-"}</td>
                    <td>{row.tagihan.picUser?.username || "-"}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn-secondary" onClick={() => previewKwitansi(row.id, "RINGKAS")} disabled={loading}>Ringkas</button>
                        <button type="button" onClick={() => previewKwitansi(row.id, "LENGKAP")} disabled={loading}>Lengkap</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <button type="button" disabled={loading || page <= 1} onClick={() => loadData(page - 1)}>Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" disabled={loading || page >= totalPages} onClick={() => loadData(page + 1)}>Next</button>
        </div>
      </Card>

      {receiptHtml ? (
        <Card title="Preview Kwitansi" subtitle="Auto-generated dari endpoint yang sama">
          <div className="receipt-preview" dangerouslySetInnerHTML={{ __html: receiptHtml }} />
        </Card>
      ) : null}
    </section>
  );
}
