const labels: Record<string, string> = { MESSAGE: "Mensaje", LLM_CALL: "Consulta al asistente", TOOL_EXECUTION: "Herramienta", DECISION: "Decisión", APPROVAL: "Aprobación", EFFECT: "Efecto ejecutado", ERROR: "Error" };
export const traceTypeLabel = (type: string) => labels[type] ?? type;
export function safeTraceEntries(payload: Record<string, unknown>) { return Object.entries(payload).filter(([key]) => !/(phone|document|secret|token|api[_-]?key)/i.test(key)).slice(0, 30); }
