import { Suspense } from "react";
import { OrdersView } from "@/components/orders/orders-view";

export default function OrdersPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[var(--paper-50)] p-8 text-sm text-[var(--slate-500)]">Cargando operaciones…</div>}><OrdersView /></Suspense>;
}
