import Link from "next/link";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const FEATURES = [
  {
    title: "Manajemen Santri Terpusat",
    description: "Kelola data santri, keluarga, dan kelas dengan struktur yang rapi dan mudah dicari.",
  },
  {
    title: "Tagihan Fleksibel",
    description: "Susun komponen tagihan, rule otomatis, dan publish tagihan per periode secara terkontrol.",
  },
  {
    title: "Pembayaran & Riwayat",
    description: "Catat pembayaran tunai/transfer, cetak kwitansi, dan lacak histori batch pembayaran.",
  },
];

export default async function HomePage() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(sessionCookie);

  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <p className="landing-kicker">Sistem Administrasi Pesantren</p>
        <h1>{env.appName}</h1>
        <p className="landing-sub">
          Platform operasional untuk pencatatan tagihan santri, kontrol pembayaran, dan monitoring data
          keuangan harian dalam satu dashboard.
        </p>

        <div className="landing-cta">
          <Link href={session ? "/dashboard" : "/login"} className="landing-btn-primary">
            {session ? "Buka Dashboard" : "Login Admin"}
          </Link>
          <a href="#fitur" className="landing-btn-secondary">Lihat Fitur</a>
        </div>
      </section>

      <section id="fitur" className="landing-section">
        <div className="landing-section-head">
          <h2>Fitur Utama</h2>
          <p>Didesain untuk alur kerja harian operator tagihan yang cepat dan akurat.</p>
        </div>

        <div className="landing-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="landing-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
