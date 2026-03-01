"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, EmptyState, Modal, Popover, Tabs } from "@/app/dashboard/_components/primitives";
import { useToast } from "@/app/dashboard/_components/toast";

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

type SortKey = "nama" | "nis" | "kelas";

export default function SantriPage() {
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [keluargaOptions, setKeluargaOptions] = useState<KeluargaOption[]>([]);
  const [rows, setRows] = useState<Santri[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("nama");
  const [sortAsc, setSortAsc] = useState(true);
  const [statusTab, setStatusTab] = useState("SEMUA");
  const [compactMode, setCompactMode] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
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

  const { pushToast } = useToast();

  async function loadKelas() {
    const params = new URLSearchParams({ page: "1", pageSize: "200", active: "true" });
    const res = await fetch(`/api/kelas?${params.toString()}`);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || "Gagal mengambil data kelas");
    }

    setKelasOptions(json.data);
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

  async function loadData(nextPage = page, keyword = q) {
    setLoading(true);
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
      setSelectedIds([]);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([loadKelas(), loadKeluarga(), loadData(1, "")]).catch((err) => {
      pushToast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
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

  function openCreateModal() {
    resetForm();
    setFormOpen(true);
  }

  function openEditModal(row: Santri) {
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
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (nama.trim().length < 2) {
      pushToast("Nama minimal 2 karakter", "warning");
      return;
    }
    if (!kelasId) {
      pushToast("Pilih kelas terlebih dahulu", "warning");
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
      pushToast(json.message || "Gagal menyimpan data", "error");
      return;
    }

    pushToast(formId ? "Data santri diperbarui" : "Santri baru ditambahkan", "success");
    setFormOpen(false);
    resetForm();
    await loadData(page, q);
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Hapus data santri ini?");
    if (!ok) return;

    const prevRows = rows;
    setRows((current) => current.filter((item) => item.id !== id));

    const res = await fetch(`/api/santri/${id}`, { method: "DELETE" });
    const json = await res.json();

    if (!res.ok) {
      setRows(prevRows);
      pushToast(json.message || "Gagal menghapus data", "error");
      return;
    }

    pushToast("Data santri dihapus", "success");
  }

  async function bulkDelete() {
    if (!selectedIds.length) return;
    const ok = window.confirm(`Hapus ${selectedIds.length} data terpilih?`);
    if (!ok) return;

    const prevRows = rows;
    setRows((current) => current.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);

    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/santri/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Gagal menghapus sebagian data");
      }
      pushToast("Bulk hapus berhasil", "success");
    } catch (error) {
      setRows(prevRows);
      pushToast(error instanceof Error ? error.message : "Terjadi kesalahan", "error");
    }
  }

  const filteredRows = useMemo(() => {
    let current = rows;
    if (statusTab !== "SEMUA") {
      current = current.filter((row) => row.status === statusTab);
    }

    const sorted = [...current].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortBy === "nama") return a.nama.localeCompare(b.nama) * dir;
      if (sortBy === "nis") return a.nis.localeCompare(b.nis) * dir;
      return (a.kelas?.nama || "").localeCompare(b.kelas?.nama || "") * dir;
    });

    return sorted;
  }, [rows, sortAsc, sortBy, statusTab]);

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
          <h2>Data Santri</h2>
          <p>Kelola data santri dengan tampilan ringkas untuk pemakaian harian.</p>
        </div>
        <button type="button" onClick={openCreateModal}>Tambah Santri</button>
      </header>

      <Card>
        <div className="toolbar-row">
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
            <button type="submit" disabled={loading}>Cari</button>
          </form>

          <div className="toolbar-actions">
            <Tabs
              tabs={[
                { label: "Semua", value: "SEMUA" },
                { label: "Aktif", value: "AKTIF" },
                { label: "Nonaktif", value: "NONAKTIF" },
              ]}
              value={statusTab}
              onChange={setStatusTab}
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
            <span>{selectedIds.length} item dipilih</span>
            <button type="button" className="btn-danger" onClick={bulkDelete}>Hapus Terpilih</button>
            <button type="button" className="btn-secondary" onClick={() => setSelectedIds([])}>Reset</button>
          </div>
        ) : null}

        {!filteredRows.length ? (
          <EmptyState
            title="Belum ada data santri"
            description="Mulai dengan menambahkan data santri pertama agar proses tagihan bisa berjalan."
            cta="Tambah Santri"
            onAction={openCreateModal}
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
                    <button type="button" className="th-sort" onClick={() => { setSortBy("nis"); setSortAsc((s) => sortBy === "nis" ? !s : true); }}>
                      NIS
                    </button>
                  </th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => { setSortBy("nama"); setSortAsc((s) => sortBy === "nama" ? !s : true); }}>
                      Nama
                    </button>
                  </th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => { setSortBy("kelas"); setSortAsc((s) => sortBy === "kelas" ? !s : true); }}>
                      Kelas
                    </button>
                  </th>
                  <th>Wali</th>
                  <th>Status</th>
                  <th>Flag</th>
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
                        aria-label={`Pilih ${row.nama}`}
                      />
                    </td>
                    <td>{row.nis}</td>
                    <td>{row.nama}</td>
                    <td>{row.kelas?.nama || "-"}</td>
                    <td>{row.keluarga?.kodeKeluarga || "-"}</td>
                    <td><span className="status-badge">{row.status}</span></td>
                    <td>
                      {[row.yatim ? "Yatim" : "", row.keluargaNdalem ? "Ndalem" : ""]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
                        <button type="button" className="btn-danger" onClick={() => onDelete(row.id)}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
        title={formId ? "Edit Santri" : "Tambah Santri"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button type="submit" form="santri-form">Simpan</button>
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Batal</button>
          </>
        }
      >
        <form id="santri-form" className="form-grid" onSubmit={onSubmit}>
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
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>

          <label htmlFor="keluarga">Keluarga</label>
          <select id="keluarga" value={keluargaId} onChange={(e) => setKeluargaId(e.target.value)}>
            <option value="">- Tidak ada keluarga -</option>
            {keluargaOptions.map((k) => (
              <option key={k.id} value={k.id}>{k.kodeKeluarga}</option>
            ))}
          </select>

          <label htmlFor="gender">Gender</label>
          <select id="gender" value={gender} onChange={(e) => setGender(e.target.value as (typeof GENDER_OPTIONS)[number])}>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>

          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label htmlFor="tanggalMasuk">Tanggal Masuk</label>
          <input id="tanggalMasuk" type="date" value={tanggalMasuk} onChange={(e) => setTanggalMasuk(e.target.value)} />

          <label htmlFor="tanggalKeluar">Tanggal Keluar</label>
          <input id="tanggalKeluar" type="date" value={tanggalKeluar} onChange={(e) => setTanggalKeluar(e.target.value)} />

          <label className="checkbox-row">
            <input type="checkbox" checked={yatim} onChange={(e) => setYatim(e.target.checked)} />
            Yatim
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={keluargaNdalem} onChange={(e) => setKeluargaNdalem(e.target.checked)} />
            Keluarga Ndalem
          </label>
        </form>
      </Modal>
    </section>
  );
}
