"use client";

import { FormEvent, useEffect, useState } from "react";

type Keluarga = {
  id: string;
  kodeKeluarga: string;
  namaKepalaFamily: string | null;
  keterangan: string | null;
  _count?: { santri: number };
};

type ListResponse = {
  data: Keluarga[];
  page: number;
  totalPages: number;
};

export default function KeluargaPage() {
  const [rows, setRows] = useState<Keluarga[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [formId, setFormId] = useState<string | null>(null);
  const [kodeKeluarga, setKodeKeluarga] = useState("");
  const [namaKepalaFamily, setNamaKepalaFamily] = useState("");
  const [keterangan, setKeterangan] = useState("");

  async function loadData(nextPage = page, keyword = q) {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), pageSize: "10", q: keyword });
      const res = await fetch(`/api/keluarga?${params.toString()}`);
      const json = (await res.json()) as ListResponse;
      if (!res.ok) throw new Error((json as { message?: string }).message || "Gagal load");
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
    setKodeKeluarga("");
    setNamaKepalaFamily("");
    setKeterangan("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (kodeKeluarga.trim().length < 2) {
      setMessage("Kode keluarga minimal 2 karakter");
      return;
    }

    const payload = {
      kodeKeluarga: kodeKeluarga.trim().toUpperCase(),
      namaKepalaFamily: namaKepalaFamily.trim(),
      keterangan: keterangan.trim(),
    };

    const res = await fetch(formId ? `/api/keluarga/${formId}` : "/api/keluarga", {
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
    if (!window.confirm("Hapus data keluarga ini?")) return;

    const res = await fetch(`/api/keluarga/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal menghapus data");
      return;
    }

    await loadData(page, q);
  }

  return (
    <section>
      <h2>Master Keluarga</h2>

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); loadData(1, q); }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kode keluarga / kepala keluarga"
        />
        <button type="submit">Cari</button>
      </form>

      <form className="form-grid" onSubmit={onSubmit}>
        <h3>{formId ? "Edit Keluarga" : "Tambah Keluarga"}</h3>

        <label htmlFor="kodeKeluarga">Kode Keluarga</label>
        <input id="kodeKeluarga" value={kodeKeluarga} onChange={(e) => setKodeKeluarga(e.target.value)} />

        <label htmlFor="namaKepalaFamily">Nama Kepala Keluarga</label>
        <input
          id="namaKepalaFamily"
          value={namaKepalaFamily}
          onChange={(e) => setNamaKepalaFamily(e.target.value)}
        />

        <label htmlFor="keterangan">Keterangan</label>
        <input id="keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />

        <div className="row-actions">
          <button type="submit">{formId ? "Update" : "Simpan"}</button>
          {formId ? <button type="button" className="btn-secondary" onClick={resetForm}>Batal</button> : null}
        </div>
      </form>

      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Kepala Keluarga</th>
              <th>Jumlah Santri</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.kodeKeluarga}</td>
                <td>{row.namaKepalaFamily || "-"}</td>
                <td>{row._count?.santri || 0}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => {
                      setFormId(row.id);
                      setKodeKeluarga(row.kodeKeluarga);
                      setNamaKepalaFamily(row.namaKepalaFamily || "");
                      setKeterangan(row.keterangan || "");
                    }}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => onDelete(row.id)}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={4}>{loading ? "Memuat..." : "Tidak ada data"}</td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button type="button" disabled={page <= 1} onClick={() => loadData(page - 1, q)}>Sebelumnya</button>
        <span>Halaman {page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => loadData(page + 1, q)}>Berikutnya</button>
      </div>
    </section>
  );
}
