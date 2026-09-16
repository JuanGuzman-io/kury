"use client";
import { useQuery } from "@tanstack/react-query";
import type { AuditTracePageContract } from "@kuri/contracts";
import { apiFetch } from "@/lib/api/client";
export function useOrderTraces(orderId: string) { return useQuery({ queryKey: ["order-traces", orderId], queryFn: () => apiFetch<AuditTracePageContract>(`/api/v1/traces/orders/${encodeURIComponent(orderId)}?limit=100`), enabled: Boolean(orderId) }); }
