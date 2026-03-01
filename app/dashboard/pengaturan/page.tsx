"use client";

import Link from "next/link";
import { Card } from "@/app/dashboard/_components/primitives";

type SettingGroup = {
  title: string;
  description: string;
  links: Array<{ label: string; href: string; note: string }>;
};

const groups: SettingGroup[] = [
  {
    title: "Pengaturan Diskon",
    description: "Konfigurasi rule kelayakan dan persentase diskon untuk kebutuhan operasional pesantren.",
    links: [
      { label: "Kategori Diskon", href: "/dashboard/diskon-kategori", note: "Kelola kategori dan rule eligibility" },
      { label: "Diskon Komponen", href: "/dashboard/diskon-komponen", note: "Mapping diskon ke komponen tagihan" },
      { label: "Simulasi Diskon", href: "/dashboard/simulasi-diskon", note: "Cek hasil diskon sebelum diterapkan" },
    ],
  },
  {
    title: "Pengaturan Tagihan",
    description: "Atur komponen, rule nominal, dan proses pembuatan tagihan periodik.",
    links: [
      { label: "Komponen", href: "/dashboard/komponen-tagihan", note: "Master jenis komponen tagihan" },
      { label: "Rule Tagihan", href: "/dashboard/rule-tagihan", note: "Cakupan nominal per target" },
      { label: "Pembuatan", href: "/dashboard/tagihan-master", note: "Master generate tagihan" },
    ],
  },
  {
    title: "Pengaturan Sistem",
    description: "Konfigurasi akun admin, akses pengguna, dan monitoring matrix data.",
    links: [
      { label: "Hak Akses", href: "/dashboard/users", note: "Manajemen akun admin" },
      { label: "Tagihan Matrix", href: "/dashboard/tagihan-matrix", note: "Monitoring seluruh tagihan" },
      { label: "Dashboard", href: "/dashboard", note: "Kembali ke ringkasan utama" },
    ],
  },
];

export default function PengaturanPage() {
  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Pengaturan Sistem</h2>
          <p>Pusat konfigurasi admin keuangan pesantren agar pengelolaan tetap rapi dan skalabel.</p>
        </div>
      </header>

      <div className="settings-grid">
        {groups.map((group) => (
          <Card key={group.title} title={group.title} subtitle={group.description}>
            <div className="settings-links">
              {group.links.map((item) => (
                <Link key={item.href} href={item.href} className="settings-link">
                  <strong>{item.label}</strong>
                  <span>{item.note}</span>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
