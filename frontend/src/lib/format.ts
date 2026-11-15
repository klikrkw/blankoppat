import { formatDate as engineFormatDate, formatNumber as engineFormatNumber } from "./template-engine";

export function formatNumber(value: number | string): string {
  return engineFormatNumber(value);
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateID(value: string | Date): string {
  return engineFormatDate(value, "DD MMMM YYYY");
}

export function formatDateTimeID(value: string | Date): string {
  return engineFormatDate(value, "DD MMMM YYYY, HH:mm");
}

/** Label jenis sertipikat. Nilai lama "manual" ditampilkan sebagai "Analog". */
export function formatJenisSertipikat(value?: string | null): string {
  if (!value) return "-";
  return value === "analog" || value === "manual" ? "Analog" : "Elektronik";
}

export function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDateID(value);
}
