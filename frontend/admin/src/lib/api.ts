const BASE = "http://127.0.0.1:5000/api";

export function getToken(): string {
  // localStorage is only available in the browser, not during SSR
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("access_token") ?? "";
  } catch {
    return "";
  }
}

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
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

