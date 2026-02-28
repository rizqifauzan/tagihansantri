"use client";

import { FormEvent, useEffect, useState } from "react";

type KelasOption = {
  id: string;
  nama: string;
};

type KeluargaOption = {
  id: string;
  kodeKeluarga: string;
};

type Santri = {
  id: string;
  nis: string;
  nama: string;
  status: "AKTIF" | "NONAKTIF" | "LULUS" | "KELUAR";
  gender: "L" | "P";
  kelasId: string;
  keluargaId: string | null;
  yatim: boolean;
  keluargaNdalem: boolean;
  tanggalMasuk: string | null;
  tanggalKeluar: string | null;
  kelas: KelasOption;
  keluarga?: KeluargaOption | null;
};

type SantriListResponse = {
  data: Santri[];
  page: number;
  totalPages: number;
};

const STATUS_OPTIONS = ["AKTIF", "NONAKTIF", "LULUS", "KELUAR"] as const;
const GENDER_OPTIONS = ["L", "P"] as const;

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function SantriPage() {
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [keluargaOptions, setKeluargaOptions] = useState<KeluargaOption[]>([]);
  const [rows, setRows] = useState<Santri[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formId, setFormId] = useState<string | null>(null);
  const [currentNis, setCurrentNis] = useState("");
  const [nama, setNama] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("AKTIF");
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number]>("L");
  const [kelasId, setKelasId] = useState("");
  const [keluargaId, setKeluargaId] = useState("");
  const [yatim, setYatim] = useState(false);
  const [keluargaNdalem, setKeluargaNdalem] = useState(false);
  const [tanggalMasuk, setTanggalMasuk] = useState("");
  const [tanggalKeluar, setTanggalKeluar] = useState("");

  async function loadKelas() {
    const params = new URLSearchParams({ page: "1", pageSize: "200", active: "true" });
    const res = await fetch(`/api/kelas?${params.toString()}`);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || "Gagal mengambil data kelas");
    }

    setKelasOptions(json.data);
  }

  async function loadData(nextPage = page, keyword = q) {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "10",
        q: keyword,
      });

      const res = await fetch(`/api/santri?${params.toString()}`);
      const json = (await res.json()) as SantriListResponse;
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

  async function loadKeluarga() {
    const params = new URLSearchParams({ page: "1", pageSize: "300" });
    const res = await fetch(`/api/keluarga?${params.toString()}`);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || "Gagal mengambil data keluarga");
    }

    setKeluargaOptions(json.data);
  }

  useEffect(() => {
    Promise.all([loadKelas(), loadKeluarga(), loadData(1, "")]).catch((err) => {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!kelasId && kelasOptions[0]) {
      setKelasId(kelasOptions[0].id);
    }
  }, [kelasId, kelasOptions]);

  function resetForm() {
    setFormId(null);
    setCurrentNis("");
    setNama("");
    setStatus("AKTIF");
    setGender("L");
    setKelasId(kelasOptions[0]?.id || "");
    setKeluargaId("");
    setYatim(false);
    setKeluargaNdalem(false);
    setTanggalMasuk("");
    setTanggalKeluar("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (nama.trim().length < 2) {
      setMessage("Nama minimal 2 karakter");
      return;
    }
    if (!kelasId) {
      setMessage("Pilih kelas terlebih dahulu");
      return;
    }

    const payload = {
      nama: nama.trim(),
      status,
      gender,
      kelasId,
      keluargaId: keluargaId || null,
      yatim,
      keluargaNdalem,
      tanggalMasuk: tanggalMasuk || null,
      tanggalKeluar: tanggalKeluar || null,
    };

    const res = await fetch(formId ? `/api/santri/${formId}` : "/api/santri", {
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
    const ok = window.confirm("Hapus data santri ini?");
    if (!ok) return;

    const res = await fetch(`/api/santri/${id}`, { method: "DELETE" });
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.message || "Gagal menghapus data");
      return;
    }

    await loadData(page, q);
  }

  return (
    <section>
      <h2>Master Santri</h2>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          loadData(1, q);
        }}
      >
        <input
          type="text"
          placeholder="Cari nama, NIS, atau kelas"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Cari</button>
      </form>

      <form className="form-grid" onSubmit={onSubmit}>
        <h3>{formId ? "Edit Santri" : "Tambah Santri"}</h3>

        {!formId ? (
          <p className="hint-text">NIS dibuat otomatis oleh sistem saat data disimpan.</p>
        ) : (
          <p className="hint-text">
            NIS: <strong>{currentNis || "-"}</strong> (tidak bisa diubah)
          </p>
        )}

        <label htmlFor="nama">Nama</label>
        <input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} required />

        <label htmlFor="kelas">Kelas</label>
        <select id="kelas" value={kelasId} onChange={(e) => setKelasId(e.target.value)} required>
          {kelasOptions.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>

        <label htmlFor="keluarga">Keluarga</label>
        <select id="keluarga" value={keluargaId} onChange={(e) => setKeluargaId(e.target.value)}>
          <option value="">- Tidak ada keluarga -</option>
          {keluargaOptions.map((k) => (
            <option key={k.id} value={k.id}>
              {k.kodeKeluarga}
            </option>
          ))}
        </select>

        <label htmlFor="gender">Gender</label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value as (typeof GENDER_OPTIONS)[number])}
        >
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>

        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label htmlFor="tanggalMasuk">Tanggal Masuk</label>
        <input
          id="tanggalMasuk"
          type="date"
          value={tanggalMasuk}
          onChange={(e) => setTanggalMasuk(e.target.value)}
        />

        <label htmlFor="tanggalKeluar">Tanggal Keluar</label>
        <input
          id="tanggalKeluar"
          type="date"
          value={tanggalKeluar}
          onChange={(e) => setTanggalKeluar(e.target.value)}
        />

        <label className="checkbox-row">
          <input type="checkbox" checked={yatim} onChange={(e) => setYatim(e.target.checked)} />
          Yatim
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={keluargaNdalem}
            onChange={(e) => setKeluargaNdalem(e.target.checked)}
          />
          Keluarga Ndalem
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
              <th>NIS</th>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Keluarga</th>
              <th>Gender</th>
              <th>Status</th>
              <th>Flag</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.nis}</td>
                <td>{row.nama}</td>
                <td>{row.kelas?.nama || "-"}</td>
                <td>{row.keluarga?.kodeKeluarga || "-"}</td>
                <td>{row.gender}</td>
                <td>{row.status}</td>
                <td>
                  {[row.yatim ? "Yatim" : "", row.keluargaNdalem ? "Ndalem" : ""]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setFormId(row.id);
                        setCurrentNis(row.nis);
                        setNama(row.nama);
                        setStatus(row.status);
                        setGender(row.gender);
                        setKelasId(row.kelasId);
                        setKeluargaId(row.keluargaId || "");
                        setYatim(row.yatim);
                        setKeluargaNdalem(row.keluargaNdalem);
                        setTanggalMasuk(toDateInputValue(row.tanggalMasuk));
                        setTanggalKeluar(toDateInputValue(row.tanggalKeluar));
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
                <td colSpan={8}>{loading ? "Memuat..." : "Tidak ada data"}</td>
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
