import type { ApiErrorShape } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export class ApiClientError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { Accept: "application/json", "X-Kuri-Role": "OPS", ...init?.headers }, signal: init?.signal ?? AbortSignal.timeout(8000) });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiErrorShape>;
    throw new ApiClientError(response.status, body.code ?? "REQUEST_FAILED", body.message ?? "No pudimos cargar los datos.");
  }
  return response.json() as Promise<T>;
}
