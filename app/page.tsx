import { env } from "@/lib/env";

export default function HomePage() {
  return (
    <main className="container">
      <h1>{env.appName}</h1>
      <p>Sprint 0 selesai: setup fondasi proyek, auth admin, dan prisma baseline.</p>
      <p>
        Lanjut ke <a href="/login">Login Admin</a>
      </p>
    </main>
  );
}
