"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/app/dashboard/_components/primitives";

type MasterOption = { id: string; label: string };
type PicOption = { id: string; username: string };

type MatrixColumn = {
    key: string;
    masterId: string;
    masterLabel: string;
    periodeKey: string;
};

type CellData = {
    display: string;
    tagihanId: string | null;
    sisa: number;
    nominal: number;
    nominalTerbayar: number;
    status: string;
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

const fmt = (n: number) => n.toLocaleString("id-ID");

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
        <div className="filter-checkbox-list">
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

export default function TagihanMatrixV2Page() {
    const [name, setName] = useState("");
    const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
    const [selectedPics, setSelectedPics] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [data, setData] = useState<MatrixResponse>({
        masters: [],
        pics: [],
        columns: [],
        rows: [],
    });

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
            setData(json as MatrixResponse);
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    }

    // Initial load to populate filter options
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

    const toggleMaster = (id: string) =>
        setSelectedMasters((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );

    const togglePic = (id: string) =>
        setSelectedPics((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );

    const hasActiveFilters = name.trim() || selectedMasters.length > 0 || selectedPics.length > 0;

    function handleReset() {
        setName("");
        setSelectedMasters([]);
        setSelectedPics([]);
    }

    return (
        <section className="dashboard-main">
            <header className="page-head">
                <div>
                    <h2>Laporan Matrix V2</h2>
                    <p>Laporan tagihan santri dengan filter Nama, Tagihan, dan PIC.</p>
                </div>
            </header>

            {/* Filter Card */}
            <Card title="Filter Laporan">
                <div className="v2-filter-grid">

                    {/* Filter: Nama Santri */}
                    <div className="v2-filter-col">
                        <p className="v2-filter-label">Nama Santri</p>
                        <input
                            id="filter-name"
                            placeholder="Ketikkan nama santri..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && loadData()}
                        />
                    </div>

                    {/* Filter: Tagihan Master */}
                    <div className="v2-filter-col">
                        <p className="v2-filter-label">
                            Nama Tagihan
                            {selectedMasters.length > 0 && (
                                <span className="v2-filter-badge">{selectedMasters.length} dipilih</span>
                            )}
                        </p>
                        <CheckboxList
                            items={data.masters}
                            selected={selectedMasters}
                            getLabel={(m) => m.label}
                            onToggle={toggleMaster}
                            emptyText="Belum ada tagihan"
                        />
                    </div>

                    {/* Filter: PIC */}
                    <div className="v2-filter-col">
                        <p className="v2-filter-label">
                            PIC (Person In Charge)
                            {selectedPics.length > 0 && (
                                <span className="v2-filter-badge">{selectedPics.length} dipilih</span>
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
                </div>

                {/* Action Row */}
                <div className="v2-filter-actions">
                    {hasActiveFilters && (
                        <button type="button" className="btn-ghost" onClick={handleReset}>
                            Reset Filter
                        </button>
                    )}
                    <button type="button" onClick={() => loadData()} disabled={loading}>
                        {loading ? "Memuat..." : "Terapkan Filter"}
                    </button>
                </div>
            </Card>

            {/* Result Card */}
            <Card
                title="Hasil Matrix"
                subtitle={`${fmt(data.rows.length)} Santri · ${fmt(data.columns.length)} Kolom Tagihan`}
            >
                {message ? <p className="error-text">{message}</p> : null}

                <div className="table-wrap matrix-wrap">
                    <table className="matrix-table">
                        <thead>
                            <tr>
                                <th className="sticky-col sticky-col-1" rowSpan={2}>NIS</th>
                                <th className="sticky-col sticky-col-2" rowSpan={2}>Nama</th>
                                <th rowSpan={2}>Kelas</th>
                                {groupedColumns.map((group) => (
                                    <th key={group.masterId} colSpan={group.cols.length}>
                                        {group.label}
                                    </th>
                                ))}
                                <th rowSpan={2}>Total Tagihan</th>
                                <th rowSpan={2}>Terbayar</th>
                                <th rowSpan={2}>Sisa</th>
                            </tr>
                            <tr>
                                {data.columns.map((col) => (
                                    <th key={col.key}>{col.periodeKey}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row) => (
                                <tr key={row.santri.id}>
                                    <td className="sticky-col sticky-col-1">{row.santri.nis}</td>
                                    <td className="sticky-col sticky-col-2">{row.santri.nama}</td>
                                    <td>{row.santri.kelas?.nama || "—"}</td>
                                    {data.columns.map((col) => (
                                        <td key={`${row.santri.id}-${col.key}`}>{row.cells[col.key]?.display ?? "—"}</td>
                                    ))}
                                    <td>{fmt(row.totalNominal)}</td>
                                    <td>{fmt(row.totalTerbayar)}</td>
                                    <td>{fmt(row.totalSisa)}</td>
                                </tr>
                            ))}
                            {!data.rows.length ? (
                                <tr>
                                    <td colSpan={3 + data.columns.length + 3} style={{ textAlign: "center", color: "var(--muted)", padding: "32px" }}>
                                        {loading ? "Memuat data..." : "Tidak ada data yang cocok dengan filter."}
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </Card>
        </section>
    );
}
