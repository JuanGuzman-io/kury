"use client";
import { useQuery } from "@tanstack/react-query";
import type { AtRiskOrderResponse } from "@kuri/contracts";
import { apiFetch } from "@/lib/api/client";
export function useActiveOrders(filters: { city: string; status: string; page: number }) {
  const params = new URLSearchParams({ page: String(filters.page), limit: "20" });
  if (filters.city !== "ALL") params.set("city", filters.city);
  if (filters.status !== "ALL") params.set("status", filters.status);
  return useQuery({ queryKey: ["active-orders", filters], queryFn: () => apiFetch<AtRiskOrderResponse>(`/api/v1/orders/at-risk?${params}`) });
}
