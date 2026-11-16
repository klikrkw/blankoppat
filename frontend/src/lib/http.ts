"use client";

/**
 * HTTP client untuk FastAPI backend (Blanko PPAT API).
 * API_BASE = origin backend TANPA prefix "/api", karena semua path di lib/api.ts
 * sudah memakai "/api/v1/...".
 * - Development : NEXT_PUBLIC_API_URL=http://localhost:8000
 * - Docker/nginx: NEXT_PUBLIC_API_URL= (kosong) → same-origin lewat nginx
 * Default (tidak diset) juga http://localhost:8000.
 */

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

/**
 * Gabungkan base + path tanpa menghasilkan "/api/api/...".
 * Berguna untuk .env lama yang masih berisi NEXT_PUBLIC_API_URL=/api.
 */
export function buildUrl(path: string): string {
  if (API_BASE.endsWith("/api") && path.startsWith("/api/")) {
    return `${API_BASE.slice(0, -"/api".length)}${path}`;
  }
  return `${API_BASE}${path}`;
}

const TOKEN_KEY = "blankoppat_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildQuery(query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: string;
    json?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    auth?: boolean;
    raw?: boolean;
  }
): Promise<T> {
  const method = options?.method ?? (options?.json !== undefined ? "POST" : "GET");
  const headers: Record<string, string> = {};
  if (options?.json !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${buildUrl(path)}${buildQuery(options?.query)}`, {
      method,
      headers,
      body: options?.json !== undefined ? JSON.stringify(options.json) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "Tidak dapat terhubung ke backend. Pastikan FastAPI berjalan dan NEXT_PUBLIC_API_URL benar."
    );
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("blankoppat_user");
      } catch {
        // ignore
      }
      if (window.location.pathname !== "/login") {
        window.location.replace(`${window.location.origin}/login`);
      }
      throw new ApiError(401, "Sesi berakhir, silakan login kembali.");
    }
    let message = `Request gagal (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") message = data.detail;
      else if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
        message = data.detail[0].msg;
      }
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  if (options?.raw) {
    return res as unknown as T;
  }
  return (await res.json()) as T;
}
