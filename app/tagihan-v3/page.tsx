"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("id-ID");
const parseInput = (v: string) =>
    Number(v.replace(/\./g, "").replace(/,/g, ".").trim());
const isEditable = (cell: CellData) =>
    cell.tagihanId !== null &&
    cell.status !== "LUNAS" &&
    cell.status !== "BATAL" &&
    cell.sisa > 0;

// ── Checkbox list component ────────────────────────────────────
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

// ── Editable Cell ─────────────────────────────────────────────
type CellState =
    | { type: "idle" }
    | { type: "editing"; value: string }
    | { type: "saving" }
    | { type: "success"; newSisa: number }
    | { type: "error"; message: string };

function EditableCell({
    cell,
    isEditMode,
    onPaid,
    meta,
}: {
    cell: CellData;
    isEditMode: boolean;
    onPaid: (
        tagihanId: string,
        amount: number,
        newSisa: number,
        action: "edit" | "lunas",
        meta: { santriNama: string; tagihanLabel: string }
    ) => void;
    meta: { santriNama: string; tagihanLabel: string };
}) {
    const [state, setState] = useState<CellState>({ type: "idle" });
    const inputRef = useRef<HTMLInputElement>(null);

    const editable = isEditMode && isEditable(cell);

    // Reset on cell change / mode change
    useEffect(() => {
        setState({ type: "idle" });
    }, [cell.tagihanId, cell.sisa, isEditMode]);

    const startEdit = () => {
        if (!editable) return;
        setState({ type: "editing", value: String(cell.sisa) });
        setTimeout(() => {
            inputRef.current?.select();
        }, 0);
    };

    const cancel = () => setState({ type: "idle" });

    const confirmEdit = useCallback(async () => {
        if (state.type !== "editing") return;
        const newSisa = parseInput(state.value);

        if (!Number.isFinite(newSisa) || newSisa < 0) {
            setState({ type: "error", message: "Nilai tidak valid" });
            return;
        }
        if (newSisa >= cell.sisa) {
            setState({ type: "idle" }); // no change
            return;
        }

        const paymentAmount = cell.sisa - newSisa;
        setState({ type: "saving" });

        try {
            const res = await fetch(`/api/tagihan/${cell.tagihanId}/pembayaran`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nominal: paymentAmount, metode: "TUNAI" }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.message || "Gagal menyimpan pembayaran");
            }
            setState({ type: "success", newSisa });
            onPaid(cell.tagihanId!, paymentAmount, newSisa, "edit", meta);
            setTimeout(() => setState({ type: "idle" }), 2000);
        } catch (err) {
            setState({
                type: "error",
                message: err instanceof Error ? err.message : "Terjadi kesalahan",
            });
        }
    }, [state, cell, onPaid, meta]);

    const lunasiTagihan = useCallback(async () => {
        if (!editable || cell.sisa <= 0 || !cell.tagihanId) return;
        const paymentAmount = cell.sisa;
        setState({ type: "saving" });

        try {
            const res = await fetch(`/api/tagihan/${cell.tagihanId}/pembayaran`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nominal: paymentAmount, metode: "TUNAI" }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.message || "Gagal menyimpan pembayaran");
            }
            setState({ type: "success", newSisa: 0 });
            onPaid(cell.tagihanId!, paymentAmount, 0, "lunas", meta);
            // Auto-dismiss after 2s
            setTimeout(() => setState({ type: "idle" }), 2000);
        } catch (err) {
            setState({
                type: "error",
                message: err instanceof Error ? err.message : "Terjadi kesalahan",
            });
        }
    }, [cell, editable, onPaid, meta]);

    useEffect(() => {
        if (state.type === "editing") inputRef.current?.focus();
    }, [state.type]);

    if (!isEditMode) {
        // Normal view: show sisa (unpaid amount)
        if (!cell.tagihanId) return <span className="v3-cell-empty">—</span>;
        if (cell.status === "LUNAS") return <span className="v3-cell-lunas-text">✓ Lunas</span>;
        return <span className="v3-cell-text">{fmt(cell.sisa)}</span>;
    }

    if (!editable) {
        // Edit mode but not editable (lunas / batal / no tagihan)
        if (!cell.tagihanId) return <span className="v3-cell-empty">—</span>;
        if (cell.status === "LUNAS") return <span className="v3-cell-lunas-text">✓ Lunas</span>;
        return <span className="v3-cell-text">{fmt(cell.sisa)}</span>;
    }

    if (state.type === "saving") {
        return <span className="v3-cell-saving">Menyimpan…</span>;
    }

    if (state.type === "success") {
        return (
            <span className="v3-cell-success">
                ✓ Sisa: {fmt(state.newSisa)}
            </span>
        );
    }

    if (state.type === "error") {
        return (
            <span
                className="v3-cell-error"
                title={state.message}
                onClick={startEdit}
                style={{ cursor: "pointer" }}
            >
                ✕ {state.message}
            </span>
        );
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
                    onChange={(e) =>
                        setState({ type: "editing", value: e.target.value })
                    }
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            confirmEdit();
                        }
                        if (e.key === "Escape") cancel();
                    }}
                    onBlur={confirmEdit}
                />
                <span className="v3-cell-hint">
                    Sisa: {fmt(cell.sisa)}
                </span>
            </span>
        );
    }

    return (
        <span className="v3-cell-editable">
            <span
                className="v3-cell-value-action"
                onClick={startEdit}
                title={`Klik angka untuk edit · Sisa saat ini: ${fmt(cell.sisa)}`}
            >
                {fmt(cell.sisa)}
            </span>
            <span
                className="v3-cell-edit-icon v3-cell-lunas-action"
                onClick={(e) => {
                    e.stopPropagation();
                    lunasiTagihan();
                }}
                title="Klik ikon untuk lunasi penuh"
            >
                ✓
            </span>
        </span>
    );
}

// ── Main Page ─────────────────────────────────────────────────
export default function TagihanV3Page() {
    const [name, setName] = useState("");
    const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
    const [selectedPics, setSelectedPics] = useState<string[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [hoveredColKey, setHoveredColKey] = useState<string | null>(null);
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [toast, setToast] = useState("");
    const [data, setData] = useState<MatrixResponse>({
        masters: [],
        pics: [],
        columns: [],
        rows: [],
    });
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function loadData() {
        setLoading(true);
        setMessage("");
        try {
            const params = new URLSearchParams();
            if (name.trim()) params.set("name", name.trim());
            if (selectedMasters.length > 0)
                params.set("masterIds", selectedMasters.join(","));
            if (selectedPics.length > 0)
                params.set("picUserIds", selectedPics.join(","));

            const res = await fetch(`/api/tagihan-v2?${params.toString()}`);
            const json = (await res.json()) as MatrixResponse | { message?: string };
            if (!res.ok) {
                const err = "message" in json ? json.message : "";
                throw new Error(err || "Gagal memuat data");
            }
            setData(json as MatrixResponse);
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData().catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const groupedColumns = useMemo(() => {
        const map = new Map<string, { label: string; cols: MatrixColumn[] }>();
        for (const col of data.columns) {
            const entry = map.get(col.masterId) || { label: col.masterLabel, cols: [] };
            entry.cols.push(col);
            map.set(col.masterId, entry);
        }
        return Array.from(map.entries()).map(([masterId, val]) => ({
            masterId,
            label: val.label,
            cols: val.cols,
        }));
    }, [data.columns]);

    // Update a cell's data in place after a payment succeeds
    const showToast = useCallback((text: string) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast(text);
        toastTimerRef.current = setTimeout(() => setToast(""), 2600);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const handlePaid = useCallback(
        (
            tagihanId: string,
            amount: number,
            newSisa: number,
            action: "edit" | "lunas",
            meta: { santriNama: string; tagihanLabel: string }
        ) => {
            setData((prev) => ({
                ...prev,
                rows: prev.rows.map((row) => {
                    const updatedCells = { ...row.cells };
                    let changed = false;
                    for (const key of Object.keys(updatedCells)) {
                        const cell = updatedCells[key];
                        if (cell.tagihanId === tagihanId) {
                            updatedCells[key] = {
                                ...cell,
                                nominalTerbayar: cell.nominalTerbayar + amount,
                                sisa: newSisa,
                                status: newSisa <= 0 ? "LUNAS" : cell.status,
                                display: cell.nominal.toLocaleString("id-ID"),
                            };
                            changed = true;
                        }
                    }
                    if (!changed) return row;
                    return {
                        ...row,
                        cells: updatedCells,
                        totalTerbayar: row.totalTerbayar + amount,
                        totalSisa: Math.max(0, row.totalSisa - amount),
                    };
                }),
            }));
            showToast(
                `${action === "lunas" ? "Tagihan dilunasi" : "Pembayaran dicatat"} · ${meta.santriNama} · ${meta.tagihanLabel} · Rp${fmt(amount)}`
            );
        },
        [showToast]
    );

    const toggleMaster = (id: string) =>
        setSelectedMasters((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    const togglePic = (id: string) =>
        setSelectedPics((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );

    const hasActiveFilters =
        name.trim() || selectedMasters.length > 0 || selectedPics.length > 0;

    return (
        <div className="v3-root">
            {/* ── Left Filter Sidebar ── */}
            <aside className="v3-sidebar">
                <div className="v3-sidebar-inner">
                    <div className="v3-brand">
                        <span className="v3-brand-title">Laporan Matrix</span>
                        <span className="v3-brand-sub">Filter &amp; Analisis Tagihan</span>
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
                            {selectedMasters.length > 0 && (
                                <span className="v3-badge">{selectedMasters.length}</span>
                            )}
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
                            {selectedPics.length > 0 && (
                                <span className="v3-badge">{selectedPics.length}</span>
                            )}
                        </p>
                        <CheckboxList
                            items={data.pics}
                            selected={selectedPics}
                            getLabel={(p) => p.username}
                            onToggle={togglePic}
                            emptyText="Belum ada PIC"
                        />
                    </div>

                    <div className="v3-filter-actions">
                        {hasActiveFilters && (
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
                        )}
                        <button
                            type="button"
                            className="v3-btn-apply"
                            onClick={() => loadData()}
                            disabled={loading}
                        >
                            {loading ? "Memuat..." : "Terapkan"}
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Area ── */}
            <main className="v3-main">
                <div className="v3-stats">
                    <span>
                        <strong>{fmt(data.rows.length)}</strong> Santri
                    </span>
                    <span className="v3-stats-dot" />
                    <span>
                        <strong>{fmt(data.columns.length)}</strong> Kolom
                    </span>
                    {loading && <span className="v3-loading-pill">Memuat...</span>}

                    {/* Edit Mode Toggle */}
                    <div className="v3-editmode-wrap">
                        <button
                            type="button"
                            className={`v3-editmode-btn ${isEditMode ? "is-active" : ""}`}
                            onClick={() => setIsEditMode((p) => !p)}
                        >
                            <span className="v3-editmode-icon">{isEditMode ? "✏" : "✏"}</span>
                            {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
                        </button>
                        {isEditMode && (
                            <span className="v3-editmode-hint">
                                Klik angka untuk edit, klik ikon ✓ untuk lunasi
                            </span>
                        )}
                    </div>
                </div>

                {message && <div className="v3-error">{message}</div>}
                {toast && <div className="v3-toast">{toast}</div>}

                {/* Edit mode legend */}
                {isEditMode && (
                    <div className="v3-editmode-legend">
                        <span className="v3-legend-item v3-legend-editable">• Bisa dilunasi</span>
                        <span className="v3-legend-item v3-legend-paid">• Sudah lunas</span>
                        <span className="v3-legend-item v3-legend-empty">• Tidak ada tagihan</span>
                        <span className="v3-legend-desc">
                            Klik <strong>angka</strong> untuk edit sisa, klik ikon <strong>✓</strong> untuk lunasi penuh
                        </span>
                    </div>
                )}

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
                                        className={
                                            isEditMode && group.cols.some((c) => c.key === hoveredColKey)
                                                ? "v3-col-highlight"
                                                : ""
                                        }
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
                                    <th
                                        key={col.key}
                                        className={isEditMode && hoveredColKey === col.key ? "v3-col-highlight" : ""}
                                    >
                                        {col.periodeKey}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row) => (
                                <tr
                                    key={row.santri.id}
                                    className={isEditMode && hoveredRowId === row.santri.id ? "v3-row-highlight" : ""}
                                >
                                    <td className="v3-sticky v3-sticky-1">{row.santri.nis}</td>
                                    <td className="v3-sticky v3-sticky-2">{row.santri.nama}</td>
                                    <td className="v3-sticky v3-sticky-3">{row.santri.kelas?.nama || "—"}</td>
                                    {data.columns.map((col) => {
                                        const cell = row.cells[col.key];
                                        const cellEditable = isEditMode && isEditable(cell);
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
                                                    <EditableCell
                                                        cell={cell}
                                                        isEditMode={isEditMode}
                                                        onPaid={handlePaid}
                                                        meta={{
                                                            santriNama: row.santri.nama,
                                                            tagihanLabel: `${col.masterLabel} (${col.periodeKey})`,
                                                        }}
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
                            {!data.rows.length && (
                                <tr>
                                    <td
                                        colSpan={3 + data.columns.length + 3}
                                        className="v3-empty-cell"
                                    >
                                        {loading ? "Memuat data..." : "Tidak ada data yang cocok."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
