"use client";

import { FormEvent, useEffect, useState } from "react";

type Rule = "NONE" | "SIBLING_FAMILY" | "SANTRI_YATIM" | "SANTRI_KELUARGA_NDALEM";

type Kategori = {
  id: string;
  kode: string;
  nama: string;
  eligibilityRule: Rule;
  siblingCountMin: number | null;
  active: boolean;
  _count?: { diskonKomponen: number };
};

type ListResponse = { data: Kategori[]; page: number; totalPages: number };

const RULE_OPTIONS: Rule[] = ["SIBLING_FAMILY", "SANTRI_YATIM", "SANTRI_KELUARGA_NDALEM", "NONE"];

export default function DiskonKategoriPage() {
  const [rows, setRows] = useState<Kategori[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState("");

  const [formId, setFormId] = useState<string | null>(null);
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [eligibilityRule, setEligibilityRule] = useState<Rule>("SIBLING_FAMILY");
  const [siblingCountMin, setSiblingCountMin] = useState("2");
  const [active, setActive] = useState(true);

  async function loadData(nextPage = page, keyword = q) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "10", q: keyword });
    const res = await fetch(`/api/diskon-kategori?${params.toString()}`);
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
    loadData(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setFormId(null);
    setKode("");
    setNama("");
    setEligibilityRule("SIBLING_FAMILY");
    setSiblingCountMin("2");
    setActive(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const payload = {
      kode: kode.trim().toUpperCase(),
      nama: nama.trim(),
      eligibilityRule,
      siblingCountMin:
        eligibilityRule === "SIBLING_FAMILY" ? Number(siblingCountMin) : null,
      active,
    };

    const res = await fetch(formId ? `/api/diskon-kategori/${formId}` : "/api/diskon-kategori", {
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
    if (!window.confirm("Hapus kategori diskon ini?")) return;
    const res = await fetch(`/api/diskon-kategori/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal menghapus");
      return;
    }

    await loadData(page, q);
  }

  return (
    <section>
      <h2>Kategori Diskon</h2>

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); loadData(1, q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama kategori" />
        <button type="submit">Cari</button>
      </form>

      <form className="form-grid" onSubmit={onSubmit}>
        <h3>{formId ? "Edit Kategori" : "Tambah Kategori"}</h3>

        <label htmlFor="kode">Kode</label>
        <input id="kode" value={kode} onChange={(e) => setKode(e.target.value)} required />

        <label htmlFor="nama">Nama</label>
        <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} required />

        <label htmlFor="rule">Eligibility Rule</label>
        <select id="rule" value={eligibilityRule} onChange={(e) => setEligibilityRule(e.target.value as Rule)}>
          {RULE_OPTIONS.map((rule) => <option key={rule} value={rule}>{rule}</option>)}
        </select>

        {eligibilityRule === "SIBLING_FAMILY" ? (
          <>
            <label htmlFor="siblingCountMin">Jumlah Saudara Minimal</label>
            <select
              id="siblingCountMin"
              value={siblingCountMin}
              onChange={(e) => setSiblingCountMin(e.target.value)}
            >
              <option value="2">2 Bersaudara</option>
              <option value="3">3 Bersaudara</option>
              <option value="4">4 Bersaudara atau Lebih</option>
            </select>
          </>
        ) : null}

        <label className="checkbox-row">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Aktif
        </label>

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
              <th>Nama</th>
              <th>Rule</th>
              <th>Min Saudara</th>
              <th>Status</th>
              <th>Dipakai</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.kode}</td>
                <td>{row.nama}</td>
                <td>{row.eligibilityRule}</td>
                <td>{row.siblingCountMin ?? "-"}</td>
                <td>{row.active ? "Aktif" : "Nonaktif"}</td>
                <td>{row._count?.diskonKomponen || 0}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => {
                      setFormId(row.id);
                      setKode(row.kode);
                      setNama(row.nama);
                      setEligibilityRule(row.eligibilityRule);
                      setSiblingCountMin(String(row.siblingCountMin || 2));
                      setActive(row.active);
                    }}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => onDelete(row.id)}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={7}>Tidak ada data</td></tr> : null}
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
