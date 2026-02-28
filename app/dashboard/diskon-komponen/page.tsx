"use client";

import { FormEvent, useEffect, useState } from "react";

type Komponen = { id: string; kode: string; nama: string };
type Kategori = { id: string; kode: string; nama: string; eligibilityRule: string };

type DiskonKomponen = {
  id: string;
  persentase: number;
  komponen: Komponen;
  kategori: Kategori;
};

type ListResponse = { data: DiskonKomponen[]; page: number; totalPages: number };

export default function DiskonKomponenPage() {
  const [rows, setRows] = useState<DiskonKomponen[]>([]);
  const [komponenOptions, setKomponenOptions] = useState<Komponen[]>([]);
  const [kategoriOptions, setKategoriOptions] = useState<Kategori[]>([]);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState("");

  const [formId, setFormId] = useState<string | null>(null);
  const [komponenId, setKomponenId] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [persentase, setPersentase] = useState("10");

  async function loadMaster() {
    const [kompRes, katRes] = await Promise.all([
      fetch("/api/komponen-tagihan?page=1&pageSize=200"),
      fetch("/api/diskon-kategori?page=1&pageSize=200"),
    ]);

    const kompJson = await kompRes.json();
    const katJson = await katRes.json();

    if (!kompRes.ok) throw new Error(kompJson.message || "Gagal load komponen");
    if (!katRes.ok) throw new Error(katJson.message || "Gagal load kategori");

    setKomponenOptions(kompJson.data);
    setKategoriOptions(katJson.data);

    if (!komponenId && kompJson.data[0]) setKomponenId(kompJson.data[0].id);
    if (!kategoriId && katJson.data[0]) setKategoriId(katJson.data[0].id);
  }

  async function loadData(nextPage = page, keyword = q) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "10", q: keyword });
    const res = await fetch(`/api/diskon-komponen?${params.toString()}`);
    const json = (await res.json()) as ListResponse;
    if (!res.ok) {
      setMessage((json as { message?: string }).message || "Gagal load");
      return;
    }

    setRows(json.data);
    setPage(json.page || 1);
    setTotalPages(json.totalPages || 1);
  }

  useEffect(() => {
    Promise.all([loadMaster(), loadData(1, "")]).catch((err) => {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setFormId(null);
    setPersentase("10");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const payload = {
      komponenId,
      kategoriId,
      persentase: Number(persentase),
    };

    const res = await fetch(formId ? `/api/diskon-komponen/${formId}` : "/api/diskon-komponen", {
      method: formId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal menyimpan");
      return;
    }

    resetForm();
    await loadData(page, q);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus konfigurasi diskon ini?")) return;
    const res = await fetch(`/api/diskon-komponen/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal menghapus");
      return;
    }

    await loadData(page, q);
  }

  return (
    <section>
      <h2>Konfigurasi Diskon per Komponen</h2>

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); loadData(1, q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari komponen / kategori" />
        <button type="submit">Cari</button>
      </form>

      <form className="form-grid" onSubmit={onSubmit}>
        <h3>{formId ? "Edit Konfigurasi" : "Tambah Konfigurasi"}</h3>

        <label htmlFor="komponen">Komponen</label>
        <select id="komponen" value={komponenId} onChange={(e) => setKomponenId(e.target.value)}>
          {komponenOptions.map((k) => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
        </select>

        <label htmlFor="kategori">Kategori Diskon</label>
        <select id="kategori" value={kategoriId} onChange={(e) => setKategoriId(e.target.value)}>
          {kategoriOptions.map((k) => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
        </select>

        <label htmlFor="persentase">Persentase</label>
        <input
          id="persentase"
          type="number"
          min="0.01"
          max="100"
          step="0.01"
          value={persentase}
          onChange={(e) => setPersentase(e.target.value)}
        />

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
              <th>Komponen</th>
              <th>Kategori</th>
              <th>Rule</th>
              <th>Persentase</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.komponen.kode} - {row.komponen.nama}</td>
                <td>{row.kategori.kode} - {row.kategori.nama}</td>
                <td>{row.kategori.eligibilityRule}</td>
                <td>{row.persentase}%</td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => {
                      setFormId(row.id);
                      setKomponenId(row.komponen.id);
                      setKategoriId(row.kategori.id);
                      setPersentase(String(row.persentase));
                    }}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => onDelete(row.id)}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={5}>Tidak ada data</td></tr> : null}
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
