"use client";

import { useEffect, useState } from "react";
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

export default function PembayaranPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [picUserId, setPicUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [receiptHtml, setReceiptHtml] = useState("");

  async function loadData(nextPage = page) {
    setLoading(true);
    setMessage("");
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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
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
    setMessage("");
    try {
      const res = await fetch(`/api/pembayaran/${pembayaranId}/kwitansi?template=${template}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat kwitansi");
      setReceiptHtml(json.html || "");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Pembayaran & Kwitansi</h2>
      <p className="hint-text">
        Mendukung pembayaran tunai/transfer, cicilan multi-transaksi, dan template kwitansi ringkas/lengkap.
      </p>

      <div className="row-inline">
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

      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Santri</th>
              <th>Komponen</th>
              <th>Periode</th>
              <th>Nominal Tagihan Awal</th>
              <th>Nominal Diskon</th>
              <th>Nominal Tagihan</th>
              <th>Nominal Terbayar</th>
              <th>Nominal Belum Dibayar</th>
              <th>Nominal Pembayaran</th>
              <th>Metode</th>
              <th>Referensi</th>
              <th>Kwitansi</th>
              <th>PIC</th>
              <th>Admin</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.tanggalBayar).toISOString().slice(0, 10)}</td>
                <td>{row.tagihan.santri.nis} - {row.tagihan.santri.nama}</td>
                <td>{row.tagihan.komponen.kode} - {row.tagihan.komponen.nama}</td>
                <td>{row.tagihan.periodeKey}</td>
                <td>{formatNumber(row.tagihan.nominalAwal)}</td>
                <td>{formatNumber(row.tagihan.nominalDiskon)}</td>
                <td>{formatNumber(row.tagihan.nominal)}</td>
                <td>{formatNumber(row.tagihan.nominalTerbayar)}</td>
                <td>{formatNumber(Math.max(0, row.tagihan.nominal - row.tagihan.nominalTerbayar))}</td>
                <td>{formatNumber(row.nominal)}</td>
                <td>{row.metode}</td>
                <td>{row.referensi || "-"}</td>
                <td>{row.kwitansi?.nomor || "-"}</td>
                <td>{row.tagihan.picUser?.username || "-"}</td>
                <td>{row.adminUsername}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => previewKwitansi(row.id, "RINGKAS")} disabled={loading}>Ringkas</button>
                    <button type="button" onClick={() => previewKwitansi(row.id, "LENGKAP")} disabled={loading}>Lengkap</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={16}>Belum ada transaksi pembayaran</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="row-actions">
        <button type="button" disabled={loading || page <= 1} onClick={() => loadData(page - 1)}>Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button type="button" disabled={loading || page >= totalPages} onClick={() => loadData(page + 1)}>Next</button>
      </div>

      {receiptHtml ? (
        <div className="stack-block">
          <h3>Preview Kwitansi</h3>
          <div className="table-wrap" dangerouslySetInnerHTML={{ __html: receiptHtml }} />
        </div>
      ) : null}
    </section>
  );
}
