"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [initialError, setInitialError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid_credentials") {
      setInitialError("Username atau password salah.");
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Login gagal. Coba lagi.");
        return;
      }

      router.replace(data?.redirectTo || "/dashboard");
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="auth-badge">Portal Admin</span>
        <h1>Masuk ke Sistem Tagihan Santri</h1>
        <p>
          Gunakan akun admin untuk mengelola santri, tagihan, pembayaran, dan laporan.
        </p>

        <form onSubmit={handleSubmit} className="form auth-form" noValidate>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {(error || initialError) && (
            <p className="auth-error" role="alert">
              {error || initialError}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </section>
    </main>
  );
}
