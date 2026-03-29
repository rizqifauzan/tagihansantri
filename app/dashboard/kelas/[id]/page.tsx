import Link from "next/link";
import { SantriStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number) {
  return value.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

const STATUS_ORDER: SantriStatus[] = [
  SantriStatus.AKTIF,
  SantriStatus.NONAKTIF,
  SantriStatus.LULUS,
  SantriStatus.KELUAR,
];

export default async function KelasDetailPage({ params }: PageProps) {
  const { id } = await params;

  const kelas = await prisma.kelas.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          santri: true,
        },
      },
    },
  });

  if (!kelas) {
    return (
      <section className="dashboard-main">
        <header className="page-head">
          <div>
            <h2>Detail Kelas</h2>
            <p>Kelas tidak ditemukan.</p>
          </div>
          <Link href="/dashboard/kelas" className="btn-secondary">Kembali</Link>
        </header>

        <section className="ui-card">
          <p className="error-text">Data kelas tidak ditemukan.</p>
        </section>
      </section>
    );
  }

  const [santriByStatus, jumlahTagihan, nominalTagihan] = await Promise.all([
    prisma.santri.groupBy({
      by: ["status"],
      where: { kelasId: id },
      _count: { _all: true },
    }),
    prisma.tagihan.count({ where: { santri: { kelasId: id } } }),
    prisma.tagihan.aggregate({
      where: { santri: { kelasId: id } },
      _sum: {
        nominal: true,
        nominalTerbayar: true,
      },
    }),
  ]);

  const statusMap = new Map<SantriStatus, number>();
  santriByStatus.forEach((item) => {
    statusMap.set(item.status, item._count._all);
  });

  const totalNominal = nominalTagihan._sum.nominal || 0;
  const totalTerbayar = nominalTagihan._sum.nominalTerbayar || 0;
  const totalTunggakan = totalNominal - totalTerbayar;

  const santriTerbaru = await prisma.santri.findMany({
    where: { kelasId: id },
    orderBy: [{ createdAt: "desc" }],
    take: 20,
    select: {
      id: true,
      nis: true,
      nama: true,
      status: true,
      gender: true,
      keluarga: {
        select: { kodeKeluarga: true },
      },
    },
  });

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Detail Kelas</h2>
          <p>
            <Link href="/dashboard/kelas">Data Kelas</Link> / {kelas.nama}
          </p>
        </div>
        <Link href="/dashboard/kelas" className="btn-secondary">Kembali</Link>
      </header>

      <section className="ui-card">
        <div className="ui-card-head">
          <div>
            <h3>{kelas.nama}</h3>
            <p className="ui-card-subtitle">Status kelas: {kelas.active ? "Aktif" : "Nonaktif"}</p>
          </div>
          <span className="status-badge">{kelas._count.santri} santri</span>
        </div>

        <div className="stat-grid">
          <div className="stat-block">
            <p>Total Tagihan Kelas</p>
            <strong>{jumlahTagihan}</strong>
          </div>
          <div className="stat-block">
            <p>Total Nominal Tagihan</p>
            <strong>{formatCurrency(totalNominal)}</strong>
          </div>
          <div className="stat-block">
            <p>Total Terbayar</p>
            <strong>{formatCurrency(totalTerbayar)}</strong>
          </div>
          <div className="stat-block">
            <p>Total Tunggakan</p>
            <strong>{formatCurrency(totalTunggakan)}</strong>
          </div>
        </div>

        <div className="compact-list">
          {STATUS_ORDER.map((status) => (
            <div key={status}>
              <span>Santri {status}</span>
              <strong>{statusMap.get(status) || 0} orang</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="ui-card">
        <h3>Santri Terbaru di Kelas Ini</h3>
        {!santriTerbaru.length ? (
          <p className="hint-text">Belum ada santri di kelas ini.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>NIS</th>
                  <th>Nama</th>
                  <th>Gender</th>
                  <th>Status</th>
                  <th>Keluarga</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {santriTerbaru.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nis}</td>
                    <td>{item.nama}</td>
                    <td>{item.gender === "L" ? "L" : "P"}</td>
                    <td><span className="status-badge">{item.status}</span></td>
                    <td>{item.keluarga?.kodeKeluarga || "-"}</td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/dashboard/santri/${item.id}`} className="btn-secondary btn-link">
                          Detail Santri
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
