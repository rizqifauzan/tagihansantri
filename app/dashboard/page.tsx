"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, LineChart } from "@/app/dashboard/_components/charts";
import { Card, DateRangeSelect, StatBlock } from "@/app/dashboard/_components/primitives";
import { useToast } from "@/app/dashboard/_components/toast";

type TagihanRow = {
  id: string;
  periodeKey: string;
  nominal: number;
  nominalTerbayar: number;
  status: "DRAFT" | "TERBIT" | "SEBAGIAN" | "LUNAS" | "BATAL";
  jatuhTempo: string;
  santri: { kelas: { nama: string } | null };
};

type PembayaranRow = {
  id: string;
  nominal: number;
  tanggalBayar: string;
};

function formatCurrency(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export default function DashboardPage() {
  const [tagihanRows, setTagihanRows] = useState<TagihanRow[]>([]);
  const [pembayaranRows, setPembayaranRows] = useState<PembayaranRow[]>([]);
  const [rangeDays, setRangeDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tagihanRes, pembayaranRes] = await Promise.all([
          fetch("/api/tagihan?page=1&pageSize=200"),
          fetch("/api/pembayaran?page=1&pageSize=200"),
        ]);

        const [tagihanJson, pembayaranJson] = await Promise.all([tagihanRes.json(), pembayaranRes.json()]);

        if (!tagihanRes.ok) throw new Error(tagihanJson.message || "Gagal memuat data tagihan");
        if (!pembayaranRes.ok) throw new Error(pembayaranJson.message || "Gagal memuat data pembayaran");

        setTagihanRows(tagihanJson.data || []);
        setPembayaranRows(pembayaranJson.data || []);
      } catch (error) {
        pushToast(error instanceof Error ? error.message : "Terjadi kesalahan", "error");
      } finally {
        setLoading(false);
      }
    }

    load().catch(() => undefined);
  }, [pushToast]);

  const now = useMemo(() => new Date(), []);
  const activeRangeStart = useMemo(() => {
    const start = new Date(now);
    start.setDate(now.getDate() - rangeDays);
    return start;
  }, [now, rangeDays]);

  const ringkasan = useMemo(() => {
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const totalTagihanBulanIni = tagihanRows
      .filter((row) => row.periodeKey.startsWith(thisMonth) || row.jatuhTempo.startsWith(thisMonth))
      .reduce((sum, row) => sum + row.nominal, 0);

    const totalPembayaranDiterima = pembayaranRows
      .filter((row) => new Date(row.tanggalBayar).getMonth() === now.getMonth())
      .reduce((sum, row) => sum + row.nominal, 0);

    const totalTunggakan = tagihanRows.reduce((sum, row) => {
      const sisa = Math.max(0, row.nominal - row.nominalTerbayar);
      if (row.status === "TERBIT" || row.status === "SEBAGIAN") return sum + sisa;
      return sum;
    }, 0);

    return {
      totalTagihanBulanIni,
      totalPembayaranDiterima,
      totalTunggakan,
      jumlahTagihanAktif: tagihanRows.filter((row) => row.status !== "BATAL").length,
    };
  }, [now, pembayaranRows, tagihanRows]);

  const lineData = useMemo(() => {
    const map = new Map<string, number>();

    pembayaranRows
      .filter((row) => new Date(row.tanggalBayar) >= activeRangeStart)
      .forEach((row) => {
        const date = new Date(row.tanggalBayar);
        const key = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, (map.get(key) || 0) + row.nominal);
      });

    const keys = Array.from(map.keys());
    if (!keys.length) {
      return [{ label: "-", value: 0 }];
    }

    return keys.slice(-12).map((label) => ({ label, value: map.get(label) || 0 }));
  }, [activeRangeStart, pembayaranRows]);

  const barData = useMemo(() => {
    const perKelas = new Map<string, number>();
    tagihanRows.forEach((row) => {
      const kelas = row.santri?.kelas?.nama || "Tanpa Kelas";
      const sisa = Math.max(0, row.nominal - row.nominalTerbayar);
      perKelas.set(kelas, (perKelas.get(kelas) || 0) + sisa);
    });

    return Array.from(perKelas.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [tagihanRows]);

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Dashboard Keuangan</h2>
          <p>Pantau ringkasan tagihan dan pembayaran harian secara ringkas.</p>
        </div>
        <DateRangeSelect value={rangeDays} onChange={setRangeDays} />
      </header>

      <div className="dashboard-grid">
        <Card title="Ringkasan Bulan Ini" subtitle="Data prioritas untuk operasional harian">
          <div className="stat-grid">
            <StatBlock label="Total Tagihan" value={formatCurrency(ringkasan.totalTagihanBulanIni)} />
            <StatBlock label="Pembayaran" value={formatCurrency(ringkasan.totalPembayaranDiterima)} />
            <StatBlock label="Tunggakan" value={formatCurrency(ringkasan.totalTunggakan)} />
            <StatBlock label="Tagihan Aktif" value={String(ringkasan.jumlahTagihanAktif)} />
          </div>
        </Card>

        <Card title="Distribusi Tunggakan" subtitle="Per kelas (sisa tagihan)">
          {loading ? <p className="hint-text">Memuat data grafik...</p> : <BarChart data={barData} />}
        </Card>

        <Card title="Tren Pembayaran" subtitle="Pergerakan nominal diterima" right={<span className="chip">{rangeDays} hari</span>}>
          {loading ? <p className="hint-text">Memuat data grafik...</p> : <LineChart data={lineData} />}
        </Card>

        <Card title="Status Operasional" subtitle="Snapshot cepat">
          <div className="compact-list">
            <div>
              <span>Item Tagihan</span>
              <strong>{tagihanRows.length.toLocaleString("id-ID")}</strong>
            </div>
            <div>
              <span>Transaksi Pembayaran</span>
              <strong>{pembayaranRows.length.toLocaleString("id-ID")}</strong>
            </div>
            <div>
              <span>Periode Aktif</span>
              <strong>{new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</strong>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
