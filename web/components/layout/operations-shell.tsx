"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/orders", label: "Pedidos", mark: "01" },
  { href: "/approvals", label: "Aprobaciones", mark: "02" },
  { href: "/chat", label: "Chat de prueba", mark: "03" },
];

export function OperationsShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[var(--paper-50)] text-[var(--ink-950)] lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--cyan-400)] focus:px-4 focus:py-2">Saltar al contenido</a>
      <aside className="bg-[var(--ink-950)] text-[var(--paper-50)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:self-start lg:flex-col lg:overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 lg:block lg:px-7 lg:py-8">
          <Link href="/orders" className="display-face text-2xl tracking-tight">kuri<span className="text-[var(--amber-500)]">.</span></Link>
          <span className="ml-3 text-[10px] uppercase tracking-[.22em] text-white/45">ops desk</span>
          <button type="button" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((current) => !current)} className="ml-auto border border-white/20 px-3 py-2 text-xs font-bold text-white lg:hidden">{menuOpen ? "Cerrar" : "Menú"}</button>
        </div>
        <nav id="primary-navigation" aria-label="Navegación principal" className={`${menuOpen ? "block" : "hidden"} border-b border-white/10 px-3 py-3 lg:block lg:border-0 lg:px-4 lg:py-8`}>
          {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} aria-current={path.startsWith(link.href) ? "page" : undefined} className={`flex items-center gap-3 px-3 py-3 text-sm transition-colors lg:py-2.5 ${path.startsWith(link.href) ? "bg-[var(--amber-500)] text-[var(--ink-950)]" : "text-white/60 hover:bg-white/10 hover:text-white"}`}><span className="font-mono text-[10px] opacity-60">{link.mark}</span>{link.label}</Link>)}
        </nav>
        <div className="hidden border-t border-white/10 px-7 py-6 text-xs text-white/45 lg:mt-auto lg:block"><p className="mb-1 uppercase tracking-[.18em]">Turno activo</p><p className="text-white/80">Bogotá · CDMX · Lima</p><p className="mt-3 font-mono text-[10px]">MODO LOCAL / OPS</p></div>
      </aside>
      <main id="main" className="ledger-grid min-w-0 flex-1">{children}</main>
    </div>
  );
}
