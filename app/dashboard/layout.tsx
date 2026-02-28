import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { env } from "@/lib/env";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="container dashboard-shell">
      <div className="dashboard-topbar">
        <div>
          <h1>{env.appName}</h1>
          <p>Login sebagai: {session.username}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit">Logout</button>
        </form>
      </div>

      <nav className="dashboard-nav">
        <Link href="/dashboard">Home</Link>
        <Link href="/dashboard/kelas">Master Kelas</Link>
        <Link href="/dashboard/keluarga">Master Keluarga</Link>
        <Link href="/dashboard/santri">Master Santri</Link>
        <Link href="/dashboard/komponen-tagihan">Komponen Tagihan</Link>
        <Link href="/dashboard/diskon-kategori">Kategori Diskon</Link>
        <Link href="/dashboard/diskon-komponen">Diskon per Komponen</Link>
        <Link href="/dashboard/simulasi-diskon">Simulasi Diskon</Link>
        <Link href="/dashboard/rule-tagihan">Rule Tagihan</Link>
        <Link href="/dashboard/tagihan-master">Pembuatan Tagihan</Link>
      </nav>

      {children}
    </main>
  );
}
