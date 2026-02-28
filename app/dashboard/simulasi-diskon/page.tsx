"use client";

import { FormEvent, useEffect, useState } from "react";

type Option = { id: string; nama: string; nis?: string; kode?: string };

type SimulasiResult = {
  nominalAwal: number;
  persentaseTerpilih: number;
  nominalDiskon: number;
  nominalAkhir: number;
  selectedKategori: { kode: string; nama: string; persentase: number } | null;
  eligibleKategori: Array<{ kode: string; nama: string; persentase: number }>;
};

export default function SimulasiDiskonPage() {
  const [santriOptions, setSantriOptions] = useState<Option[]>([]);
  const [komponenOptions, setKomponenOptions] = useState<Option[]>([]);
  const [santriId, setSantriId] = useState("");
  const [komponenId, setKomponenId] = useState("");
  const [nominalAwal, setNominalAwal] = useState("500000");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SimulasiResult | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/santri?page=1&pageSize=500"),
      fetch("/api/komponen-tagihan?page=1&pageSize=300"),
    ])
      .then(async ([sRes, kRes]) => {
        const sJson = await sRes.json();
        const kJson = await kRes.json();
        if (!sRes.ok) throw new Error(sJson.message || "Gagal load santri");
        if (!kRes.ok) throw new Error(kJson.message || "Gagal load komponen");

        setSantriOptions(sJson.data);
        setKomponenOptions(kJson.data);
        if (sJson.data[0]) setSantriId(sJson.data[0].id);
        if (kJson.data[0]) setKomponenId(kJson.data[0].id);
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
      });
  }, []);

  async function onSimulate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setResult(null);

    const res = await fetch("/api/diskon/simulasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ santriId, komponenId, nominalAwal: Number(nominalAwal) }),
    });
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.message || "Gagal simulasi");
      return;
    }

    setResult(json as SimulasiResult);
  }

  return (
    <section>
      <h2>Simulasi Diskon</h2>
      <p className="hint-text">Rule resolusi: jika multi-eligible, sistem memilih persentase diskon terbesar.</p>

      <form className="form-grid" onSubmit={onSimulate}>
        <label htmlFor="santri">Santri</label>
        <select id="santri" value={santriId} onChange={(e) => setSantriId(e.target.value)}>
          {santriOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.nis} - {s.nama}</option>
          ))}
        </select>

        <label htmlFor="komponen">Komponen Tagihan</label>
        <select id="komponen" value={komponenId} onChange={(e) => setKomponenId(e.target.value)}>
          {komponenOptions.map((k) => (
            <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>
          ))}
        </select>

        <label htmlFor="nominalAwal">Nominal Awal</label>
        <input
          id="nominalAwal"
          type="number"
          min="1"
          value={nominalAwal}
          onChange={(e) => setNominalAwal(e.target.value)}
        />

        <div className="row-actions">
          <button type="submit">Simulasikan</button>
        </div>
      </form>

      {message ? <p className="error-text">{message}</p> : null}

      {result ? (
        <div className="form-grid">
          <h3>Hasil Simulasi</h3>
          <p>Nominal Awal: <strong>{result.nominalAwal}</strong></p>
          <p>Persentase Terpilih: <strong>{result.persentaseTerpilih}%</strong></p>
          <p>Nominal Diskon: <strong>{result.nominalDiskon}</strong></p>
          <p>Nominal Akhir: <strong>{result.nominalAkhir}</strong></p>
          <p>
            Kategori Terpilih: <strong>{result.selectedKategori ? `${result.selectedKategori.kode} - ${result.selectedKategori.nama}` : "Tidak ada"}</strong>
          </p>
        </div>
      ) : null}
    </section>
  );
}
