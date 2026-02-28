"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TargetType = "SEMUA_SANTRI" | "GENDER" | "KELAS" | "SPESIFIK_SANTRI";
type Status = "SCHEDULED" | "ACTIVE" | "ENDED" | "INACTIVE";
type Komponen = { id: string; kode: string; nama: string; tipe: "BULANAN" | "INSIDENTAL" };
type Kelas = { id: string; nama: string };
type Santri = { id: string; nis: string; nama: string };

type Master = {
  id: string;
  targetType: TargetType;
  status: Status;
  autoGenerateEnabled: boolean;
  nominalGlobal: number | null;
  startBulan: number | null;
  startTahun: number | null;
  endBulan: number | null;
  endTahun: number | null;
  lastGeneratedPeriod: string | null;
  jatuhTempo: string;
  komponen: Komponen;
};

type PreviewRes = { targetCount: number; totalNominal: number; periodeKey: string };

export default function TagihanMasterPage() {
  const now = new Date();
  const [komponen, setKomponen] = useState<Komponen[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [santri, setSantri] = useState<Santri[]>([]);
  const [rows, setRows] = useState<Master[]>([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [komponenId, setKomponenId] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("SEMUA_SANTRI");
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);
  const [nominalGlobal, setNominalGlobal] = useState("100000");
  const [nominalL, setNominalL] = useState("100000");
  const [nominalP, setNominalP] = useState("100000");
  const [kelasNominal, setKelasNominal] = useState<Record<string, string>>({});
  const [spesifik, setSpesifik] = useState<Array<{ santriId: string; nominal: string }>>([]);

  const [startBulan, setStartBulan] = useState(String(now.getMonth() + 1));
  const [startTahun, setStartTahun] = useState(String(now.getFullYear()));
  const [endBulan, setEndBulan] = useState("12");
  const [endTahun, setEndTahun] = useState("2100");

  const [tanggalTerbit, setTanggalTerbit] = useState(now.toISOString().slice(0, 10));
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [previewMonth, setPreviewMonth] = useState(String(now.getMonth() + 1));
  const [previewYear, setPreviewYear] = useState(String(now.getFullYear()));
  const [preview, setPreview] = useState<PreviewRes | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState(false);

  const selectedKomponen = useMemo(
    () => komponen.find((k) => k.id === komponenId) || null,
    [komponen, komponenId],
  );

  const selectedMaster = useMemo(
    () => rows.find((r) => r.id === selectedMasterId) || null,
    [rows, selectedMasterId],
  );

  async function loadMaster() {
    const [kRes, klRes, sRes, mRes] = await Promise.all([
      fetch("/api/komponen-tagihan?page=1&pageSize=500"),
      fetch("/api/kelas?page=1&pageSize=500"),
      fetch("/api/santri?page=1&pageSize=1000"),
      fetch("/api/tagihan-master?page=1&pageSize=50"),
    ]);

    const [kJson, klJson, sJson, mJson] = await Promise.all([
      kRes.json(),
      klRes.json(),
      sRes.json(),
      mRes.json(),
    ]);

    if (!kRes.ok) throw new Error(kJson.message || "Gagal load komponen");
    if (!klRes.ok) throw new Error(klJson.message || "Gagal load kelas");
    if (!sRes.ok) throw new Error(sJson.message || "Gagal load santri");
    if (!mRes.ok) throw new Error(mJson.message || "Gagal load master tagihan");

    setKomponen(kJson.data);
    setKelas(klJson.data);
    setSantri(sJson.data);
    setRows(mJson.data);

    if (!komponenId && kJson.data[0]) setKomponenId(kJson.data[0].id);

    const nextKelasNominal: Record<string, string> = {};
    klJson.data.forEach((k: Kelas) => {
      nextKelasNominal[k.id] = kelasNominal[k.id] || "100000";
    });
    setKelasNominal(nextKelasNominal);
  }

  useEffect(() => {
    loadMaster().catch((err) => {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addSpesifikRow() {
    if (!santri[0]) return;
    setSpesifik((prev) => [...prev, { santriId: santri[0].id, nominal: "100000" }]);
  }

  function updateSpesifikRow(index: number, data: Partial<{ santriId: string; nominal: string }>) {
    setSpesifik((prev) => prev.map((item, i) => (i === index ? { ...item, ...data } : item)));
  }

  function removeSpesifikRow(index: number) {
    setSpesifik((prev) => prev.filter((_, i) => i !== index));
  }

  function buildDetails() {
    if (targetType === "SEMUA_SANTRI") return [];
    if (targetType === "GENDER") {
      return [
        { gender: "L", nominal: Number(nominalL) },
        { gender: "P", nominal: Number(nominalP) },
      ];
    }
    if (targetType === "KELAS") {
      return kelas.map((k) => ({ kelasId: k.id, nominal: Number(kelasNominal[k.id] || 0) }));
    }
    return spesifik.map((s) => ({ santriId: s.santriId, nominal: Number(s.nominal) }));
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const payload = {
        komponenId,
        targetType,
        autoGenerateEnabled,
        nominalGlobal: targetType === "SEMUA_SANTRI" ? Number(nominalGlobal) : null,
        startBulan: selectedKomponen?.tipe === "BULANAN" ? Number(startBulan) : null,
        startTahun: selectedKomponen?.tipe === "BULANAN" ? Number(startTahun) : null,
        endBulan: selectedKomponen?.tipe === "BULANAN" ? Number(endBulan) : null,
        endTahun: selectedKomponen?.tipe === "BULANAN" ? Number(endTahun) : null,
        tanggalTerbit: selectedKomponen?.tipe === "INSIDENTAL" ? tanggalTerbit : null,
        jatuhTempo,
        keterangan,
        details: buildDetails(),
      };

      const res = await fetch("/api/tagihan-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal membuat master tagihan");

      setMessage("Master tagihan berhasil disimpan");
      await loadMaster();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function onPreview() {
    if (!selectedMasterId) {
      setMessage("Pilih master tagihan terlebih dahulu");
      return;
    }

    setMessage("");
    const payload = selectedMaster?.komponen.tipe === "BULANAN"
      ? { periodeBulan: Number(previewMonth), periodeTahun: Number(previewYear) }
      : {};

    const res = await fetch(`/api/tagihan-master/${selectedMasterId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal preview");
      return;
    }

    setPreview(json);
  }

  async function onGenerateManual() {
    if (!selectedMasterId) {
      setMessage("Pilih master tagihan terlebih dahulu");
      return;
    }

    setMessage("");
    const payload = {
      confirmed: confirmGenerate,
      source: "manual",
      ...(selectedMaster?.komponen.tipe === "BULANAN"
        ? { periodeBulan: Number(previewMonth), periodeTahun: Number(previewYear) }
        : {}),
    };

    const res = await fetch(`/api/tagihan-master/${selectedMasterId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Generate gagal");
      return;
    }

    setMessage(
      `Generate selesai. Periode ${json.periodeKey}. Generated: ${json.generatedCount}, Skipped: ${json.skippedCount}`,
    );
    setConfirmGenerate(false);
    setPreview(null);
    await loadMaster();
  }

  return (
    <section>
      <h2>Pembuatan Tagihan</h2>
      <p className="hint-text">
        Bulanan: 1 master untuk rentang start-end bulan. Auto generate tanggal 1 (WIB) bisa ON/OFF.
      </p>

      <form className="form-grid" onSubmit={onCreate}>
        <label htmlFor="komponen">Komponen</label>
        <select id="komponen" value={komponenId} onChange={(e) => setKomponenId(e.target.value)}>
          {komponen.map((k) => (
            <option key={k.id} value={k.id}>{k.kode} - {k.nama} ({k.tipe})</option>
          ))}
        </select>

        <label htmlFor="targetType">Target Tagihan</label>
        <select id="targetType" value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)}>
          <option value="SEMUA_SANTRI">Semua Santri</option>
          <option value="GENDER">Gender</option>
          <option value="KELAS">Kelas</option>
          <option value="SPESIFIK_SANTRI">Spesifik Santri</option>
        </select>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={autoGenerateEnabled}
            onChange={(e) => setAutoGenerateEnabled(e.target.checked)}
          />
          Auto Generate ON (tanggal 1 WIB)
        </label>

        {targetType === "SEMUA_SANTRI" ? (
          <>
            <label htmlFor="nominalGlobal">Nominal Semua Santri</label>
            <input id="nominalGlobal" type="number" min="1" value={nominalGlobal} onChange={(e) => setNominalGlobal(e.target.value)} />
          </>
        ) : null}

        {targetType === "GENDER" ? (
          <>
            <label htmlFor="nominalL">Nominal Putra (L)</label>
            <input id="nominalL" type="number" min="1" value={nominalL} onChange={(e) => setNominalL(e.target.value)} />

            <label htmlFor="nominalP">Nominal Putri (P)</label>
            <input id="nominalP" type="number" min="1" value={nominalP} onChange={(e) => setNominalP(e.target.value)} />
          </>
        ) : null}

        {targetType === "KELAS" ? (
          <div className="stack-block">
            <strong>Nominal per Kelas (wajib semua kelas)</strong>
            {kelas.map((k) => (
              <div key={k.id} className="row-inline">
                <span>{k.nama}</span>
                <input
                  type="number"
                  min="1"
                  value={kelasNominal[k.id] || ""}
                  onChange={(e) => setKelasNominal((prev) => ({ ...prev, [k.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        ) : null}

        {targetType === "SPESIFIK_SANTRI" ? (
          <div className="stack-block">
            <div className="row-actions">
              <strong>Nominal Spesifik per Santri</strong>
              <button type="button" onClick={addSpesifikRow}>Tambah Santri</button>
            </div>
            {spesifik.map((item, idx) => (
              <div key={`${item.santriId}-${idx}`} className="row-inline">
                <select value={item.santriId} onChange={(e) => updateSpesifikRow(idx, { santriId: e.target.value })}>
                  {santri.map((s) => (
                    <option key={s.id} value={s.id}>{s.nis} - {s.nama}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.nominal}
                  onChange={(e) => updateSpesifikRow(idx, { nominal: e.target.value })}
                />
                <button type="button" className="btn-danger" onClick={() => removeSpesifikRow(idx)}>Hapus</button>
              </div>
            ))}
          </div>
        ) : null}

        {selectedKomponen?.tipe === "BULANAN" ? (
          <>
            <label htmlFor="startBulan">Start Bulan</label>
            <input id="startBulan" type="number" min="1" max="12" value={startBulan} onChange={(e) => setStartBulan(e.target.value)} />
            <label htmlFor="startTahun">Start Tahun</label>
            <input id="startTahun" type="number" min="2000" max="3000" value={startTahun} onChange={(e) => setStartTahun(e.target.value)} />
            <label htmlFor="endBulan">End Bulan</label>
            <input id="endBulan" type="number" min="1" max="12" value={endBulan} onChange={(e) => setEndBulan(e.target.value)} />
            <label htmlFor="endTahun">End Tahun</label>
            <input id="endTahun" type="number" min="2000" max="3000" value={endTahun} onChange={(e) => setEndTahun(e.target.value)} />
          </>
        ) : null}

        {selectedKomponen?.tipe === "INSIDENTAL" ? (
          <>
            <label htmlFor="tanggalTerbit">Tanggal Terbit</label>
            <input id="tanggalTerbit" type="date" value={tanggalTerbit} onChange={(e) => setTanggalTerbit(e.target.value)} />
          </>
        ) : null}

        <label htmlFor="jatuhTempo">Jatuh Tempo</label>
        <input id="jatuhTempo" type="date" value={jatuhTempo} onChange={(e) => setJatuhTempo(e.target.value)} />

        <label htmlFor="keterangan">Keterangan</label>
        <input id="keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />

        <div className="row-actions">
          <button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Master"}</button>
        </div>
      </form>

      {message ? <p className="error-text">{message}</p> : null}

      <div className="form-grid">
        <h3>Preview & Generate Manual</h3>

        <label htmlFor="selectedMaster">Pilih Master</label>
        <select id="selectedMaster" value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)}>
          <option value="">- pilih -</option>
          {rows.filter((r) => r.status !== "ENDED").map((r) => (
            <option key={r.id} value={r.id}>{r.komponen.kode} - {r.targetType} ({r.status})</option>
          ))}
        </select>

        {selectedMaster?.komponen.tipe === "BULANAN" ? (
          <>
            <label htmlFor="previewMonth">Periode Bulan (manual)</label>
            <input id="previewMonth" type="number" min="1" max="12" value={previewMonth} onChange={(e) => setPreviewMonth(e.target.value)} />
            <label htmlFor="previewYear">Periode Tahun (manual)</label>
            <input id="previewYear" type="number" min="2000" max="3000" value={previewYear} onChange={(e) => setPreviewYear(e.target.value)} />
          </>
        ) : null}

        <div className="row-actions">
          <button type="button" onClick={onPreview}>Preview</button>
        </div>

        {preview ? (
          <div className="hint-text">
            Target: {preview.targetCount} santri | Total: {preview.totalNominal} | Periode: {preview.periodeKey}
          </div>
        ) : null}

        <label className="checkbox-row">
          <input type="checkbox" checked={confirmGenerate} onChange={(e) => setConfirmGenerate(e.target.checked)} />
          Saya sudah cek preview dan siap generate
        </label>

        <div className="row-actions">
          <button type="button" onClick={onGenerateManual}>Generate Manual</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
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
                <td>{r.komponen.kode} - {r.komponen.nama}</td>
                <td>{r.targetType}</td>
                <td>{r.status}</td>
                <td>{r.autoGenerateEnabled ? "ON" : "OFF"}</td>
                <td>
                  {r.komponen.tipe === "BULANAN"
                    ? `${r.startBulan}/${r.startTahun} - ${r.endBulan}/${r.endTahun}`
                    : "Insidental"}
                </td>
                <td>{r.lastGeneratedPeriod || "-"}</td>
                <td>{new Date(r.jatuhTempo).toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={7}>Belum ada master tagihan</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
