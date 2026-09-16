"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OperationsShell } from "@/components/layout/operations-shell";
import { useOrderDetail } from "@/lib/query/use-order-detail";
import { useOrderTraces } from "@/lib/query/use-order-traces";
import { OrderSummary } from "@/components/order-detail/order-summary";
import { OrderTimeline } from "@/components/order-detail/order-timeline";
import { OrderSupportPanel } from "@/components/order-detail/order-support-panel";
export default function OrderDetailPage() { const { orderId } = useParams<{ orderId: string }>(); const query = useOrderDetail(orderId); const traces = useOrderTraces(orderId); return <OperationsShell><section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><Link href="/orders" className="text-sm underline">← Volver a pedidos</Link>{query.isPending ? <p className="py-20 text-sm text-[var(--slate-500)]">Cargando detalle…</p> : query.isError ? <div role="alert" className="mt-8 border border-[var(--red-500)]/40 bg-white p-6"><p className="display-face text-2xl">No pudimos encontrar este pedido</p><Link href="/orders" className="mt-4 inline-block text-sm underline">Volver a la cola</Link></div> : query.data ? <><header className="mb-8 mt-6"><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[var(--slate-500)]">Detalle operativo</p><h1 className="display-face mt-2 break-all text-4xl tracking-tight">{query.data.order_id}</h1><p className="mt-2 text-sm text-[var(--slate-500)]">{query.data.restaurant.name}</p></header><OrderSummary order={query.data} /><div className="mt-10 grid gap-12 lg:grid-cols-[1fr_1fr]"><OrderTimeline events={query.data.timeline} />{traces.isPending ? <p className="text-sm text-[var(--slate-500)]">Cargando actividad de soporte…</p> : <OrderSupportPanel traces={traces.data?.data ?? []} />}</div></> : null}</section></OperationsShell>; }
