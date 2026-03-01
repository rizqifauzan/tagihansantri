type KwitansiTemplate = "RINGKAS" | "LENGKAP";
type PaymentMethod = "TUNAI" | "TRANSFER";

export function generateKwitansiNumber(date = new Date()): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `KWT-${y}${m}${d}-${h}${min}${sec}${ms}${rand}`;
}

type ReceiptInput = {
  nomor: string;
  tanggalBayar: Date;
  namaSantri: string;
  nis: string;
  namaKomponen: string;
  nominalAwal: number;
  nominalDiskon: number;
  nominalTagihan: number;
  nominalTerbayar: number;
  nominalBelumDibayar: number;
  nominal: number;
  metode: PaymentMethod;
  referensi: string | null;
  adminUsername: string;
  appName: string;
  logoUrl?: string | null;
  stempelUrl?: string | null;
};

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function renderKwitansiHtml(template: KwitansiTemplate, data: ReceiptInput): string {
  const baseHeader = `
    <h1>${data.appName}</h1>
    <h2>Kwitansi Pembayaran</h2>
    <p>No: <strong>${data.nomor}</strong></p>
    <p>Tanggal: ${dateOnly(data.tanggalBayar)}</p>
  `;

  const logo = data.logoUrl ? `<img src="${data.logoUrl}" alt="logo" style="max-height:64px;"/>` : "";
  const stamp = data.stempelUrl ? `<img src="${data.stempelUrl}" alt="stempel" style="max-height:80px;"/>` : "";

  if (template === "RINGKAS") {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; line-height:1.4;">
        ${logo}
        ${baseHeader}
        <hr/>
        <p>Santri: <strong>${data.namaSantri}</strong> (${data.nis})</p>
        <p>Komponen: ${data.namaKomponen}</p>
        <p>Nominal Awal: Rp ${Math.round(data.nominalAwal).toLocaleString("id-ID")}</p>
        <p>Nominal Diskon: Rp ${Math.round(data.nominalDiskon).toLocaleString("id-ID")}</p>
        <p>Nominal Tagihan: Rp ${Math.round(data.nominalTagihan).toLocaleString("id-ID")}</p>
        <p>Nominal Terbayar: Rp ${Math.round(data.nominalTerbayar).toLocaleString("id-ID")}</p>
        <p>Nominal Belum Dibayar: Rp ${Math.round(data.nominalBelumDibayar).toLocaleString("id-ID")}</p>
        <p>Nominal Dibayar Transaksi Ini: <strong>Rp ${Math.round(data.nominal).toLocaleString("id-ID")}</strong></p>
        <p>Metode: ${data.metode}${data.referensi ? ` (${data.referensi})` : ""}</p>
      </div>
    `;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 840px; margin: 0 auto; line-height:1.5;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>${logo}</div>
        <div style="text-align:right;">${stamp}</div>
      </div>
      ${baseHeader}
      <hr/>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:6px 0;">Nama Santri</td><td>: ${data.namaSantri}</td></tr>
        <tr><td style="padding:6px 0;">NIS</td><td>: ${data.nis}</td></tr>
        <tr><td style="padding:6px 0;">Komponen</td><td>: ${data.namaKomponen}</td></tr>
        <tr><td style="padding:6px 0;">Nominal Awal</td><td>: Rp ${Math.round(data.nominalAwal).toLocaleString("id-ID")}</td></tr>
        <tr><td style="padding:6px 0;">Nominal Diskon</td><td>: Rp ${Math.round(data.nominalDiskon).toLocaleString("id-ID")}</td></tr>
        <tr><td style="padding:6px 0;">Nominal Tagihan</td><td>: Rp ${Math.round(data.nominalTagihan).toLocaleString("id-ID")}</td></tr>
        <tr><td style="padding:6px 0;">Nominal Terbayar</td><td>: Rp ${Math.round(data.nominalTerbayar).toLocaleString("id-ID")}</td></tr>
        <tr><td style="padding:6px 0;">Nominal Belum Dibayar</td><td>: Rp ${Math.round(data.nominalBelumDibayar).toLocaleString("id-ID")}</td></tr>
        <tr><td style="padding:6px 0;">Nominal Bayar</td><td>: <strong>Rp ${Math.round(data.nominal).toLocaleString("id-ID")}</strong></td></tr>
        <tr><td style="padding:6px 0;">Metode</td><td>: ${data.metode}</td></tr>
        <tr><td style="padding:6px 0;">Referensi</td><td>: ${data.referensi || "-"}</td></tr>
        <tr><td style="padding:6px 0;">Admin</td><td>: ${data.adminUsername}</td></tr>
      </table>
      <br/>
      <p>Dokumen ini dibuat otomatis oleh sistem.</p>
    </div>
  `;
}
