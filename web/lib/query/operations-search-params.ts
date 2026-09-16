export interface OperationsFilters { city: string; status: string; page: number; }
export function readOperationsFilters(searchParams: URLSearchParams): OperationsFilters {
  const page = Number(searchParams.get("page") ?? "1");
  return { city: searchParams.get("city") ?? "ALL", status: searchParams.get("status") ?? "ALL", page: Number.isFinite(page) && page > 0 ? page : 1 };
}
export function writeOperationsFilters(filters: OperationsFilters): string {
  const params = new URLSearchParams();
  if (filters.city !== "ALL") params.set("city", filters.city);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}
