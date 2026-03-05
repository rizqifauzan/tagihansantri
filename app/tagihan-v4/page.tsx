"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/app/dashboard/_components/primitives";

type MasterOption = { id: string; label: string };
type PicOption = { id: string; username: string };

type CellData = {
  display: string;
  tagihanId: string | null;
  sisa: number;
  nominal: number;
  nominalTerbayar: number;
  status: string;
};

type MatrixColumn = {
  key: string;
  masterId: string;
  masterLabel: string;
  periodeKey: string;
};

type MatrixRow = {
  santri: {
    id: string;
    nis: string;
    nama: string;
    kelas: { id: string; nama: string } | null;
  };
  cells: Record<string, CellData>;
  totalNominal: number;
  totalNominalDiskon: number;
  totalTerbayar: number;
  totalSisa: number;
  countTagihan: number;
};

type MatrixResponse = {
  masters: MasterOption[];
  pics: PicOption[];
  columns: MatrixColumn[];
  rows: MatrixRow[];
};

type DraftItem = {
  tagihanId: string;
  santriId: string;
  nis: string;
  santriNama: string;
  kelas: string;
  tagihanLabel: string;
  colKey: string;
  originalSisa: number;
  newSisa: number;
  nominalBayar: number;
  action: "edit" | "lunas";
};

type CellState =
  | { type: "idle" }
  | { type: "editing"; value: string }
  | { type: "error"; message: string };

const fmt = (n: number) => n.toLocaleString("id-ID");
const parseInput = (v: string) => Number(v.replace(/\./g, "").replace(/,/g, ".").trim());
const DRAFT_STORAGE_KEY = "tagihan-v4-drafts-v1";

const isEditable = (cell: CellData) =>
  cell.tagihanId !== null &&
  cell.status !== "LUNAS" &&
  cell.status !== "BATAL" &&
  cell.sisa > 0;

function CheckboxList<T extends { id: string }>({
  items,
  selected,
  getLabel,
  onToggle,
  emptyText,
}: {
  items: T[];
  selected: string[];
  getLabel: (item: T) => string;
  onToggle: (id: string) => void;
  emptyText?: string;
}) {
  return (
    <div className="v3-checklist">
      {items.length === 0 ? (
        <p className="filter-checkbox-empty">{emptyText ?? "Memuat..."}</p>
      ) : (
        items.map((item) => (
          <label key={item.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
            {getLabel(item)}
          </label>
        ))
      )}
    </div>
  );
}

function EditableCellV4({
  cell,
  row,
  col,
  isEditMode,
  draft,
  onDraftUpsert,
  onDraftClear,
}: {
  cell: CellData;
  row: MatrixRow;
  col: MatrixColumn;
  isEditMode: boolean;
  draft: DraftItem | undefined;
  onDraftUpsert: (item: DraftItem) => void;
  onDraftClear: (tagihanId: string) => void;
}) {
  const [state, setState] = useState<CellState>({ type: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const editable = isEditMode && isEditable(cell);
  const effectiveSisa = draft ? draft.newSisa : cell.sisa;

  useEffect(() => {
    setState({ type: "idle" });
  }, [cell.tagihanId, cell.sisa, isEditMode, draft?.newSisa]);

  useEffect(() => {
    if (state.type === "editing") inputRef.current?.focus();
  }, [state.type]);

  function setDraft(nextSisa: number, action: "edit" | "lunas") {
    if (!cell.tagihanId) return;
    if (!Number.isFinite(nextSisa) || nextSisa < 0 || nextSisa > cell.sisa) {
      setState({ type: "error", message: "Nilai sisa tidak valid" });
      return;
    }

    if (nextSisa === cell.sisa) {
      onDraftClear(cell.tagihanId);
      setState({ type: "idle" });
      return;
    }

    const nominalBayar = cell.sisa - nextSisa;

    onDraftUpsert({
      tagihanId: cell.tagihanId,
      santriId: row.santri.id,
      nis: row.santri.nis,
      santriNama: row.santri.nama,
      kelas: row.santri.kelas?.nama || "-",
      tagihanLabel: `${col.masterLabel} (${col.periodeKey})`,
      colKey: col.key,
      originalSisa: cell.sisa,
      newSisa: nextSisa,
      nominalBayar,
      action,
    });

    setState({ type: "idle" });
  }

  if (!isEditMode) {
    if (!cell.tagihanId) return <span className="v3-cell-empty">—</span>;
    if (cell.status === "LUNAS") return <span className="v3-cell-lunas-text">✓ Lunas</span>;
    return <span className="v3-cell-text">{fmt(effectiveSisa)}</span>;
  }

  if (!editable && !draft) {
    if (!cell.tagihanId) return <span className="v3-cell-empty">—</span>;
    if (cell.status === "LUNAS") return <span className="v3-cell-lunas-text">✓ Lunas</span>;
    return <span className="v3-cell-text">{fmt(cell.sisa)}</span>;
  }

  if (state.type === "editing") {
    return (
      <span className="v3-cell-editing-wrap">
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={cell.sisa}
          step={1000}
          value={state.value}
          className="v3-cell-input"
          onChange={(e) => setState({ type: "editing", value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setDraft(parseInput(state.value), "edit");
            }
            if (e.key === "Escape") setState({ type: "idle" });
          }}
          onBlur={() => setDraft(parseInput(state.value), "edit")}
        />
        <span className="v3-cell-hint">Sisa awal: {fmt(cell.sisa)}</span>
      </span>
    );
  }

  return (
    <span className="v3-cell-editable">
      <span
        className="v3-cell-value-action"
        onClick={() => setState({ type: "editing", value: String(effectiveSisa) })}
        title={`Klik angka untuk edit · Sisa saat ini: ${fmt(effectiveSisa)}`}
      >
        {fmt(effectiveSisa)}
      </span>

      <span
        className="v3-cell-edit-icon v3-cell-lunas-action"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(0, "lunas");
        }}
        title="Set draft lunas"
      >
        ✓
      </span>

      {draft ? (
        <span
          className="v4-draft-reset"
          onClick={(e) => {
            e.stopPropagation();
            onDraftClear(draft.tagihanId);
          }}
          title="Batalkan perubahan cell ini"
        >
          ↺
        </span>
      ) : null}

      {state.type === "error" ? <span className="v3-cell-error">✕ {state.message}</span> : null}
    </span>
  );
}

export default function TagihanV4Page() {
  const [name, setName] = useState("");
  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredColKey, setHoveredColKey] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [adminName, setAdminName] = useState("-");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchMetode, setBatchMetode] = useState<"TUNAI" | "TRANSFER">("TUNAI");
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [data, setData] = useState<MatrixResponse>({ masters: [], pics: [], columns: [], rows: [] });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(text);
    toastTimerRef.current = setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as DraftItem[];
      const normalized = Object.fromEntries(parsed.map((item) => [item.tagihanId, item]));
      setDrafts(normalized);
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const list = Object.values(drafts);
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(list));
  }, [drafts]);

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (name.trim()) params.set("name", name.trim());
      if (selectedMasters.length > 0) params.set("masterIds", selectedMasters.join(","));
      if (selectedPics.length > 0) params.set("picUserIds", selectedPics.join(","));

      const res = await fetch(`/api/tagihan-v2?${params.toString()}`);
      const json = (await res.json()) as MatrixResponse | { message?: string };
      if (!res.ok) {
        const err = "message" in json ? json.message : "";
        throw new Error(err || "Gagal memuat data");
      }

      const matrix = json as MatrixResponse;
      setData(matrix);

      setDrafts((prev) => {
        const lookup = new Set<string>();
        for (const row of matrix.rows) {
          for (const col of matrix.columns) {
            const cell = row.cells[col.key];
            if (cell?.tagihanId && isEditable(cell)) lookup.add(cell.tagihanId);
          }
        }
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (!lookup.has(key)) delete next[key];
        }
        return next;
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => undefined);
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => setAdminName(json.username || "-"))
      .catch(() => setAdminName("-"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedColumns = useMemo(() => {
    const map = new Map<string, { label: string; cols: MatrixColumn[] }>();
    for (const col of data.columns) {
      const entry = map.get(col.masterId) || { label: col.masterLabel, cols: [] };
      entry.cols.push(col);
      map.set(col.masterId, entry);
    }
    return Array.from(map.entries()).map(([masterId, val]) => ({ masterId, label: val.label, cols: val.cols }));
  }, [data.columns]);

  const summary = useMemo(() => {
    const items = Object.values(drafts);
    const totalNominal = items.reduce((sum, item) => sum + item.nominalBayar, 0);
    const santriCount = new Set(items.map((item) => item.santriId)).size;
    return { itemCount: items.length, totalNominal, santriCount };
  }, [drafts]);

  const confirmRows = useMemo(() => {
    return Object.values(drafts).sort((a, b) => {
      const nisCmp = a.nis.localeCompare(b.nis);
      if (nisCmp !== 0) return nisCmp;
      return a.tagihanLabel.localeCompare(b.tagihanLabel);
    });
  }, [drafts]);

  const hasActiveFilters = name.trim() || selectedMasters.length > 0 || selectedPics.length > 0;

  function upsertDraft(item: DraftItem) {
    setDrafts((prev) => ({ ...prev, [item.tagihanId]: item }));
  }

  function clearDraft(tagihanId: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[tagihanId];
      return next;
    });
  }

  function clearAllDraft() {
    setDrafts({});
  }

  function openConfirm() {
    setSubmitError("");
    if (!batchName.trim()) {
      const nowText = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      setBatchName(`Update Batch ${nowText}`);
    }
    setConfirmOpen(true);
  }

  async function submitBatch() {
    setSubmitLoading(true);
    setSubmitError("");
    try {
      const payloadItems = confirmRows.map((item) => ({
        tagihanId: item.tagihanId,
        nis: item.nis,
        santriNama: item.santriNama,
        kelas: item.kelas,
        tagihanLabel: item.tagihanLabel,
        action: item.action,
        nominalBayar: item.nominalBayar,
      }));

      const form = new FormData();
      form.set("batchName", batchName.trim());
      form.set("metode", batchMetode);
      form.set("items", JSON.stringify(payloadItems));
      for (const file of proofFiles) form.append("proofs", file);

      const res = await fetch("/api/tagihan-v4/batch-submit", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Submit batch gagal");

      clearAllDraft();
      setConfirmOpen(false);
      setBatchName("");
      setBatchMetode("TUNAI");
      setProofFiles([]);
      await loadData();
      showToast(`Submit batch berhasil · ${json.totalItem} item · Rp${fmt(json.totalNominal)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submit batch gagal");
    } finally {
      setSubmitLoading(false);
    }
  }

  const toggleMaster = (id: string) =>
    setSelectedMasters((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const togglePic = (id: string) =>
    setSelectedPics((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  return (
    <div className="v3-root">
      <aside className="v3-sidebar">
        <div className="v3-sidebar-inner">
          <div className="v3-brand">
            <span className="v3-brand-title">Laporan Matrix V4</span>
            <span className="v3-brand-sub">Draft Batch Pembayaran</span>
          </div>

          <div className="v3-filter-section">
            <p className="v3-filter-label">Nama Santri</p>
            <input
              className="v3-input"
              placeholder="Ketikkan nama santri..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
            />
          </div>

          <div className="v3-filter-section">
            <p className="v3-filter-label">
              Nama Tagihan
              {selectedMasters.length > 0 && <span className="v3-badge">{selectedMasters.length}</span>}
            </p>
            <CheckboxList
              items={data.masters}
              selected={selectedMasters}
              getLabel={(m) => m.label}
              onToggle={toggleMaster}
              emptyText="Belum ada data tagihan"
            />
          </div>

          <div className="v3-filter-section">
            <p className="v3-filter-label">
              PIC
              {selectedPics.length > 0 && <span className="v3-badge">{selectedPics.length}</span>}
            </p>
            <CheckboxList
              items={data.pics}
              selected={selectedPics}
              getLabel={(p) => p.username}
              onToggle={togglePic}
              emptyText="Belum ada PIC"
            />
          </div>

          <div className="v3-filter-section">
            <p className="v3-filter-label">Admin Aktif</p>
            <div className="v4-admin-pill">{adminName}</div>
          </div>

          <div className="v3-filter-actions">
            {hasActiveFilters ? (
              <button
                type="button"
                className="v3-btn-reset"
                onClick={() => {
                  setName("");
                  setSelectedMasters([]);
                  setSelectedPics([]);
                }}
              >
                Reset
              </button>
            ) : null}
            <button type="button" className="v3-btn-apply" onClick={() => loadData()} disabled={loading}>
              {loading ? "Memuat..." : "Terapkan"}
            </button>
          </div>
        </div>
      </aside>

      <main className="v3-main">
        <div className="v3-stats">
          <span>
            <strong>{fmt(data.rows.length)}</strong> Santri
          </span>
          <span className="v3-stats-dot" />
          <span>
            <strong>{fmt(data.columns.length)}</strong> Kolom
          </span>
          {loading ? <span className="v3-loading-pill">Memuat...</span> : null}

          <div className="v3-editmode-wrap">
            <button
              type="button"
              className={`v3-editmode-btn ${isEditMode ? "is-active" : ""}`}
              onClick={() => setIsEditMode((p) => !p)}
            >
              <span className="v3-editmode-icon">✏</span>
              {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
            </button>
            {isEditMode ? <span className="v3-editmode-hint">Perubahan disimpan sebagai draft sampai submit</span> : null}
          </div>
        </div>

        <div className="v4-submit-bar">
          <div className="v4-submit-summary">
            <span>{summary.itemCount} data berubah</span>
            <span>{summary.santriCount} santri</span>
            <span>Rp{fmt(summary.totalNominal)} diterima</span>
          </div>
          <div className="row-actions">
            <Link href="/tagihan-v4/history" className="btn-secondary">
              Lihat History
            </Link>
            <button type="button" className="btn-secondary" onClick={clearAllDraft} disabled={summary.itemCount === 0}>Reset Draft</button>
            <button type="button" onClick={openConfirm} disabled={summary.itemCount === 0}>Submit Draft</button>
          </div>
        </div>

        <div className="v4-notice">
          Semua perubahan belum masuk DB sebelum tombol <strong>Submit Draft</strong> dikonfirmasi.
        </div>

        {message ? <div className="v3-error">{message}</div> : null}
        {toast ? <div className="v3-toast">{toast}</div> : null}

        {isEditMode ? (
          <div className="v3-editmode-legend">
            <span className="v3-legend-item v3-legend-editable">• Bisa diedit / dilunasi</span>
            <span className="v3-legend-item v3-legend-paid">• Sudah lunas</span>
            <span className="v3-legend-item v3-legend-empty">• Tidak ada tagihan</span>
            <span className="v3-legend-desc">Cell merah = perubahan draft belum tersubmit</span>
          </div>
        ) : null}

        <div className="v3-table-wrap">
          <table
            className={`v3-table${isEditMode ? " v3-table--editmode" : ""}`}
            onMouseLeave={() => {
              setHoveredColKey(null);
              setHoveredRowId(null);
            }}
          >
            <thead>
              <tr>
                <th className="v3-sticky v3-sticky-1" rowSpan={2}>NIS</th>
                <th className="v3-sticky v3-sticky-2" rowSpan={2}>Nama</th>
                <th className="v3-sticky v3-sticky-3" rowSpan={2}>Kelas</th>
                {groupedColumns.map((group) => (
                  <th
                    key={group.masterId}
                    colSpan={group.cols.length}
                    className={isEditMode && group.cols.some((c) => c.key === hoveredColKey) ? "v3-col-highlight" : ""}
                  >
                    {group.label}
                  </th>
                ))}
                <th rowSpan={2}>Total Tagihan</th>
                <th rowSpan={2}>Terbayar</th>
                <th rowSpan={2}>Sisa (Belum Bayar)</th>
              </tr>
              <tr>
                {data.columns.map((col) => (
                  <th key={col.key} className={isEditMode && hoveredColKey === col.key ? "v3-col-highlight" : ""}>
                    {col.periodeKey}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.santri.id} className={isEditMode && hoveredRowId === row.santri.id ? "v3-row-highlight" : ""}>
                  <td className="v3-sticky v3-sticky-1">{row.santri.nis}</td>
                  <td className="v3-sticky v3-sticky-2">{row.santri.nama}</td>
                  <td className="v3-sticky v3-sticky-3">{row.santri.kelas?.nama || "—"}</td>
                  {data.columns.map((col) => {
                    const cell = row.cells[col.key];
                    const draft = cell?.tagihanId ? drafts[cell.tagihanId] : undefined;
                    const cellEditable = isEditMode && cell && isEditable(cell);
                    const cellLunas = cell?.status === "LUNAS";
                    const cellEmpty = !cell?.tagihanId && !cell?.nominal;
                    const rowHovered = isEditMode && hoveredRowId === row.santri.id;
                    const colHovered = isEditMode && hoveredColKey === col.key;

                    return (
                      <td
                        key={`${row.santri.id}-${col.key}`}
                        className={[
                          "v3-data-cell",
                          isEditMode && cellEditable ? "v3-cell-can-edit" : "",
                          isEditMode && cellLunas ? "v3-cell-lunas" : "",
                          isEditMode && cellEmpty ? "v3-cell-void" : "",
                          draft ? "v4-cell-draft" : "",
                          rowHovered ? "v3-row-highlight" : "",
                          colHovered ? "v3-col-highlight" : "",
                          rowHovered && colHovered ? "v3-cross-highlight" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onMouseEnter={() => {
                          if (!isEditMode) return;
                          setHoveredColKey(col.key);
                          setHoveredRowId(row.santri.id);
                        }}
                      >
                        {cell ? (
                          <EditableCellV4
                            cell={cell}
                            row={row}
                            col={col}
                            isEditMode={isEditMode}
                            draft={draft}
                            onDraftUpsert={upsertDraft}
                            onDraftClear={clearDraft}
                          />
                        ) : "—"}
                      </td>
                    );
                  })}
                  <td className="v3-td-num">{fmt(row.totalNominal)}</td>
                  <td className="v3-td-num v3-td-paid">{fmt(row.totalTerbayar)}</td>
                  <td className="v3-td-num v3-td-due">{fmt(row.totalSisa)}</td>
                </tr>
              ))}
              {!data.rows.length ? (
                <tr>
                  <td colSpan={3 + data.columns.length + 3} className="v3-empty-cell">
                    {loading ? "Memuat data..." : "Tidak ada data yang cocok."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

      </main>

      <Modal
        open={confirmOpen}
        title="Konfirmasi Submit Batch"
        onClose={() => setConfirmOpen(false)}
        footer={(
          <>
            <button type="button" onClick={submitBatch} disabled={submitLoading || !confirmRows.length || !batchName.trim()}>
              {submitLoading ? "Menyimpan..." : "Konfirmasi Submit"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)} disabled={submitLoading}>
              Batal
            </button>
          </>
        )}
      >
        <div className="stack-block">
          <div className="hint-text">
            Admin: <strong>{adminName}</strong> | Total Item: <strong>{summary.itemCount}</strong> | Total Santri: <strong>{summary.santriCount}</strong> | Total Nominal: <strong>Rp{fmt(summary.totalNominal)}</strong>
          </div>

          <div className="form-grid">
            <label htmlFor="batchName">Nama Batch</label>
            <input id="batchName" value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Contoh: edit laporan syahriyyah" />

            <label htmlFor="batchMetode">Metode Pembayaran</label>
            <select id="batchMetode" value={batchMetode} onChange={(e) => setBatchMetode(e.target.value as "TUNAI" | "TRANSFER")}>
              <option value="TUNAI">TUNAI</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>

            <label htmlFor="proofFiles">Bukti Pendukung (boleh lebih dari 1)</label>
            <input id="proofFiles" type="file" multiple onChange={(e) => setProofFiles(Array.from(e.target.files || []))} />
          </div>

          {proofFiles.length ? (
            <div className="v4-files">
              {proofFiles.map((file) => (
                <span key={`${file.name}-${file.size}`}>{file.name}</span>
              ))}
            </div>
          ) : null}

          {submitError ? <p className="error-text">{submitError}</p> : null}

          <div className="table-wrap">
            <table>
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
                {confirmRows.map((item, index) => (
                  <tr key={item.tagihanId}>
                    <td>{index + 1}</td>
                    <td>{item.nis} - {item.santriNama}</td>
                    <td>{item.kelas}</td>
                    <td>{item.tagihanLabel}</td>
                    <td>{item.action === "lunas" ? "Lunas" : "Edit"}</td>
                    <td>Rp{fmt(item.nominalBayar)}</td>
                  </tr>
                ))}
                {!confirmRows.length ? (
                  <tr>
                    <td colSpan={6}>Belum ada draft perubahan</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {submitError ? (
            <button type="button" className="btn-secondary" onClick={submitBatch} disabled={submitLoading || !confirmRows.length || !batchName.trim()}>
              Coba Lagi
            </button>
          ) : null}

          <div className="hint-text">Submit diproses transaction batch. Jika ada 1 item gagal, semua perubahan dibatalkan.</div>
        </div>
      </Modal>
    </div>
  );
}
