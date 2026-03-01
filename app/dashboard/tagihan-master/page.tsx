"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TargetType = "SEMUA_SANTRI" | "GENDER" | "KELAS" | "SPESIFIK_SANTRI" | "SANTRI_BARU";
type Status = "SCHEDULED" | "ACTIVE" | "ENDED" | "INACTIVE";
type Komponen = { id: string; kode: string; nama: string; tipe: "BULANAN" | "INSIDENTAL" | "SANTRI_BARU" };
type Kelas = { id: string; nama: string };
type Santri = { id: string; nis: string; nama: string };
type UserOption = { id: string; username: string; active: boolean };
type MasterDetail = { gender: "L" | "P" | null; kelasId: string | null; santriId: string | null; nominal: number };

type Master = {
  id: string;
  namaTagihan: string | null;
  targetType: TargetType;
  status: Status;
  autoGenerateEnabled: boolean;
  picMode: "GLOBAL" | "BY_GENDER" | "BY_KELAS";
  picGlobalUserId: string | null;
  picPutraUserId: string | null;
  picPutriUserId: string | null;
  picKelas: Array<{
    kelasId: string;
    picUserId: string | null;
    kelas: { id: string; nama: string };
    picUser: { id: string; username: string; active: boolean } | null;
  }>;
  nominalGlobal: number | null;
  startBulan: number | null;
  startTahun: number | null;
  endBulan: number | null;
  endTahun: number | null;
  lastGeneratedPeriod: string | null;
  jatuhTempoHari: number | null;
  tanggalTerbit: string | null;
  jatuhTempo: string;
  keterangan: string | null;
  details: MasterDetail[];
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

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultJatuhTempoBulanan(base: Date): string {
  return toDateInputValue(new Date(base.getFullYear(), base.getMonth(), 10));
}

function defaultJatuhTempoInsidental(base: Date): string {
  const next30Days = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 30);
  return toDateInputValue(next30Days);
}
const formatNumber = (value: number) => value.toLocaleString("id-ID");
const parseNumberInput = (value: string) => Number((value || "").replace(/\./g, "")) || 0;
const formatNumberInput = (value: string) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
};

export default function TagihanMasterPage() {
  const now = new Date();
  const [komponen, setKomponen] = useState<Komponen[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [santri, setSantri] = useState<Santri[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [rows, setRows] = useState<Master[]>([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [komponenId, setKomponenId] = useState("");
  const [namaTagihan, setNamaTagihan] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("SEMUA_SANTRI");
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);
  const [picMode, setPicMode] = useState<"GLOBAL" | "BY_GENDER" | "BY_KELAS">("GLOBAL");
  const [picGlobalUserId, setPicGlobalUserId] = useState("");
  const [picPutraUserId, setPicPutraUserId] = useState("");
  const [picPutriUserId, setPicPutriUserId] = useState("");
  const [picKelasUser, setPicKelasUser] = useState<Record<string, string>>({});
  const [nominalGlobal, setNominalGlobal] = useState("100.000");
  const [nominalL, setNominalL] = useState("100.000");
  const [nominalP, setNominalP] = useState("100.000");
  const [kelasNominal, setKelasNominal] = useState<Record<string, string>>({});
  const [spesifik, setSpesifik] = useState<Array<{ santriId: string; nominal: string }>>([]);

  const [startBulan, setStartBulan] = useState(String(now.getMonth() + 1));
  const [startTahun, setStartTahun] = useState(String(now.getFullYear()));
  const [endBulan, setEndBulan] = useState("12");
  const [endTahun, setEndTahun] = useState("2100");
  const [jatuhTempoHari, setJatuhTempoHari] = useState("30");

  const [tanggalTerbit, setTanggalTerbit] = useState(toDateInputValue(now));
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [previewMonth, setPreviewMonth] = useState(String(now.getMonth() + 1));
  const [previewYear, setPreviewYear] = useState(String(now.getFullYear()));
  const [preview, setPreview] = useState<PreviewRes | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [editingId, setEditingId] = useState("");

  const selectedKomponen = useMemo(
    () => komponen.find((k) => k.id === komponenId) || null,
    [komponen, komponenId],
  );

  const selectedMaster = useMemo(
    () => rows.find((r) => r.id === selectedMasterId) || null,
    [rows, selectedMasterId],
  );

  async function loadMaster() {
    const [kRes, klRes, sRes, uRes, mRes] = await Promise.all([
      fetch("/api/komponen-tagihan?page=1&pageSize=500"),
      fetch("/api/kelas?page=1&pageSize=500"),
      fetch("/api/santri?page=1&pageSize=1000"),
      fetch("/api/users?page=1&pageSize=500&active=true"),
      fetch("/api/tagihan-master?page=1&pageSize=50"),
    ]);

    const [kJson, klJson, sJson, uJson, mJson] = await Promise.all([
      kRes.json(),
      klRes.json(),
      sRes.json(),
      uRes.json(),
      mRes.json(),
    ]);

    if (!kRes.ok) throw new Error(kJson.message || "Gagal load komponen");
    if (!klRes.ok) throw new Error(klJson.message || "Gagal load kelas");
    if (!sRes.ok) throw new Error(sJson.message || "Gagal load santri");
    if (!uRes.ok) throw new Error(uJson.message || "Gagal load user aktif");
    if (!mRes.ok) throw new Error(mJson.message || "Gagal load master tagihan");

    setKomponen(kJson.data);
    setKelas(klJson.data);
    setSantri(sJson.data);
    setUsers(uJson.data);
    setRows(mJson.data);

    if (!komponenId && kJson.data[0]) setKomponenId(kJson.data[0].id);

    const nextKelasNominal: Record<string, string> = {};
    const nextPicKelas: Record<string, string> = {};
    klJson.data.forEach((k: Kelas) => {
      nextKelasNominal[k.id] = kelasNominal[k.id] || "100.000";
      nextPicKelas[k.id] = picKelasUser[k.id] || "";
    });
    setKelasNominal(nextKelasNominal);
    setPicKelasUser(nextPicKelas);

    if (!picGlobalUserId && uJson.data[0]) {
      setPicGlobalUserId(uJson.data[0].id);
      setPicPutraUserId(uJson.data[0].id);
      setPicPutriUserId(uJson.data[0].id);
      setPicKelasUser(Object.fromEntries(klJson.data.map((k: Kelas) => [k.id, uJson.data[0].id])));
    }
  }

  useEffect(() => {
    loadMaster().catch((err) => {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingId) return;
    if (selectedKomponen?.tipe === "BULANAN") {
      setJatuhTempo(defaultJatuhTempoBulanan(new Date()));
      return;
    }
    if (selectedKomponen?.tipe === "INSIDENTAL" || selectedKomponen?.tipe === "SANTRI_BARU") {
      setJatuhTempo(defaultJatuhTempoInsidental(new Date()));
    }
  }, [selectedKomponen?.tipe, editingId]);

  useEffect(() => {
    if (selectedKomponen?.tipe === "INSIDENTAL" && autoGenerateEnabled) {
      setAutoGenerateEnabled(false);
    }
  }, [selectedKomponen?.tipe, autoGenerateEnabled]);

  function resetForm() {
    const baseKelasNominal: Record<string, string> = {};
    kelas.forEach((k) => {
      baseKelasNominal[k.id] = "100.000";
    });

    setEditingId("");
    setNamaTagihan("");
    setTargetType("SEMUA_SANTRI");
    setAutoGenerateEnabled(true);
    setPicMode("GLOBAL");
    const firstUserId = users[0]?.id || "";
    setPicGlobalUserId(firstUserId);
    setPicPutraUserId(firstUserId);
    setPicPutriUserId(firstUserId);
    setPicKelasUser(Object.fromEntries(kelas.map((k) => [k.id, firstUserId])));
    setNominalGlobal("100.000");
    setNominalL("100.000");
    setNominalP("100.000");
    setKelasNominal(baseKelasNominal);
    setSpesifik([]);
    setStartBulan(String(now.getMonth() + 1));
    setStartTahun(String(now.getFullYear()));
    setEndBulan("12");
    setEndTahun("2100");
    setJatuhTempoHari("30");
    setTanggalTerbit(toDateInputValue(now));
    if (selectedKomponen?.tipe === "BULANAN") {
      setJatuhTempo(defaultJatuhTempoBulanan(now));
    } else {
      setJatuhTempo(defaultJatuhTempoInsidental(now));
    }
    setKeterangan("");
  }

  function onEdit(master: Master) {
    setEditingId(master.id);
    setKomponenId(master.komponen.id);
    setNamaTagihan(master.namaTagihan || "");
    setTargetType(master.targetType);
    setAutoGenerateEnabled(master.autoGenerateEnabled);
    setPicMode(master.picMode || "GLOBAL");
    setPicGlobalUserId(master.picGlobalUserId || "");
    setPicPutraUserId(master.picPutraUserId || "");
    setPicPutriUserId(master.picPutriUserId || "");
    const kelasPicMap: Record<string, string> = {};
    kelas.forEach((k) => {
      const found = master.picKelas.find((item) => item.kelasId === k.id);
      kelasPicMap[k.id] = found?.picUserId || "";
    });
    setPicKelasUser(kelasPicMap);
    setNominalGlobal(formatNumber(master.nominalGlobal || 0));
    setStartBulan(String(master.startBulan || now.getMonth() + 1));
    setStartTahun(String(master.startTahun || now.getFullYear()));
    setEndBulan(String(master.endBulan || 12));
    setEndTahun(String(master.endTahun || 2100));
    setJatuhTempoHari(String(master.jatuhTempoHari || 30));
    setTanggalTerbit(master.tanggalTerbit ? toDateInputValue(new Date(master.tanggalTerbit)) : toDateInputValue(now));
    setJatuhTempo(toDateInputValue(new Date(master.jatuhTempo)));
    setKeterangan(master.keterangan || "");

    if (master.targetType === "GENDER") {
      const nominalByGender = new Map(master.details.filter((d) => d.gender).map((d) => [d.gender, d.nominal]));
      setNominalL(formatNumber(nominalByGender.get("L") || 0));
      setNominalP(formatNumber(nominalByGender.get("P") || 0));
    }

    if (master.targetType === "KELAS") {
      const nominalByKelas = new Map(master.details.filter((d) => d.kelasId).map((d) => [d.kelasId as string, d.nominal]));
      const nextKelasNominal: Record<string, string> = {};
      kelas.forEach((k) => {
        nextKelasNominal[k.id] = formatNumber(nominalByKelas.get(k.id) || 0);
      });
      setKelasNominal(nextKelasNominal);
    }

    if (master.targetType === "SPESIFIK_SANTRI") {
      setSpesifik(master.details.filter((d) => d.santriId).map((d) => ({
        santriId: d.santriId as string,
        nominal: formatNumber(d.nominal),
      })));
    } else {
      setSpesifik([]);
    }

    setPreview(null);
    setMessage("Mode edit aktif");
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Hapus master tagihan ini?");
    if (!ok) return;

    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`/api/tagihan-master/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal menghapus master tagihan");
      if (editingId === id) resetForm();
      setMessage("Master tagihan berhasil dihapus");
      await loadMaster();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  function addSpesifikRow() {
    if (!santri[0]) return;
    setSpesifik((prev) => [...prev, { santriId: santri[0].id, nominal: "100.000" }]);
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
        { gender: "L", nominal: parseNumberInput(nominalL) },
        { gender: "P", nominal: parseNumberInput(nominalP) },
      ];
    }
    if (targetType === "KELAS") {
      return kelas.map((k) => ({ kelasId: k.id, nominal: parseNumberInput(kelasNominal[k.id] || "0") }));
    }
    if (targetType === "SANTRI_BARU") return [];
    return spesifik.map((s) => ({ santriId: s.santriId, nominal: parseNumberInput(s.nominal) }));
  }

  async function onSubmitMaster(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const resolvedJatuhTempo = jatuhTempo || (
        selectedKomponen?.tipe === "BULANAN"
          ? defaultJatuhTempoBulanan(new Date())
          : defaultJatuhTempoInsidental(new Date())
      );
      const payload = {
        komponenId,
        namaTagihan,
        targetType,
        autoGenerateEnabled,
        picMode,
        picGlobalUserId: picGlobalUserId || null,
        picPutraUserId: picPutraUserId || null,
        picPutriUserId: picPutriUserId || null,
        picKelas: kelas.map((k) => ({ kelasId: k.id, picUserId: picKelasUser[k.id] || null })),
        nominalGlobal: targetType === "SEMUA_SANTRI" || targetType === "SANTRI_BARU" ? parseNumberInput(nominalGlobal) : null,
        startBulan: selectedKomponen?.tipe === "BULANAN" ? Number(startBulan) : null,
        startTahun: selectedKomponen?.tipe === "BULANAN" ? Number(startTahun) : null,
        endBulan: selectedKomponen?.tipe === "BULANAN" ? Number(endBulan) : null,
        endTahun: selectedKomponen?.tipe === "BULANAN" ? Number(endTahun) : null,
        jatuhTempoHari: targetType === "SANTRI_BARU" ? Number(jatuhTempoHari) : null,
        tanggalTerbit:
          selectedKomponen?.tipe !== "BULANAN" && targetType !== "SANTRI_BARU" ? tanggalTerbit : null,
        jatuhTempo: targetType === "SANTRI_BARU" ? null : resolvedJatuhTempo,
        keterangan,
        details: buildDetails(),
      };

      const method = editingId ? "PUT" : "POST";
      const endpoint = editingId ? `/api/tagihan-master/${editingId}` : "/api/tagihan-master";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || (editingId ? "Gagal mengubah master tagihan" : "Gagal membuat master tagihan"));
      }

      setMessage(editingId ? "Master tagihan berhasil diperbarui" : "Master tagihan berhasil disimpan");
      resetForm();
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
        Bulanan: 1 master untuk rentang start-end bulan. Auto generate tanggal 10 (WIB) bisa ON/OFF.
      </p>

      <form className="form-grid" onSubmit={onSubmitMaster}>
        <label htmlFor="komponen">Komponen</label>
        <select id="komponen" value={komponenId} onChange={(e) => setKomponenId(e.target.value)}>
          {komponen.map((k) => (
            <option key={k.id} value={k.id}>{k.kode} - {k.nama} ({k.tipe})</option>
          ))}
        </select>

        <label htmlFor="namaTagihan">Nama Tagihan</label>
        <input
          id="namaTagihan"
          value={namaTagihan}
          onChange={(e) => setNamaTagihan(e.target.value)}
          placeholder="Contoh: Syahriyyah Reguler"
          required
        />

        <label htmlFor="targetType">Target Tagihan</label>
        <select id="targetType" value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)}>
          <option value="SEMUA_SANTRI">Semua Santri</option>
          <option value="GENDER">Gender</option>
          <option value="KELAS">Kelas</option>
          <option value="SPESIFIK_SANTRI">Spesifik Santri</option>
          <option value="SANTRI_BARU">Santri Baru</option>
        </select>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={autoGenerateEnabled}
            onChange={(e) => setAutoGenerateEnabled(e.target.checked)}
            disabled={selectedKomponen?.tipe === "INSIDENTAL"}
          />
          {selectedKomponen?.tipe === "INSIDENTAL"
            ? "Insidental: manual generate"
            : selectedKomponen?.tipe === "SANTRI_BARU"
              ? "Auto Apply saat santri baru dibuat"
              : "Auto Generate ON (tanggal 10 WIB)"}
        </label>

        <label htmlFor="picMode">Mode PIC</label>
        <select id="picMode" value={picMode} onChange={(e) => setPicMode(e.target.value as "GLOBAL" | "BY_GENDER" | "BY_KELAS")}>
          <option value="GLOBAL">1 PIC untuk semua</option>
          <option value="BY_GENDER">Beda PIC per gender</option>
          <option value="BY_KELAS">Beda PIC per kelas</option>
        </select>

        <label htmlFor="picGlobalUserId">PIC Global (fallback)</label>
        <select id="picGlobalUserId" value={picGlobalUserId} onChange={(e) => setPicGlobalUserId(e.target.value)}>
          <option value="">- tidak diisi -</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>

        {picMode === "BY_GENDER" ? (
          <>
            <label htmlFor="picPutraUserId">PIC Putra</label>
            <select id="picPutraUserId" value={picPutraUserId} onChange={(e) => setPicPutraUserId(e.target.value)}>
              <option value="">- tidak diisi -</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>

            <label htmlFor="picPutriUserId">PIC Putri</label>
            <select id="picPutriUserId" value={picPutriUserId} onChange={(e) => setPicPutriUserId(e.target.value)}>
              <option value="">- tidak diisi -</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </>
        ) : null}

        {picMode === "BY_KELAS" ? (
          <div className="stack-block">
            <strong>PIC per Kelas</strong>
            {kelas.map((k) => (
              <div key={k.id} className="row-inline">
                <span>{k.nama}</span>
                <select
                  value={picKelasUser[k.id] || ""}
                  onChange={(e) => setPicKelasUser((prev) => ({ ...prev, [k.id]: e.target.value }))}
                >
                  <option value="">- fallback global/null -</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : null}

        {targetType === "SEMUA_SANTRI" || targetType === "SANTRI_BARU" ? (
          <>
            <label htmlFor="nominalGlobal">
              {targetType === "SANTRI_BARU" ? "Nominal Santri Baru" : "Nominal Semua Santri"}
            </label>
            <input id="nominalGlobal" inputMode="numeric" value={nominalGlobal} onChange={(e) => setNominalGlobal(formatNumberInput(e.target.value))} />
          </>
        ) : null}

        {targetType === "GENDER" ? (
          <>
            <label htmlFor="nominalL">Nominal Putra (L)</label>
            <input id="nominalL" inputMode="numeric" value={nominalL} onChange={(e) => setNominalL(formatNumberInput(e.target.value))} />

            <label htmlFor="nominalP">Nominal Putri (P)</label>
            <input id="nominalP" inputMode="numeric" value={nominalP} onChange={(e) => setNominalP(formatNumberInput(e.target.value))} />
          </>
        ) : null}

        {targetType === "KELAS" ? (
          <div className="stack-block">
            <strong>Nominal per Kelas (wajib semua kelas)</strong>
            {kelas.map((k) => (
              <div key={k.id} className="row-inline">
                <span>{k.nama}</span>
                <input
                  inputMode="numeric"
                  value={kelasNominal[k.id] || ""}
                  onChange={(e) => setKelasNominal((prev) => ({ ...prev, [k.id]: formatNumberInput(e.target.value) }))}
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
                  inputMode="numeric"
                  value={item.nominal}
                  onChange={(e) => updateSpesifikRow(idx, { nominal: formatNumberInput(e.target.value) })}
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

        {selectedKomponen?.tipe !== "BULANAN" && targetType !== "SANTRI_BARU" ? (
          <>
            <label htmlFor="tanggalTerbit">Tanggal Terbit</label>
            <input id="tanggalTerbit" type="date" value={tanggalTerbit} onChange={(e) => setTanggalTerbit(e.target.value)} />
          </>
        ) : null}

        {targetType === "SANTRI_BARU" ? (
          <>
            <label htmlFor="jatuhTempoHari">Jatuh Tempo (hari dari pembuatan tagihan)</label>
            <input
              id="jatuhTempoHari"
              type="number"
              min="1"
              value={jatuhTempoHari}
              onChange={(e) => setJatuhTempoHari(e.target.value)}
            />
          </>
        ) : (
          <>
            <label htmlFor="jatuhTempo">Jatuh Tempo</label>
            <input id="jatuhTempo" type="date" value={jatuhTempo} onChange={(e) => setJatuhTempo(e.target.value)} />
          </>
        )}

        <label htmlFor="keterangan">Keterangan</label>
        <input id="keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />

        <div className="row-actions">
          <button type="submit" disabled={loading}>{loading ? "Menyimpan..." : editingId ? "Update Master" : "Simpan Master"}</button>
          {editingId ? (
            <button type="button" onClick={resetForm} disabled={loading}>Batal Edit</button>
          ) : null}
        </div>
      </form>

      {message ? <p className="error-text">{message}</p> : null}

      <div className="form-grid">
        <h3>Preview & Generate Manual</h3>

        <label htmlFor="selectedMaster">Pilih Master</label>
        <select id="selectedMaster" value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)}>
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
            <input id="previewMonth" type="number" min="1" max="12" value={previewMonth} onChange={(e) => setPreviewMonth(e.target.value)} />
            <label htmlFor="previewYear">Periode Tahun (manual)</label>
            <input id="previewYear" type="number" min="2000" max="3000" value={previewYear} onChange={(e) => setPreviewYear(e.target.value)} />
          </>
        ) : null}

        <div className="row-actions">
          <button type="button" onClick={onPreview}>Preview</button>
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
          <button type="button" onClick={onGenerateManual}>Generate Manual</button>
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
              <th>PIC Mode</th>
              <th>Range</th>
              <th>Last Generated</th>
              <th>Jatuh Tempo</th>
              <th>Aksi</th>
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
                <td>{r.picMode}</td>
                <td>
                  {r.komponen.tipe === "BULANAN"
                    ? `${r.startBulan}/${r.startTahun} - ${r.endBulan}/${r.endTahun}`
                    : r.komponen.tipe === "SANTRI_BARU"
                      ? "Santri Baru"
                      : "Insidental"}
                </td>
                <td>{r.lastGeneratedPeriod || "-"}</td>
                <td>{new Date(r.jatuhTempo).toISOString().slice(0, 10)}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => onEdit(r)} disabled={loading || r.status === "ENDED"}>Edit</button>
                    <button type="button" className="btn-danger" onClick={() => onDelete(r.id)} disabled={loading}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={10}>Belum ada master tagihan</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
