"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/app/dashboard/_components/primitives";

type TargetType = "SEMUA_SANTRI" | "GENDER" | "KELAS" | "SPESIFIK_SANTRI" | "SANTRI_BARU";
type Status = "SCHEDULED" | "ACTIVE" | "ENDED" | "INACTIVE";
type Komponen = { id: string; kode: string; nama: string; tipe: "BULANAN" | "INSIDENTAL" | "SANTRI_BARU" };

type Master = {
  id: string;
  namaTagihan: string | null;
  targetType: TargetType;
  status: Status;
  autoGenerateEnabled: boolean;
  startBulan: number | null;
  startTahun: number | null;
  endBulan: number | null;
  endTahun: number | null;
  lastGeneratedPeriod: string | null;
  jatuhTempo: string;
  komponen: Komponen;
};

type PreviewRes = {
  targetCount: number;
  totalNominal: number;
  totalNominalAwal: number;
  totalDiskon: number;
  periodeKey: string;
  skippedDuplicateCount: number;
  previewLimit: number;
  preview: Array<{
    santriId: string;
    nis: string;
    nama: string;
    nominalAwal: number;
    persentaseDiskon: number;
    nominalDiskon: number;
    nominalAkhir: number;
    kategoriDiskon: { id: string; kode: string; nama: string } | null;
    picUserId: string | null;
    picUsername: string | null;
  }>;
};

const formatNumber = (value: number) => value.toLocaleString("id-ID");

export default function GenerateTagihanPage() {
  const now = new Date();
  const [rows, setRows] = useState<Master[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [previewMonth, setPreviewMonth] = useState(String(now.getMonth() + 1));
  const [previewYear, setPreviewYear] = useState(String(now.getFullYear()));
  const [preview, setPreview] = useState<PreviewRes | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState(false);

  const selectedMaster = useMemo(
    () => rows.find((r) => r.id === selectedMasterId) || null,
    [rows, selectedMasterId],
  );

  async function loadMaster() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/tagihan-master?page=1&pageSize=200");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal load master tagihan");
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaster().catch(() => undefined);
  }, []);

  async function onPreview() {
    if (!selectedMasterId) {
      setMessage("Pilih master tagihan terlebih dahulu");
      return;
    }

    setLoading(true);
    setMessage("");
    const payload = selectedMaster?.komponen.tipe === "BULANAN"
      ? { periodeBulan: Number(previewMonth), periodeTahun: Number(previewYear) }
      : {};

    try {
      const res = await fetch(`/api/tagihan-master/${selectedMasterId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal preview");
      setPreview(json);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal preview");
    } finally {
      setLoading(false);
    }
  }

  async function onGenerateManual() {
    if (!selectedMasterId) {
      setMessage("Pilih master tagihan terlebih dahulu");
      return;
    }

    setLoading(true);
    setMessage("");
    const payload = {
      confirmed: confirmGenerate,
      source: "manual",
      ...(selectedMaster?.komponen.tipe === "BULANAN"
        ? { periodeBulan: Number(previewMonth), periodeTahun: Number(previewYear) }
        : {}),
    };

    try {
      const res = await fetch(`/api/tagihan-master/${selectedMasterId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Generate gagal");

      setMessage(
        `Generate selesai. Periode ${json.periodeKey}. Generated: ${json.generatedCount}, Skipped: ${json.skippedCount}`,
      );
      setConfirmGenerate(false);
      setPreview(null);
      await loadMaster();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Generate gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Preview &amp; Generate Tagihan</h2>
          <p>Lakukan pengecekan target dan jalankan generate manual dari master tagihan yang aktif.</p>
        </div>
        <div className="row-actions">
          <Link href="/dashboard/tagihan-master" className="btn-secondary">Pembuatan Tagihan Master</Link>
          <button type="button" className="btn-secondary" onClick={() => loadMaster()} disabled={loading}>
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </header>

      <Card>
        {message ? <p className="error-text">{message}</p> : null}

        <div className="form-grid">
          <h3>Preview &amp; Generate Manual</h3>

          <label htmlFor="selectedMaster">Pilih Master</label>
          <select
            id="selectedMaster"
            value={selectedMasterId}
            onChange={(e) => {
              setSelectedMasterId(e.target.value);
              setPreview(null);
              setConfirmGenerate(false);
            }}
          >
            <option value="">- pilih -</option>
            {rows.filter((r) => r.status !== "ENDED").map((r) => (
              <option key={r.id} value={r.id}>
                {r.namaTagihan || `${r.komponen.kode} - ${r.komponen.nama}`} ({r.status})
              </option>
            ))}
          </select>

          {selectedMaster?.komponen.tipe === "BULANAN" ? (
            <>
              <label htmlFor="previewMonth">Periode Bulan (manual)</label>
              <input
                id="previewMonth"
                type="number"
                min="1"
                max="12"
                value={previewMonth}
                onChange={(e) => setPreviewMonth(e.target.value)}
              />
              <label htmlFor="previewYear">Periode Tahun (manual)</label>
              <input
                id="previewYear"
                type="number"
                min="2000"
                max="3000"
                value={previewYear}
                onChange={(e) => setPreviewYear(e.target.value)}
              />
            </>
          ) : null}

          <div className="row-actions">
            <button type="button" onClick={onPreview} disabled={loading || !selectedMasterId}>Preview</button>
          </div>

          {preview ? (
            <div className="stack-block">
              <div className="hint-text">
                Target: {formatNumber(preview.targetCount)} santri | Awal: {formatNumber(preview.totalNominalAwal)} | Diskon: {formatNumber(preview.totalDiskon)} | Akhir: {formatNumber(preview.totalNominal)} | Periode: {preview.periodeKey}
              </div>
              <div className="hint-text">
                Menampilkan {formatNumber(preview.preview.length)} dari {formatNumber(preview.targetCount)} calon tagihan (duplikat dilewati: {formatNumber(preview.skippedDuplicateCount)})
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>NIS</th>
                      <th>Nama Santri</th>
                      <th>Nominal Awal</th>
                      <th>Diskon%</th>
                      <th>Potongan</th>
                      <th>Nominal Akhir</th>
                      <th>Kategori</th>
                      <th>PIC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row) => (
                      <tr key={row.santriId}>
                        <td>{row.nis}</td>
                        <td>{row.nama}</td>
                        <td>{formatNumber(row.nominalAwal)}</td>
                        <td>{formatNumber(row.persentaseDiskon)}</td>
                        <td>{formatNumber(row.nominalDiskon)}</td>
                        <td>{formatNumber(row.nominalAkhir)}</td>
                        <td>{row.kategoriDiskon ? `${row.kategoriDiskon.kode} - ${row.kategoriDiskon.nama}` : "-"}</td>
                        <td>{row.picUsername || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <label className="checkbox-row">
            <input type="checkbox" checked={confirmGenerate} onChange={(e) => setConfirmGenerate(e.target.checked)} />
            Saya sudah cek preview dan siap generate
          </label>

          <div className="row-actions">
            <button type="button" onClick={onGenerateManual} disabled={loading || !selectedMasterId}>Generate Manual</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Tagihan</th>
                <th>Komponen</th>
                <th>Target</th>
                <th>Status</th>
                <th>Auto</th>
                <th>Range</th>
                <th>Last Generated</th>
                <th>Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.namaTagihan || "-"}</td>
                  <td>{r.komponen.kode} - {r.komponen.nama}</td>
                  <td>{r.targetType}</td>
                  <td>{r.status}</td>
                  <td>{r.autoGenerateEnabled ? "ON" : "OFF"}</td>
                  <td>
                    {r.komponen.tipe === "BULANAN"
                      ? `${r.startBulan}/${r.startTahun} - ${r.endBulan}/${r.endTahun}`
                      : r.komponen.tipe === "SANTRI_BARU"
                        ? "Santri Baru"
                        : "Insidental"}
                  </td>
                  <td>{r.lastGeneratedPeriod || "-"}</td>
                  <td>{new Date(r.jatuhTempo).toISOString().slice(0, 10)}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr><td colSpan={8}>Belum ada master tagihan</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
