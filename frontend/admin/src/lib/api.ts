// Turf backend API, e.g. https://api.yourturf.com/api (set in .env as VITE_API_URL).
// Falls back to the local backend for development. The admin panel always talks to
// the turf backend, never to the subscription registry directly.
const BASE = (import.meta.env["VITE_API_URL"] || "http://127.0.0.1:5000/api").replace(/\/+$/, "");

export function getToken(): string {
  // localStorage is only available in the browser, not during SSR
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("access_token") ?? "";
  } catch {
    return "";
  }
}

/** Error thrown by adminFetch. `code` is the backend's machine-readable code, e.g. "PLAN_LIMIT_REACHED". */
export class ApiError extends Error {
  status: number;
  code: string | undefined;
  body: unknown;
  constructor(status: number, message: string, code?: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export const API_BASE = BASE;

export async function adminFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let body: { message?: string; code?: string } | undefined;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
    throw new ApiError(res.status, body?.message || `API ${res.status}: ${text}`, body?.code, body);
  }
  return res.json() as Promise<T>;
}

/** Download a file (e.g. CSV export) from an authenticated endpoint. */
export async function adminDownload(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, message);
  }
  const blob = await res.blob();
  const name =
    /filename="?([^"]+)"?/.exec(res.headers.get("Content-Disposition") || "")?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
