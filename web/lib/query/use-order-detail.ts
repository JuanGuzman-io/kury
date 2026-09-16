"use client";
import { useQuery } from "@tanstack/react-query";
import type { RiskOrderDetail } from "@kuri/contracts";
import { apiFetch } from "@/lib/api/client";
export function useOrderDetail(orderId: string) { return useQuery({ queryKey: ["order", orderId], queryFn: () => apiFetch<RiskOrderDetail>(`/api/v1/orders/${encodeURIComponent(orderId)}`), enabled: Boolean(orderId) }); }
