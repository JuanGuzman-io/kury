export function RiskSummary({ level, score, reasons }: { level: string; score: number; reasons: string[] }) {
  const tone = level === "HIGH" ? "border-[var(--red-500)] text-[var(--red-500)]" : level === "MEDIUM" ? "border-[var(--amber-500)] text-[#966313]" : "border-[var(--green-500)] text-[var(--green-500)]";
  return <div className="min-w-36"><span className={`inline-flex items-center gap-2 border px-2 py-1 text-[11px] font-bold tracking-[.1em] ${tone}`}><span aria-hidden="true">{level === "HIGH" ? "▲" : level === "MEDIUM" ? "◆" : "●"}</span>{level} · {score}</span>{reasons.length > 0 && <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--slate-500)]">{reasons[0]}{reasons.length > 1 ? ` +${reasons.length - 1} señales` : ""}</p>}</div>;
}
