"use client";

type Kelas = {
  id: string;
  nama: string;
  active: boolean;
};

type KelasListResponse = {
  data: Kelas[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

import { FormEvent, useEffect, useState } from "react";

export default function KelasPage() {
  const [rows, setRows] = useState<Kelas[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formId, setFormId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [active, setActive] = useState(true);

  async function loadData(nextPage = page, keyword = q) {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "10",
        q: keyword,
      });
      const res = await fetch(`/api/kelas?${params.toString()}`);
      const json = (await res.json()) as KelasListResponse;
      if (!res.ok) throw new Error((json as { message?: string }).message || "Gagal load data");

      setRows(json.data);
      setTotalPages(json.totalPages || 1);
      setPage(json.page || 1);
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
    setNama("");
    setActive(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (nama.trim().length < 2) {
      setMessage("Nama kelas minimal 2 karakter");
      return;
    }

    const payload = { nama: nama.trim(), active };

    const res = await fetch(formId ? `/api/kelas/${formId}` : "/api/kelas", {
      method: formId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.message || "Gagal menyimpan data");
      return;
    }

    resetForm();
    await loadData(page, q);
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Hapus data kelas ini?");
    if (!ok) return;

    const res = await fetch(`/api/kelas/${id}`, { method: "DELETE" });
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.message || "Gagal menghapus data");
      return;
    }

    await loadData(page, q);
  }

  return (
    <section>
      <h2>Master Kelas</h2>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          loadData(1, q);
        }}
      >
        <input
          type="text"
          placeholder="Cari nama kelas"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Cari</button>
      </form>

      <form className="form-grid" onSubmit={onSubmit}>
        <h3>{formId ? "Edit Kelas" : "Tambah Kelas"}</h3>
        <label htmlFor="nama">Nama Kelas</label>
        <input
          id="nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
        />

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Aktif
        </label>

        <div className="row-actions">
          <button type="submit">{formId ? "Update" : "Simpan"}</button>
          {formId ? (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Batal
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.nama}</td>
                <td>{row.active ? "Aktif" : "Nonaktif"}</td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setFormId(row.id);
                        setNama(row.nama);
                        setActive(row.active);
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
                <td colSpan={3}>{loading ? "Memuat..." : "Tidak ada data"}</td>
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
    </section>
  );
}
