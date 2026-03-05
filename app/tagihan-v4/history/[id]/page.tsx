"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Tabs } from "@/app/dashboard/_components/primitives";

type BatchHistoryDetail = {
  id: string;
  batchName: string;
  metode: "TUNAI" | "TRANSFER";
  adminUsername: string;
  createdAt: string;
  totalItem: number;
  totalSantri: number;
  totalNominal: number;
  items: Array<{
    tagihanId: string;
    nis: string;
    santriNama: string;
    kelas: string;
    tagihanLabel: string;
    action: "edit" | "lunas";
    nominalBayar: number;
  }>;
  files: Array<{
    name: string;
    url: string;
    size: number;
  }>;
};

type HistoryFile = {
  name: string;
  url: string;
  size: number;
};

const fmt = (n: number) => n.toLocaleString("id-ID");
const fmtDateTime = (v: string) =>
  new Date(v).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

function fileExt(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function canPreviewImage(name: string) {
  const ext = fileExt(name);
  return ext === "png" || ext === "jpg" || ext === "jpeg";
}

function canPreviewPdf(name: string) {
  return fileExt(name) === "pdf";
}

function fileTypeLabel(name: string) {
  const ext = fileExt(name);
  if (!ext) return "UNKNOWN";
  return ext.toUpperCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ActionIcon({ action }: { action: "edit" | "lunas" }) {
  const isLunas = action === "lunas";
  const label = isLunas ? "Lunas" : "Cicil Tagihan";
  return (
    <span
      className={`v4-action-icon is-${action}`}
      title={label}
      aria-label={label}
    >
      {isLunas ? "✓" : "◔"}
    </span>
  );
}

export default function TagihanV4HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;

  const [detail, setDetail] = useState<BatchHistoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [previewFile, setPreviewFile] = useState<HistoryFile | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");

  const loadDetail = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/tagihan-v4/batch-history/${encodeURIComponent(batchId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat detail batch");
      setDetail(json.data || null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal memuat detail batch");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadDetail().catch(() => undefined);
  }, [loadDetail]);

  const filteredItems = useMemo(() => {
    if (!detail) return [];
    if (!search.trim()) return detail.items;
    const keyword = search.trim().toLowerCase();
    return detail.items.filter((item) =>
      [item.nis, item.santriNama, item.kelas, item.tagihanLabel].some((v) => v.toLowerCase().includes(keyword)),
    );
  }, [detail, search]);

  const matrixColumns = useMemo(
    () => Array.from(new Set(filteredItems.map((item) => item.tagihanLabel))).sort((a, b) => a.localeCompare(b)),
    [filteredItems],
  );

  const matrixColumnMeta = useMemo(
    () =>
      matrixColumns.map((label) => {
        const match = label.match(/^(.*)\s\((.*)\)$/);
        if (!match) {
          return { key: label, group: label, sub: "-" };
        }
        return { key: label, group: match[1], sub: match[2] };
      }),
    [matrixColumns],
  );

  const matrixGroupedColumns = useMemo(() => {
    const map = new Map<string, Array<{ key: string; group: string; sub: string }>>();
    for (const col of matrixColumnMeta) {
      const current = map.get(col.group) || [];
      current.push(col);
      map.set(col.group, current);
    }
    return Array.from(map.entries()).map(([group, cols]) => ({ group, cols }));
  }, [matrixColumnMeta]);

  const matrixRows = useMemo(() => {
    const map = new Map<
      string,
      {
        nis: string;
        santriNama: string;
        kelas: string;
        cells: Record<string, { nominal: number; action: "edit" | "lunas" }>;
      }
    >();

    for (const item of filteredItems) {
      const key = `${item.nis}__${item.santriNama}__${item.kelas}`;
      const row = map.get(key) || {
        nis: item.nis,
        santriNama: item.santriNama,
        kelas: item.kelas,
        cells: {},
      };
      row.cells[item.tagihanLabel] = { nominal: item.nominalBayar, action: item.action };
      map.set(key, row);
    }

    return Array.from(map.values()).sort((a, b) => {
      const nisCompare = a.nis.localeCompare(b.nis);
      if (nisCompare !== 0) return nisCompare;
      return a.santriNama.localeCompare(b.santriNama);
    });
  }, [filteredItems]);

  const matrixRowTotals = useMemo(
    () =>
      matrixRows.map((row) =>
        Object.values(row.cells).reduce((sum, cell) => sum + (cell?.nominal || 0), 0),
      ),
    [matrixRows],
  );

  async function downloadAllFiles() {
    if (!detail?.files?.length) return;
    detail.files.forEach((file, index) => {
      window.setTimeout(() => {
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.name;
        link.rel = "noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, index * 250);
    });
  }

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Detail Batch</h2>
          <p>
            <Link href="/tagihan-v4">Tagihan V4</Link> / <Link href="/tagihan-v4/history">History</Link> /{" "}
            {detail?.batchName || "Detail"}
          </p>
        </div>
        <div className="row-actions">
          <Link href="/tagihan-v4/history" className="btn-secondary">
            Kembali
          </Link>
          <button type="button" className="btn-secondary" onClick={() => loadDetail()} disabled={loading}>
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </header>

      {message ? <div className="v3-error">{message}</div> : null}

      {!detail && !loading ? (
        <div className="empty-state">
          <div className="empty-illustration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h3>Detail Batch Tidak Ditemukan</h3>
          <p>ID batch tidak ditemukan pada history.</p>
          <Link href="/tagihan-v4/history" className="btn-secondary">
            Kembali ke History
          </Link>
        </div>
      ) : null}

      {detail ? (
        <>
          <div className="v4-summary-grid">
            <article className="v4-summary-card">
              <p>Nama Batch</p>
              <strong>{detail.batchName}</strong>
            </article>
            <article className="v4-summary-card">
              <p>Waktu</p>
              <strong>{fmtDateTime(detail.createdAt)}</strong>
            </article>
            <article className="v4-summary-card">
              <p>Admin</p>
              <strong>{detail.adminUsername}</strong>
            </article>
            <article className="v4-summary-card">
              <p>Metode</p>
              <strong>
                <span className={`v4-method-chip is-${detail.metode.toLowerCase()}`}>{detail.metode}</span>
              </strong>
            </article>
            <article className="v4-summary-card">
              <p>Total Transaksi</p>
              <strong>{fmt(detail.totalItem)}</strong>
            </article>
            <article className="v4-summary-card">
              <p>Total Nominal</p>
              <strong>Rp {fmt(detail.totalNominal)}</strong>
            </article>
          </div>

          <div className="v4-history-filter">
            <input
              placeholder="Cari NIS, Nama, Kelas, atau Tagihan..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="v4-view-tabs">
            <Tabs
              tabs={[
                { label: "UI Daftar", value: "list" },
                { label: "UI Matrix V4", value: "matrix" },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as "list" | "matrix")}
            />
          </div>

          <div className="v4-icon-legend">
            <span><ActionIcon action="lunas" /> = Lunas</span>
            <span><ActionIcon action="edit" /> = Cicil Tagihan</span>
          </div>

          {viewMode === "list" ? (
            <div className="table-wrap">
              <table className="v4-sticky-head">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>NIS - Nama</th>
                    <th>Kelas</th>
                    <th>Nama Tagihan</th>
                    <th>Aksi</th>
                    <th>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={`${detail.id}-${item.tagihanId}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{item.nis} - {item.santriNama}</td>
                      <td>{item.kelas}</td>
                      <td>{item.tagihanLabel}</td>
                      <td><ActionIcon action={item.action} /></td>
                      <td className="v4-td-money">Rp {fmt(item.nominalBayar)}</td>
                    </tr>
                  ))}
                  {!filteredItems.length ? (
                    <tr>
                      <td colSpan={6}>Tidak ada data sesuai pencarian.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="v3-table v4-detail-matrix">
                <thead>
                  <tr>
                    <th className="v3-sticky v3-sticky-1" rowSpan={2}>NIS</th>
                    <th className="v3-sticky v3-sticky-2" rowSpan={2}>Nama</th>
                    <th className="v3-sticky v3-sticky-3" rowSpan={2}>Kelas</th>
                    {matrixGroupedColumns.map((group) => (
                      <th key={group.group} colSpan={group.cols.length}>{group.group}</th>
                    ))}
                    <th rowSpan={2}>Total</th>
                  </tr>
                  <tr>
                    {matrixColumnMeta.map((col) => (
                      <th key={`${col.key}-sub`}>{col.sub}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row, rowIndex) => (
                    <tr key={`${row.nis}-${row.santriNama}-${row.kelas}`}>
                      <td className="v3-sticky v3-sticky-1">{row.nis}</td>
                      <td className="v3-sticky v3-sticky-2">{row.santriNama}</td>
                      <td className="v3-sticky v3-sticky-3">{row.kelas}</td>
                      {matrixColumns.map((col) => {
                        const cell = row.cells[col];
                        return (
                          <td key={`${row.nis}-${col}`}>
                            {!cell ? (
                              <span className="v3-cell-empty">—</span>
                            ) : (
                              <span className="v4-matrix-cell">
                                <ActionIcon action={cell.action} />
                                <strong>Rp {fmt(cell.nominal)}</strong>
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="v4-td-money"><strong>Rp {fmt(matrixRowTotals[rowIndex] || 0)}</strong></td>
                    </tr>
                  ))}
                  {!matrixRows.length ? (
                    <tr>
                      <td colSpan={4 + matrixColumns.length}>Tidak ada data sesuai pencarian.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}

          <section className="v4-history-files">
            <div className="v4-history-head">
              <h3>File Pendukung ({detail.files.length})</h3>
              <button type="button" className="btn-secondary" onClick={downloadAllFiles} disabled={!detail.files.length}>
                Download Semua
              </button>
            </div>

            {!detail.files.length ? (
              <p className="hint-text">Tidak ada file pendukung pada batch ini.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama File</th>
                      <th>Tipe</th>
                      <th>Ukuran</th>
                      <th>Preview</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.files.map((file, index) => {
                      const previewable = canPreviewImage(file.name) || canPreviewPdf(file.name);
                      return (
                        <tr key={file.url}>
                          <td>{index + 1}</td>
                          <td>{file.name}</td>
                          <td>{fileTypeLabel(file.name)}</td>
                          <td>{formatFileSize(file.size)}</td>
                          <td>
                            {previewable ? (
                              <button type="button" className="btn-secondary" onClick={() => setPreviewFile(file)}>
                                Preview
                              </button>
                            ) : (
                              <span className="hint-text">Tidak didukung</span>
                            )}
                          </td>
                          <td>
                            <a href={file.url} download={file.name} className="btn-secondary">
                              Download
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      <Modal
        open={!!previewFile}
        title={previewFile ? `Preview: ${previewFile.name}` : "Preview File"}
        onClose={() => setPreviewFile(null)}
        footer={(
          <>
            {previewFile ? (
              <a href={previewFile.url} download={previewFile.name} className="btn-secondary">
                Download
              </a>
            ) : null}
            <button type="button" className="btn-secondary" onClick={() => setPreviewFile(null)}>
              Tutup
            </button>
          </>
        )}
      >
        {previewFile ? (
          <div className="v4-preview-modal-content">
            {canPreviewImage(previewFile.name) ? (
              <Image
                src={previewFile.url}
                alt={previewFile.name}
                width={1400}
                height={980}
                className="v4-file-preview-image"
                unoptimized
              />
            ) : null}
            {canPreviewPdf(previewFile.name) ? (
              <iframe title={previewFile.name} src={previewFile.url} className="v4-file-preview-pdf" />
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
