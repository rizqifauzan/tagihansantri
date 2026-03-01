import Link from "next/link";

export default function DashboardPage() {
  return (
    <section>
      <h2>Dashboard Admin</h2>
      <p>Pilih modul untuk mengelola master data Sprint 1.</p>
      <ul>
        <li>
          <Link href="/dashboard/users">CRUD User</Link>
        </li>
        <li>
          <Link href="/dashboard/kelas">CRUD Kelas</Link>
        </li>
        <li>
          <Link href="/dashboard/keluarga">CRUD Keluarga</Link>
        </li>
        <li>
          <Link href="/dashboard/santri">CRUD Santri</Link>
        </li>
        <li>
          <Link href="/dashboard/komponen-tagihan">CRUD Komponen Tagihan</Link>
        </li>
        <li>
          <Link href="/dashboard/diskon-kategori">CRUD Kategori Diskon</Link>
        </li>
        <li>
          <Link href="/dashboard/diskon-komponen">Konfigurasi Diskon per Komponen</Link>
        </li>
        <li>
          <Link href="/dashboard/simulasi-diskon">Simulasi Diskon</Link>
        </li>
        <li>
          <Link href="/dashboard/rule-tagihan">CRUD Rule Tagihan + Publish Validation</Link>
        </li>
        <li>
          <Link href="/dashboard/tagihan-master">Pembuatan Tagihan (Semua/Gender/Kelas/Spesifik)</Link>
        </li>
        <li>
          <Link href="/dashboard/tagihan">Lifecycle Tagihan per Santri</Link>
        </li>
        <li>
          <Link href="/dashboard/tagihan-matrix">Semua Tagihan (Matrix per Santri)</Link>
        </li>
        <li>
          <Link href="/dashboard/pembayaran">Pembayaran, Cicilan, Kwitansi</Link>
        </li>
      </ul>
    </section>
  );
}
