"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, EmptyState, Modal, Popover, Tabs } from "@/app/dashboard/_components/primitives";
import { useToast } from "@/app/dashboard/_components/toast";

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
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [picUserId, setPicUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tab, setTab] = useState("SEMUA");
  const [compactMode, setCompactMode] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTagihanId, setPaymentTagihanId] = useState("");
  const [paymentNominal, setPaymentNominal] = useState("");
  const [paymentMetode, setPaymentMetode] = useState<"TUNAI" | "TRANSFER">("TUNAI");
  const [paymentReferensi, setPaymentReferensi] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [nextStatus, setNextStatus] = useState<TagihanStatus>("TERBIT");

  const { pushToast } = useToast();

  const selectedPaymentRow = rows.find((r) => r.id === paymentTagihanId) || null;

  async function loadData(nextPage = page) {
    setLoading(true);

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

  function openEditModal(row: Row) {
    setEditing(row);
    setNextStatus(row.status);
    setEditOpen(true);
  }

  async function submitEditStatus(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;

    const prevRows = rows;
    setRows((current) => current.map((row) => (row.id === editing.id ? { ...row, status: nextStatus } : row)));

    try {
      const res = await fetch(`/api/tagihan/${editing.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal update status");

      pushToast(`Status tagihan diubah ke ${nextStatus}`, "success");
      setEditOpen(false);
      setEditing(null);
    } catch (error) {
      setRows(prevRows);
      pushToast(error instanceof Error ? error.message : "Terjadi kesalahan", "error");
    }
  }

  function openPaymentForm(row: Row) {
    setPaymentTagihanId(row.id);
    const sisa = Math.max(0, row.nominal - row.nominalTerbayar);
    setPaymentNominal(formatNumber(sisa || row.nominal));
    setPaymentMetode("TUNAI");
    setPaymentReferensi("");
    setPaymentOpen(true);
  }

  function resetPaymentForm() {
    setPaymentTagihanId("");
    setPaymentNominal("");
    setPaymentMetode("TUNAI");
    setPaymentReferensi("");
    setPaymentOpen(false);
  }

  async function bayarTagihan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentTagihanId) {
      pushToast("Pilih tagihan dulu", "warning");
      return;
    }

    const nominal = parseNumberInput(paymentNominal);
    if (!Number.isFinite(nominal) || nominal <= 0) {
      pushToast("Nominal bayar harus > 0", "warning");
      return;
    }
    if (paymentMetode === "TRANSFER" && !paymentReferensi.trim()) {
      pushToast("Referensi transfer wajib diisi", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tagihan/${paymentTagihanId}/pembayaran`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nominal, metode: paymentMetode, referensi: paymentReferensi }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menyimpan pembayaran");
      const nomor = json?.kwitansi?.nomor ? ` | Kwitansi: ${json.kwitansi.nomor}` : "";
      pushToast(`Pembayaran tersimpan${nomor}`, "success");
      resetPaymentForm();
      await loadData(page);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    if (tab === "LUNAS") return rows.filter((row) => row.status === "LUNAS");
    if (tab === "TUNGGAKAN") return rows.filter((row) => row.status === "TERBIT" || row.status === "SEBAGIAN");
    return rows;
  }, [rows, tab]);

  const allChecked = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.id));

  function toggleCheckAll() {
    if (allChecked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredRows.map((row) => row.id));
  }

  function toggleCheck(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Tagihan Santri</h2>
          <p>Monitor status lifecycle tagihan dan proses pembayaran tanpa layar yang padat.</p>
        </div>
      </header>

      <Card>
        <div className="toolbar-row">
          <div className="toolbar">
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

          <div className="toolbar-actions">
            <Tabs
              tabs={[
                { label: "Semua", value: "SEMUA" },
                { label: "Lunas", value: "LUNAS" },
                { label: "Tunggakan", value: "TUNGGAKAN" },
              ]}
              value={tab}
              onChange={setTab}
            />
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
        </div>

        {selectedIds.length ? (
          <div className="bulk-bar">
            <span>{selectedIds.length} tagihan dipilih</span>
            <button type="button" className="btn-secondary" onClick={() => setSelectedIds([])}>Reset Pilihan</button>
          </div>
        ) : null}

        {!filteredRows.length ? (
          <EmptyState
            title="Belum ada data tagihan"
            description="Data tagihan akan tampil setelah proses generate pada modul pembuatan tagihan selesai."
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
                  <th>Santri</th>
                  <th>Komponen</th>
                  <th>Periode</th>
                  <th>Tagihan</th>
                  <th>Terbayar</th>
                  <th>Sisa</th>
                  <th>Status</th>
                  <th>Jatuh Tempo</th>
                  <th>PIC</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleCheck(row.id)}
                        aria-label={`Pilih ${row.santri.nama}`}
                      />
                    </td>
                    <td>{row.santri.nis} - {row.santri.nama}</td>
                    <td>{row.komponen.kode} - {row.komponen.nama}</td>
                    <td>{row.periodeKey}</td>
                    <td>{formatNumber(row.nominal)}</td>
                    <td>{formatNumber(row.nominalTerbayar)}</td>
                    <td>{formatNumber(Math.max(0, row.nominal - row.nominalTerbayar))}</td>
                    <td><span className="status-badge">{row.status}</span></td>
                    <td>{new Date(row.jatuhTempo).toISOString().slice(0, 10)}</td>
                    <td>{row.picUser?.username || "-"}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
                        {(row.status === "TERBIT" || row.status === "SEBAGIAN") ? (
                          <button type="button" onClick={() => openPaymentForm(row)}>Bayar</button>
                        ) : null}
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

      <Modal
        open={editOpen}
        title="Edit Tagihan"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button type="submit" form="edit-tagihan-form">Simpan</button>
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Batal</button>
          </>
        }
      >
        <form id="edit-tagihan-form" className="form-grid" onSubmit={submitEditStatus}>
          <p className="hint-text">
            {editing ? `${editing.santri.nis} - ${editing.santri.nama}` : "-"}
          </p>

          <label htmlFor="nextStatus">Status</label>
          <select id="nextStatus" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as TagihanStatus)}>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </form>
      </Modal>

      <Modal
        open={paymentOpen}
        title="Pembayaran Tagihan"
        onClose={resetPaymentForm}
        footer={
          <>
            <button type="submit" form="payment-form" disabled={loading}>Simpan</button>
            <button type="button" className="btn-secondary" onClick={resetPaymentForm}>Batal</button>
          </>
        }
      >
        <form id="payment-form" className="form-grid" onSubmit={bayarTagihan}>
          {selectedPaymentRow ? (
            <p className="hint-text">
              {selectedPaymentRow.santri.nis} - {selectedPaymentRow.santri.nama} | {selectedPaymentRow.komponen.kode} - {selectedPaymentRow.komponen.nama} | Tagihan: {formatNumber(selectedPaymentRow.nominal)} | Sisa: {formatNumber(Math.max(0, selectedPaymentRow.nominal - selectedPaymentRow.nominalTerbayar))}
            </p>
          ) : null}

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
        </form>
      </Modal>
    </section>
  );
}
