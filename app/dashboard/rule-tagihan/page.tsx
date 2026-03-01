"use client";

import { FormEvent, useEffect, useState } from "react";
const formatNumber = (value: number) => value.toLocaleString("id-ID");
const parseNumberInput = (value: string) => Number((value || "").replace(/\./g, "")) || 0;
const formatNumberInput = (value: string) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
};

type Cakupan = "GLOBAL" | "KELAS" | "GENDER" | "SANTRI";
type Status = "DRAFT" | "PUBLISHED";

type Option = { id: string; kode?: string; nis?: string; nama: string };

type RuleRow = {
  id: string;
  nominal: number;
  cakupan: Cakupan;
  kelasId: string | null;
  santriId: string | null;
  gender: "L" | "P" | null;
  status: Status;
  komponen: { id: string; kode: string; nama: string };
  kelas?: { id: string; nama: string } | null;
  santri?: { id: string; nis: string; nama: string } | null;
};

type ListResponse = { data: RuleRow[]; page: number; totalPages: number };

export default function RuleTagihanPage() {
  const [rows, setRows] = useState<RuleRow[]>([]);
  const [komponenOptions, setKomponenOptions] = useState<Option[]>([]);
  const [kelasOptions, setKelasOptions] = useState<Option[]>([]);
  const [santriOptions, setSantriOptions] = useState<Option[]>([]);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState("");

  const [formId, setFormId] = useState<string | null>(null);
  const [komponenId, setKomponenId] = useState("");
  const [nominal, setNominal] = useState("100.000");
  const [cakupan, setCakupan] = useState<Cakupan>("GLOBAL");
  const [kelasId, setKelasId] = useState("");
  const [gender, setGender] = useState<"L" | "P">("L");
  const [santriId, setSantriId] = useState("");

  async function loadMaster() {
    const [kompRes, kelasRes, santriRes] = await Promise.all([
      fetch("/api/komponen-tagihan?page=1&pageSize=300"),
      fetch("/api/kelas?page=1&pageSize=300"),
      fetch("/api/santri?page=1&pageSize=500"),
    ]);

    const kompJson = await kompRes.json();
    const kelasJson = await kelasRes.json();
    const santriJson = await santriRes.json();

    if (!kompRes.ok) throw new Error(kompJson.message || "Gagal load komponen");
    if (!kelasRes.ok) throw new Error(kelasJson.message || "Gagal load kelas");
    if (!santriRes.ok) throw new Error(santriJson.message || "Gagal load santri");

    setKomponenOptions(kompJson.data);
    setKelasOptions(kelasJson.data);
    setSantriOptions(santriJson.data);

    if (!komponenId && kompJson.data[0]) setKomponenId(kompJson.data[0].id);
    if (!kelasId && kelasJson.data[0]) setKelasId(kelasJson.data[0].id);
    if (!santriId && santriJson.data[0]) setSantriId(santriJson.data[0].id);
  }

  async function loadData(nextPage = page, keyword = q) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "10", q: keyword });
    const res = await fetch(`/api/rule-tagihan?${params.toString()}`);
    const json = (await res.json()) as ListResponse;
    if (!res.ok) {
      setMessage((json as { message?: string }).message || "Gagal load data");
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
    setNominal("100.000");
    setCakupan("GLOBAL");
  }

  function buildPayload() {
    return {
      komponenId,
      nominal: parseNumberInput(nominal),
      cakupan,
      kelasId: cakupan === "KELAS" ? kelasId : null,
      gender: cakupan === "GENDER" ? gender : null,
      santriId: cakupan === "SANTRI" ? santriId : null,
    };
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const res = await fetch(formId ? `/api/rule-tagihan/${formId}` : "/api/rule-tagihan", {
      method: formId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });

    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal simpan rule");
      return;
    }

    resetForm();
    await loadData(page, q);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus rule ini?")) return;
    const res = await fetch(`/api/rule-tagihan/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal hapus rule");
      return;
    }
    await loadData(page, q);
  }

  async function onPublish(id: string) {
    const res = await fetch(`/api/rule-tagihan/${id}/publish`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Publish gagal");
      return;
    }
    await loadData(page, q);
  }

  async function onUnpublish(id: string) {
    const res = await fetch(`/api/rule-tagihan/${id}/unpublish`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Unpublish gagal");
      return;
    }
    await loadData(page, q);
  }

  function cakupanText(row: RuleRow): string {
    if (row.cakupan === "GLOBAL") return "GLOBAL";
    if (row.cakupan === "KELAS") return `KELAS: ${row.kelas?.nama || "-"}`;
    if (row.cakupan === "GENDER") return `GENDER: ${row.gender || "-"}`;
    return `SANTRI: ${row.santri?.nis || "-"}`;
  }

  return (
    <section>
      <h2>Rule Tagihan</h2>
      <p className="hint-text">Draft boleh bentrok. Publish akan ditolak jika bentrok dengan rule published lain.</p>

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); loadData(1, q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari komponen/kelas/santri" />
        <button type="submit">Cari</button>
      </form>

      <form className="form-grid" onSubmit={onSubmit}>
        <h3>{formId ? "Edit Rule (DRAFT)" : "Tambah Rule (DRAFT)"}</h3>

        <label htmlFor="komponen">Komponen</label>
        <select id="komponen" value={komponenId} onChange={(e) => setKomponenId(e.target.value)}>
          {komponenOptions.map((k) => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
        </select>

        <label htmlFor="nominal">Nominal</label>
        <input id="nominal" inputMode="numeric" value={nominal} onChange={(e) => setNominal(formatNumberInput(e.target.value))} />

        <label htmlFor="cakupan">Cakupan</label>
        <select id="cakupan" value={cakupan} onChange={(e) => setCakupan(e.target.value as Cakupan)}>
          <option value="GLOBAL">GLOBAL</option>
          <option value="KELAS">KELAS</option>
          <option value="GENDER">GENDER</option>
          <option value="SANTRI">SANTRI</option>
        </select>

        {cakupan === "KELAS" ? (
          <>
            <label htmlFor="kelas">Pilih Kelas</label>
            <select id="kelas" value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              {kelasOptions.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </>
        ) : null}

        {cakupan === "GENDER" ? (
          <>
            <label htmlFor="gender">Pilih Gender</label>
            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value as "L" | "P")}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </>
        ) : null}

        {cakupan === "SANTRI" ? (
          <>
            <label htmlFor="santri">Pilih Santri</label>
            <select id="santri" value={santriId} onChange={(e) => setSantriId(e.target.value)}>
              {santriOptions.map((s) => <option key={s.id} value={s.id}>{s.nis} - {s.nama}</option>)}
            </select>
          </>
        ) : null}

        <div className="row-actions">
          <button type="submit">{formId ? "Update" : "Simpan Draft"}</button>
          {formId ? <button type="button" className="btn-secondary" onClick={resetForm}>Batal</button> : null}
        </div>
      </form>

      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Komponen</th>
              <th>Cakupan</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.komponen.kode} - {row.komponen.nama}</td>
                <td>{cakupanText(row)}</td>
                <td>{formatNumber(row.nominal)}</td>
                <td>{row.status}</td>
                <td>
                  <div className="row-actions">
                    {row.status === "DRAFT" ? (
                      <>
                        <button type="button" onClick={() => {
                          setFormId(row.id);
                          setKomponenId(row.komponen.id);
                          setNominal(formatNumber(row.nominal));
                          setCakupan(row.cakupan);
                          setKelasId(row.kelasId || kelasOptions[0]?.id || "");
                          setGender((row.gender || "L") as "L" | "P");
                          setSantriId(row.santriId || santriOptions[0]?.id || "");
                        }}>Edit</button>
                        <button type="button" onClick={() => onPublish(row.id)}>Publish</button>
                      </>
                    ) : (
                      <button type="button" className="btn-secondary" onClick={() => onUnpublish(row.id)}>Unpublish</button>
                    )}
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
