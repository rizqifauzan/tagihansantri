"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ToastProvider } from "@/app/dashboard/_components/toast";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const groups: NavGroup[] = [
  {
    title: "Manajemen Data",
    items: [
      { label: "Santri", href: "/dashboard/santri", icon: <Icon path="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm7 8a7 7 0 0 0-14 0" /> },
      { label: "Kelas", href: "/dashboard/kelas", icon: <Icon path="M3 7l9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4" /> },
      { label: "Wali", href: "/dashboard/keluarga", icon: <Icon path="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM8 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm8 8a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6M24 21a6 6 0 0 0-5-5.91" /> },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { label: "Tagihan", href: "/dashboard/tagihan", icon: <Icon path="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" /> },
      { label: "Pembayaran", href: "/dashboard/pembayaran", icon: <Icon path="M3 7h18v10H3zM3 10h18M8 15h2" /> },
      { label: "Laporan", href: "/dashboard/tagihan-matrix", icon: <Icon path="M4 19h16M7 16V8m5 8V5m5 11v-6" /> },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Pengaturan", href: "/dashboard/pengaturan", icon: <Icon path="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4Zm9 4-2.2.7a7.8 7.8 0 0 1-.5 1.3l1.2 2-2 2-2-1.2a7.8 7.8 0 0 1-1.3.5L12 21l-1-.2a7.8 7.8 0 0 1-1.3-.5l-2 1.2-2-2 1.2-2a7.8 7.8 0 0 1-.5-1.3L3 12l.2-1a7.8 7.8 0 0 1 .5-1.3l-1.2-2 2-2 2 1.2a7.8 7.8 0 0 1 1.3-.5L12 3l1 .2a7.8 7.8 0 0 1 1.3.5l2-1.2 2 2-1.2 2a7.8 7.8 0 0 1 .5 1.3Z" /> },
      { label: "Hak Akses", href: "/dashboard/users", icon: <Icon path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11A4 4 0 1 0 9 3a4 4 0 0 0 0 8Zm15 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /> },
      { label: "Bantuan", href: "/dashboard", icon: <Icon path="M12 18h.01M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" /> },
    ],
  },
];

export function DashboardShell({
  appName,
  username,
  children,
}: {
  appName: string;
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState<"pesantren-formal" | "pesantren-modern">("pesantren-formal");
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [profileOpen]);

  useEffect(() => {
    const saved = window.localStorage.getItem("dashboard-theme");
    if (saved === "pesantren-modern" || saved === "pesantren-formal") {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
      return;
    }
    document.documentElement.dataset.theme = "pesantren-formal";
  }, []);

  function onThemeChange(nextTheme: "pesantren-formal" | "pesantren-modern") {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("dashboard-theme", nextTheme);
  }

  const initials = useMemo(
    () =>
      username
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [username],
  );

  return (
    <ToastProvider>
      <main className={`dashboard-layout ${collapsed ? "is-collapsed" : ""}`}>
        <aside className="sidebar">
          <div className="sidebar-top">
            <button type="button" className="brand" onClick={() => setCollapsed((prev) => !prev)}>
              <span className="brand-mark">{appName.slice(0, 1)}</span>
              {!collapsed ? <strong>{appName}</strong> : null}
            </button>

            <div className="profile" ref={profileRef}>
              <button type="button" className="profile-trigger" onClick={() => setProfileOpen((prev) => !prev)}>
                <span className="avatar">{initials || "AD"}</span>
                {!collapsed ? (
                  <span className="profile-copy">
                    <strong>{username}</strong>
                    <small>Admin Keuangan</small>
                  </span>
                ) : null}
              </button>

              {profileOpen ? (
                <div className="profile-menu">
                  <p>{username}</p>
                  <label htmlFor="theme-select" className="theme-picker">
                    <span>Tema</span>
                    <select
                      id="theme-select"
                      value={theme}
                      onChange={(event) =>
                        onThemeChange(event.target.value as "pesantren-formal" | "pesantren-modern")
                      }
                    >
                      <option value="pesantren-formal">Pesantren Formal</option>
                      <option value="pesantren-modern">Pesantren Modern</option>
                    </select>
                  </label>
                  <form action="/api/auth/logout" method="post">
                    <button type="submit" className="btn-danger">Logout</button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Navigasi utama">
            {groups.map((group, index) => (
              <div key={group.title} className={`nav-group ${index === groups.length - 1 ? "is-system" : ""}`}>
                {!collapsed ? <p className="group-label">{group.title}</p> : null}
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} className={`nav-link ${active ? "is-active" : ""}`}>
                      <span className="nav-icon">{item.icon}</span>
                      {!collapsed ? <span>{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <section className="dashboard-content">{children}</section>
      </main>
    </ToastProvider>
  );
}
