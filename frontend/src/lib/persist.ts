"use client";

/**
 * Persistensi store mock ke localStorage agar data yang dibuat
 * (dokumen, transaksi, invoice, pembayaran, dll) tidak hilang
 * saat halaman di-reload.
 *
 * Di produksi data ini dikelola FastAPI + MySQL; file ini hanya
 * untuk mode demo frontend tanpa backend.
 */
import {
  auditLogs,
  documents,
  invoices,
  payments,
  pihakList,
  systemSettings,
  templates,
  transaksi,
  userSubscriptions,
} from "./mock-data";

const KEY = "blankoppat_store_v1";

function replaceArray<T>(target: T[], items: unknown): void {
  if (!Array.isArray(items)) return;
  target.splice(0, target.length, ...(items as T[]));
}

export function hydrateStore(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    replaceArray(documents, data.documents);
    replaceArray(transaksi, data.transaksi);
    replaceArray(pihakList, data.pihakList);
    replaceArray(auditLogs, data.auditLogs);
    replaceArray(userSubscriptions, data.userSubscriptions);
    replaceArray(invoices, data.invoices);
    replaceArray(payments, data.payments);
    replaceArray(templates, data.templates);
    if (data.systemSettings && typeof data.systemSettings === "object") {
      Object.assign(systemSettings, data.systemSettings);
    }
  } catch {
    // abaikan data korup
  }
}

export function saveStore(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        documents,
        transaksi,
        pihakList,
        auditLogs,
        userSubscriptions,
        invoices,
        payments,
        templates,
        systemSettings,
      })
    );
  } catch {
    // abaikan bila storage penuh/tidak tersedia
  }
}

export function resetStore(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
