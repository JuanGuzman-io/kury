"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApprovalRequestContract, PaginatedApprovalsContract, SupportActionResult } from "@kuri/contracts";
import { apiFetch } from "@/lib/api/client";
export function useApprovals(page: number) { return useQuery({ queryKey: ["approvals", page], queryFn: () => apiFetch<PaginatedApprovalsContract>(`/api/v1/approvals?status=PENDING&page=${page}&limit=20`) }); }
export function useResolveApproval() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) => apiFetch<SupportActionResult>(`/api/v1/approvals/${encodeURIComponent(id)}/${action}`, { method: "POST" }), onSuccess: () => client.invalidateQueries({ queryKey: ["approvals"] }) }); }
export type ApprovalRow = ApprovalRequestContract;
