"use client";

import { FormEvent, useEffect, useState } from "react";

type UserRow = {
  id: string;
  username: string;
  role: "ADMIN";
  active: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
};

type UserListResponse = {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formId, setFormId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN">("ADMIN");
  const [active, setActive] = useState(true);

  async function loadData(nextPage = page, keyword = q) {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "10",
        q: keyword,
      });
      const res = await fetch(`/api/users?${params.toString()}`);
      const json = (await res.json()) as UserListResponse | { message?: string };
      if (!res.ok) {
        const errMsg = "message" in json ? json.message : "";
        throw new Error(errMsg || "Gagal load data user");
      }
      const payload = json as UserListResponse;
      setRows(payload.data);
      setTotalPages(payload.totalPages || 1);
      setPage(payload.page || 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setFormId(null);
    setUsername("");
    setPassword("");
    setRole("ADMIN");
    setActive(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (username.trim().length < 3) {
      setMessage("Username minimal 3 karakter");
      return;
    }
    if (!formId && password.length < 6) {
      setMessage("Password minimal 6 karakter");
      return;
    }

    const payload = {
      username: username.trim(),
      password,
      role,
      active,
    };

    const res = await fetch(formId ? `/api/users/${formId}` : "/api/users", {
      method: formId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal menyimpan user");
      return;
    }

    resetForm();
    await loadData(page, q);
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Soft delete user ini?");
    if (!ok) return;

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Gagal menghapus user");
      return;
    }
    await loadData(page, q);
  }

  return (
    <section>
      <h2>Manajemen User</h2>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          loadData(1, q);
        }}
      >
        <input
          type="text"
          placeholder="Cari username"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Cari</button>
      </form>

      <form className="form-grid" onSubmit={onSubmit}>
        <h3>{formId ? "Edit User" : "Tambah User"}</h3>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label htmlFor="password">
          Password {formId ? "(kosongkan jika tidak diubah)" : ""}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={formId ? "Kosongkan jika tidak diubah" : ""}
          required={!formId}
        />

        <label htmlFor="role">Role</label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value as "ADMIN")}>
          <option value="ADMIN">ADMIN</option>
        </select>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Aktif
        </label>

        <div className="row-actions">
          <button type="submit">{formId ? "Update" : "Simpan"}</button>
          {formId ? (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Batal
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="error-text">{message}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.username}</td>
                <td>{row.role}</td>
                <td>{row.active ? "Aktif" : "Nonaktif"}</td>
                <td>{new Date(row.createdAt).toLocaleString("id-ID")}</td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setFormId(row.id);
                        setUsername(row.username);
                        setPassword("");
                        setRole("ADMIN");
                        setActive(row.active);
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(row.id)} className="btn-danger">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5}>{loading ? "Memuat..." : "Tidak ada data"}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button type="button" disabled={page <= 1} onClick={() => loadData(page - 1, q)}>
          Sebelumnya
        </button>
        <span>
          Halaman {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => loadData(page + 1, q)}
        >
          Berikutnya
        </button>
      </div>
    </section>
  );
}
