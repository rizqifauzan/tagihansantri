"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TagihanStatus = "DRAFT" | "TERBIT" | "SEBAGIAN" | "LUNAS" | "BATAL";
type Row = {
  id: string;
  periodeKey: string;
  nominalAwal: number;
  nominalDiskon: number;
  nominal: number;
  nominalTerbayar: number;
  jatuhTempo: string;
  status: TagihanStatus;
  santri: { id: string; nis: string; nama: string; kelas: { nama: string } | null };
  komponen: { id: string; kode: string; nama: string; tipe: "BULANAN" | "INSIDENTAL" | "SANTRI_BARU" };
  master: { id: string; namaTagihan: string | null; targetType: string };
  picUser: { id: string; username: string; active: boolean } | null;
};
type UserOption = { id: string; username: string; active: boolean };

const STATUS_OPTIONS: TagihanStatus[] = ["DRAFT", "TERBIT", "SEBAGIAN", "LUNAS", "BATAL"];
const formatNumber = (value: number) => value.toLocaleString("id-ID");
const parseNumberInput = (value: string) => Number((value || "").replace(/\./g, "")) || 0;
const formatNumberInput = (value: string) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
};

export default function TagihanPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [picUserId, setPicUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paymentTagihanId, setPaymentTagihanId] = useState("");
  const [paymentNominal, setPaymentNominal] = useState("");
  const [paymentMetode, setPaymentMetode] = useState<"TUNAI" | "TRANSFER">("TUNAI");
  const [paymentReferensi, setPaymentReferensi] = useState("");

  const selectedPaymentRow = rows.find((r) => r.id === paymentTagihanId) || null;
  const groupedRows = useMemo(() => {
    const map = new Map<
      string,
      {
        santri: Row["santri"];
        items: Row[];
      }
    >();

    for (const row of rows) {
      const existing = map.get(row.santri.id);
      if (existing) {
        existing.items.push(row);
      } else {
        map.set(row.santri.id, { santri: row.santri, items: [row] });
      }
    }

    return Array.from(map.values());
  }, [rows]);

  async function loadData(nextPage = page) {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", "20");
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (picUserId) params.set("picUserId", picUserId);

      const res = await fetch(`/api/tagihan?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat data tagihan");

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

  async function updateStatus(id: string, nextStatus: TagihanStatus) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tagihan/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal update status");
      setMessage(`Status tagihan diubah ke ${nextStatus}`);
      await loadData(page);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  function openPaymentForm(row: Row) {
    setPaymentTagihanId(row.id);
    const sisa = Math.max(0, row.nominal - row.nominalTerbayar);
    setPaymentNominal(formatNumber(sisa || row.nominal));
    setPaymentMetode("TUNAI");
    setPaymentReferensi("");
    setMessage("");
  }

  function resetPaymentForm() {
    setPaymentTagihanId("");
    setPaymentNominal("");
    setPaymentMetode("TUNAI");
    setPaymentReferensi("");
  }

  async function bayarTagihan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentTagihanId) {
      setMessage("Pilih tagihan dulu");
      return;
    }

    const nominal = parseNumberInput(paymentNominal);
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setMessage("Nominal bayar harus > 0");
      return;
    }
    if (paymentMetode === "TRANSFER" && !paymentReferensi.trim()) {
      setMessage("Referensi transfer wajib diisi");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tagihan/${paymentTagihanId}/pembayaran`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nominal, metode: paymentMetode, referensi: paymentReferensi }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menyimpan pembayaran");
      const nomor = json?.kwitansi?.nomor ? ` | Kwitansi: ${json.kwitansi.nomor}` : "";
      setMessage(`Pembayaran berhasil disimpan${nomor}`);
      resetPaymentForm();
      await loadData(page);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Tagihan per Santri</h2>
      <p className="hint-text">
        Lifecycle status: DRAFT, TERBIT, SEBAGIAN, LUNAS, BATAL.
      </p>

      <div className="row-inline">
        <input
          placeholder="Cari NIS/Nama Santri/Komponen"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={picUserId} onChange={(e) => setPicUserId(e.target.value)}>
          <option value="">Semua PIC</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>
        <button type="button" onClick={() => loadData(1)} disabled={loading}>Filter</button>
      </div>

      {selectedPaymentRow ? (
        <form className="form-grid" onSubmit={bayarTagihan}>
          <h3>Form Pembayaran</h3>

          <label>Tagihan Terpilih</label>
          <div className="hint-text">
            {selectedPaymentRow.santri.nis} - {selectedPaymentRow.santri.nama} | {selectedPaymentRow.komponen.kode} - {selectedPaymentRow.komponen.nama} | Awal: {formatNumber(selectedPaymentRow.nominalAwal)} | Diskon: {formatNumber(selectedPaymentRow.nominalDiskon)} | Tagihan: {formatNumber(selectedPaymentRow.nominal)} | Sisa: {formatNumber(Math.max(0, selectedPaymentRow.nominal - selectedPaymentRow.nominalTerbayar))}
          </div>

          <label htmlFor="paymentNominal">Nominal Bayar</label>
          <input
            id="paymentNominal"
            inputMode="numeric"
            value={paymentNominal}
            onChange={(e) => setPaymentNominal(formatNumberInput(e.target.value))}
            required
          />

          <label htmlFor="paymentMetode">Metode</label>
          <select
            id="paymentMetode"
            value={paymentMetode}
            onChange={(e) => setPaymentMetode(e.target.value as "TUNAI" | "TRANSFER")}
          >
            <option value="TUNAI">TUNAI</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>

          <label htmlFor="paymentReferensi">Referensi {paymentMetode === "TRANSFER" ? "(wajib)" : "(opsional)"}</label>
          <input
            id="paymentReferensi"
            value={paymentReferensi}
            onChange={(e) => setPaymentReferensi(e.target.value)}
            required={paymentMetode === "TRANSFER"}
          />

          <div className="row-actions">
            <button type="submit" disabled={loading}>Simpan Pembayaran</button>
            <button type="button" onClick={resetPaymentForm} disabled={loading}>Batal</button>
          </div>
        </form>
      ) : null}

      {message ? <p className="error-text">{message}</p> : null}

      {!groupedRows.length ? (
        <p className="hint-text">Belum ada data tagihan</p>
      ) : (
        groupedRows.map((group) => {
          const totalNominalAwal = group.items.reduce((sum, item) => sum + item.nominalAwal, 0);
          const totalNominalDiskon = group.items.reduce((sum, item) => sum + item.nominalDiskon, 0);
          const totalNominal = group.items.reduce((sum, item) => sum + item.nominal, 0);
          const totalTerbayar = group.items.reduce((sum, item) => sum + item.nominalTerbayar, 0);
          const totalSisa = Math.max(0, totalNominal - totalTerbayar);

          return (
            <div key={group.santri.id} className="stack-block">
              <h3>
                {group.santri.nis} - {group.santri.nama} ({group.santri.kelas?.nama || "-"})
              </h3>
              <div className="hint-text">
                Total Awal: {formatNumber(totalNominalAwal)} | Total Diskon: {formatNumber(totalNominalDiskon)} | Total Tagihan: {formatNumber(totalNominal)} | Terbayar: {formatNumber(totalTerbayar)} | Sisa: {formatNumber(totalSisa)}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Komponen</th>
                      <th>Master</th>
                      <th>Periode</th>
                      <th>Nominal Awal</th>
                      <th>Nominal Diskon</th>
                      <th>Nominal Tagihan</th>
                      <th>Nominal Terbayar</th>
                      <th>Nominal Belum Dibayar</th>
                      <th>Status</th>
                      <th>Jatuh Tempo</th>
                      <th>PIC</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((row) => (
                      <tr key={row.id}>
                        <td>{row.komponen.kode} - {row.komponen.nama}</td>
                        <td>{row.master.namaTagihan || "-"}</td>
                        <td>{row.periodeKey}</td>
                        <td>{formatNumber(row.nominalAwal)}</td>
                        <td>{formatNumber(row.nominalDiskon)}</td>
                        <td>{formatNumber(row.nominal)}</td>
                        <td>{formatNumber(row.nominalTerbayar)}</td>
                        <td>{formatNumber(Math.max(0, row.nominal - row.nominalTerbayar))}</td>
                        <td>{row.status}</td>
                        <td>{new Date(row.jatuhTempo).toISOString().slice(0, 10)}</td>
                        <td>{row.picUser?.username || "-"}</td>
                        <td>
                          <div className="row-actions">
                            {row.status === "DRAFT" ? (
                              <button type="button" onClick={() => updateStatus(row.id, "TERBIT")} disabled={loading}>Publish</button>
                            ) : null}
                            {row.status === "TERBIT" || row.status === "SEBAGIAN" ? (
                              <button type="button" onClick={() => openPaymentForm(row)} disabled={loading}>Bayar</button>
                            ) : null}
                            {(row.status === "TERBIT" || row.status === "SEBAGIAN" || row.status === "DRAFT") ? (
                              <button type="button" className="btn-danger" onClick={() => updateStatus(row.id, "BATAL")} disabled={loading}>Batal</button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      <div className="row-actions">
        <button type="button" disabled={loading || page <= 1} onClick={() => loadData(page - 1)}>Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button type="button" disabled={loading || page >= totalPages} onClick={() => loadData(page + 1)}>Next</button>
      </div>
    </section>
  );
}
