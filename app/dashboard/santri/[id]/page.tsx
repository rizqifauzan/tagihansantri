import Link from "next/link";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

export default async function SantriDetailPage({ params }: PageProps) {
  const { id } = await params;

  const santri = await prisma.santri.findUnique({
    where: { id },
    include: {
      kelas: { select: { id: true, nama: true } },
      keluarga: {
        select: {
          id: true,
          kodeKeluarga: true,
          namaKepalaFamily: true,
          keterangan: true,
        },
      },
    },
  });

  if (!santri) {
    return (
      <section className="dashboard-main">
        <header className="page-head">
          <div>
            <h2>Detail Santri</h2>
            <p>Data tidak ditemukan.</p>
          </div>
          <Link href="/dashboard/santri" className="btn-secondary">Kembali</Link>
        </header>

        <section className="ui-card">
          <p className="error-text">Santri tidak ditemukan.</p>
        </section>
      </section>
    );
  }

  const [aggregate, groupedStatus, recentTagihan] = await Promise.all([
    prisma.tagihan.aggregate({
      where: { santriId: santri.id },
      _count: { _all: true },
      _sum: {
        nominal: true,
        nominalTerbayar: true,
      },
    }),
    prisma.tagihan.groupBy({
      by: ["status"],
      where: { santriId: santri.id },
      _count: { _all: true },
    }),
    prisma.tagihan.findMany({
      where: { santriId: santri.id },
      orderBy: [{ periodeKey: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: {
        komponen: { select: { kode: true, nama: true } },
        pembayaran: {
          orderBy: { tanggalBayar: "desc" },
          take: 1,
          select: {
            tanggalBayar: true,
            nominal: true,
            metode: true,
            adminUsername: true,
          },
        },
      },
    }),
  ]);

  const totalNominal = aggregate._sum.nominal || 0;
  const totalTerbayar = aggregate._sum.nominalTerbayar || 0;
  const totalTunggakan = totalNominal - totalTerbayar;
  const statusCounts = groupedStatus
    .map((row) => ({ status: row.status, count: row._count._all }))
    .sort((a, b) => a.status.localeCompare(b.status));

  return (
    <section className="dashboard-main">
      <header className="page-head">
        <div>
          <h2>Detail Santri</h2>
          <p>
            <Link href="/dashboard/santri">Data Santri</Link> / {santri.nama}
          </p>
        </div>
        <Link href="/dashboard/santri" className="btn-secondary">Kembali</Link>
      </header>

      <section className="ui-card">
        <div className="ui-card-head">
          <div>
            <h3>{santri.nama}</h3>
            <p className="ui-card-subtitle">NIS {santri.nis}</p>
          </div>
          <span className="status-badge">{santri.status}</span>
        </div>

        <div className="form-grid">
          <div>
            <p className="ui-card-subtitle">Kelas</p>
            <strong>{santri.kelas.nama}</strong>
          </div>
          <div>
            <p className="ui-card-subtitle">Gender</p>
            <strong>{santri.gender === "L" ? "Laki-laki" : "Perempuan"}</strong>
          </div>
          <div>
            <p className="ui-card-subtitle">Keluarga</p>
            <strong>{santri.keluarga?.kodeKeluarga || "-"}</strong>
          </div>
          <div>
            <p className="ui-card-subtitle">Kepala Keluarga</p>
            <strong>{santri.keluarga?.namaKepalaFamily || "-"}</strong>
          </div>
          <div>
            <p className="ui-card-subtitle">Tanggal Masuk</p>
            <strong>{formatDate(santri.tanggalMasuk)}</strong>
          </div>
          <div>
            <p className="ui-card-subtitle">Tanggal Keluar</p>
            <strong>{formatDate(santri.tanggalKeluar)}</strong>
          </div>
          <div>
            <p className="ui-card-subtitle">Flag</p>
            <strong>
              {[santri.yatim ? "Yatim" : "", santri.keluargaNdalem ? "Keluarga Ndalem" : ""]
                .filter(Boolean)
                .join(", ") || "-"}
            </strong>
          </div>
          <div>
            <p className="ui-card-subtitle">Keterangan Keluarga</p>
            <strong>{santri.keluarga?.keterangan || "-"}</strong>
          </div>
        </div>
      </section>

      <section className="ui-card">
        <h3>Ringkasan Tagihan</h3>
        <div className="stat-grid">
          <div className="stat-block">
            <p>Total Tagihan</p>
            <strong>{aggregate._count._all}</strong>
          </div>
          <div className="stat-block">
            <p>Total Nominal</p>
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
          {statusCounts.length ? (
            statusCounts.map((item) => (
              <div key={item.status}>
                <span>Status {item.status}</span>
                <strong>{item.count} item</strong>
              </div>
            ))
          ) : (
            <p className="hint-text">Belum ada data tagihan untuk santri ini.</p>
          )}
        </div>
      </section>

      <section className="ui-card">
        <h3>Riwayat Tagihan Terbaru</h3>
        {!recentTagihan.length ? (
          <p className="hint-text">Belum ada tagihan.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Komponen</th>
                  <th>Status</th>
                  <th>Nominal</th>
                  <th>Terbayar</th>
                  <th>Jatuh Tempo</th>
                  <th>Pembayaran Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {recentTagihan.map((item) => {
                  const lastPayment = item.pembayaran[0];
                  return (
                    <tr key={item.id}>
                      <td>{item.periodeKey}</td>
                      <td>{item.komponen.nama}</td>
                      <td><span className="status-badge">{item.status}</span></td>
                      <td>{formatCurrency(item.nominal)}</td>
                      <td>{formatCurrency(item.nominalTerbayar)}</td>
                      <td>{formatDate(item.jatuhTempo)}</td>
                      <td>
                        {lastPayment
                          ? `${formatDate(lastPayment.tanggalBayar)} • ${lastPayment.metode} • ${formatCurrency(lastPayment.nominal)}`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
