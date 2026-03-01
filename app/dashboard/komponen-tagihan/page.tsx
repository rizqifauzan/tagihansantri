"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card, Modal } from "@/app/dashboard/_components/primitives";

type Komponen = {
  id: string;
  kode: string;
  nama: string;
  tipe: "BULANAN" | "INSIDENTAL" | "SANTRI_BARU";
  active: boolean;
};

type KomponenListResponse = {
  data: Komponen[];
  page: number;
  totalPages: number;
};

const TIPE_OPTIONS = ["BULANAN", "INSIDENTAL", "SANTRI_BARU"] as const;

export default function KomponenTagihanPage() {
  const [rows, setRows] = useState<Komponen[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formId, setFormId] = useState<string | null>(null);
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<(typeof TIPE_OPTIONS)[number]>("BULANAN");
  const [active, setActive] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  async function loadData(nextPage = page, keyword = q) {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "10",
        q: keyword,
      });
      const res = await fetch(`/api/komponen-tagihan?${params.toString()}`);
      const json = (await res.json()) as KomponenListResponse;

      if (!res.ok) throw new Error((json as { message?: string }).message || "Gagal load data");

      setRows(json.data);
      setPage(json.page || 1);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setFormId(null);
    setKode("");
    setNama("");
    setTipe("BULANAN");
    setActive(true);
  }

  function closeForm() {
    setFormOpen(false);
    resetForm();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (kode.trim().length < 2) {
      setMessage("Kode minimal 2 karakter");
      return;
    }
    if (nama.trim().length < 2) {
      setMessage("Nama minimal 2 karakter");
      return;
    }

    const payload = {
      kode: kode.trim(),
      nama: nama.trim(),
      tipe,
      active,
    };

    const res = await fetch(
      formId ? `/api/komponen-tagihan/${formId}` : "/api/komponen-tagihan",
      {
        method: formId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.message || "Gagal menyimpan data");
      return;
    }

    setFormOpen(false);
    resetForm();
    await loadData(page, q);
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Hapus komponen tagihan ini?");
    if (!ok) return;

    const res = await fetch(`/api/komponen-tagihan/${id}`, { method: "DELETE" });
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.message || "Gagal menghapus data");
      return;
    }

    await loadData(page, q);
  }

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Komponen Tagihan</h2>
          <p>Master komponen biaya untuk proses generate dan pembayaran tagihan.</p>
        </div>
      </header>

      <Card>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        <button type="button" onClick={() => { resetForm(); setFormOpen(true); }}>
          Tambah Komponen
        </button>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          loadData(1, q);
        }}
      >
        <input
          type="text"
          placeholder="Cari nama atau kode"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Cari</button>
      </form>

      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Tipe</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.kode}</td>
                <td>{row.nama}</td>
                <td>{row.tipe}</td>
                <td>{row.active ? "Aktif" : "Nonaktif"}</td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setFormId(row.id);
                        setKode(row.kode);
                        setNama(row.nama);
                        setTipe(row.tipe);
                        setActive(row.active);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className="btn-danger"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5}>{loading ? "Memuat..." : "Tidak ada data"}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button type="button" disabled={page <= 1} onClick={() => loadData(page - 1, q)}>
          Sebelumnya
        </button>
        <span>
          Halaman {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => loadData(page + 1, q)}
        >
          Berikutnya
        </button>
      </div>
      </Card>

      <Modal
        open={formOpen}
        title={formId ? "Edit Komponen" : "Tambah Komponen"}
        onClose={closeForm}
        footer={(
          <>
            <button type="submit" form="komponen-form">{formId ? "Update" : "Simpan"}</button>
            <button type="button" className="btn-secondary" onClick={closeForm}>Batal</button>
          </>
        )}
      >
        <form id="komponen-form" className="form-grid" onSubmit={onSubmit}>
          <label htmlFor="kode">Kode</label>
          <input id="kode" value={kode} onChange={(e) => setKode(e.target.value)} required />

          <label htmlFor="nama">Nama</label>
          <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} required />

          <label htmlFor="tipe">Tipe</label>
          <select
            id="tipe"
            value={tipe}
            onChange={(e) => setTipe(e.target.value as (typeof TIPE_OPTIONS)[number])}
          >
            <option value="BULANAN">Bulanan</option>
            <option value="INSIDENTAL">Insidental</option>
            <option value="SANTRI_BARU">Santri Baru</option>
          </select>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Aktif
          </label>
        </form>
      </Modal>
    </section>
  );
}
