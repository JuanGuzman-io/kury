"use client";

import { FormEvent, useState } from "react";
import { OperationsShell } from "@/components/layout/operations-shell";
import { apiFetch } from "@/lib/api/client";

type ChatMessage = { role: "USER" | "ASSISTANT"; content: string };
type ChatResponse = { conversation_id: string; message: string; intent?: string };

const starters = [
  "¿Dónde está mi pedido?",
  "Quiero cancelar mi pedido.",
  "Llevo 30 minutos esperando.",
  "Faltaron las papas de mi pedido.",
];

export function ChatView() {
  const [userId, setUserId] = useState("usr_20981");
  const [orderId, setOrderId] = useState("ord_000123");
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [intent, setIntent] = useState<string>();
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setError(undefined);
    setSending(true);
    setMessages((current) => [...current, { role: "USER", content: trimmed }]);
    setMessage("");
    try {
      const response = await apiFetch<ChatResponse>("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kuri-User-Id": userId.trim() },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_id: userId.trim(),
          order_id: orderId.trim() || undefined,
          message: trimmed,
        }),
      });
      setConversationId(response.conversation_id);
      setIntent(response.intent);
      setMessages((current) => [...current, { role: "ASSISTANT", content: response.message }]);
    } catch {
      setError("No pudimos contactar al asistente. Verifica que la API esté disponible e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  function resetConversation() {
    setConversationId(undefined);
    setIntent(undefined);
    setMessages([]);
    setError(undefined);
  }

  return (
    <OperationsShell>
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[.22em] text-[var(--slate-500)]">03 / Simulación de soporte</p>
            <h1 className="display-face text-4xl tracking-tight sm:text-5xl">Habla con Kuri</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--slate-500)]">Prueba cómo el asistente consulta pedidos y solicita acciones. Las reglas y permisos se validan en el backend.</p>
          </div>
          <button type="button" onClick={resetConversation} className="min-h-10 border border-[var(--paper-200)] px-4 text-sm font-bold hover:border-[var(--ink-950)]">Nueva conversación</button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="border border-[var(--paper-200)] bg-[var(--paper-50)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--paper-200)] px-5 py-4 sm:px-6">
              <div><p className="label">Sesión actual</p><p className="mt-1 font-mono text-xs text-[var(--slate-500)]">{conversationId ?? "Se crea al enviar el primer mensaje"}</p></div>
              {intent && <span className="border border-[var(--cyan-400)]/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--slate-500)]">{intent}</span>}
            </div>
            <div aria-live="polite" className="min-h-[26rem] space-y-4 p-5 sm:p-8">
              {messages.length === 0 ? (
                <div className="grid min-h-[20rem] place-items-center text-center">
                  <div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--ink-950)] font-mono text-lg text-[var(--amber-500)]">k.</span><p className="display-face mt-5 text-2xl">¿Qué necesita el usuario?</p><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--slate-500)]">Selecciona un caso o escribe una solicitud para comenzar la simulación.</p></div>
                </div>
              ) : messages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`flex ${item.role === "USER" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] border px-4 py-3 text-sm leading-6 sm:max-w-[70%] ${item.role === "USER" ? "border-[var(--ink-950)] bg-[var(--ink-950)] text-[var(--paper-50)]" : "border-[var(--paper-200)] bg-white"}`}>
                    <p className="mb-1 font-mono text-[9px] uppercase tracking-[.18em] opacity-55">{item.role === "USER" ? "Usuario" : "Asistente"}</p><p>{item.content}</p>
                  </div>
                </div>
              ))}
              {sending && <p className="text-xs text-[var(--slate-500)]" role="status">El asistente está consultando las herramientas…</p>}
            </div>
            {error && <p role="alert" className="mx-5 mb-4 border border-[var(--red-500)]/40 bg-white p-3 text-sm sm:mx-6">{error}</p>}
            <form onSubmit={send} className="border-t border-[var(--paper-200)] p-4 sm:p-5">
              <label htmlFor="chat-message" className="sr-only">Mensaje para el asistente</label>
              <div className="flex items-end gap-3">
                <textarea id="chat-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={2} maxLength={4000} placeholder="Escribe una solicitud de soporte…" className="min-h-12 flex-1 resize-y border border-[var(--paper-200)] bg-white px-3 py-3 text-sm placeholder:text-[var(--slate-500)]/70" disabled={sending} />
                <button type="submit" disabled={!message.trim() || sending} className="min-h-12 bg-[var(--amber-500)] px-4 text-sm font-bold text-[var(--ink-950)] disabled:cursor-not-allowed disabled:opacity-40">{sending ? "Enviando…" : "Enviar"}</button>
              </div>
              <p className="mt-2 text-right text-[10px] text-[var(--slate-500)]">{message.length}/4000</p>
            </form>
          </div>

          <aside aria-label="Contexto de simulación" className="h-fit border border-[var(--paper-200)] bg-[var(--paper-100)] p-5">
            <p className="label">Contexto simulado</p>
            <p className="mt-2 text-sm leading-6 text-[var(--slate-500)]">La identidad se envía en headers y el pedido se valida en el servidor.</p>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold">Usuario<input value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-2 w-full border border-[var(--paper-200)] bg-white px-3 py-2 font-mono text-xs" /></label>
              <label className="block text-xs font-bold">Pedido<input value={orderId} onChange={(event) => setOrderId(event.target.value)} className="mt-2 w-full border border-[var(--paper-200)] bg-white px-3 py-2 font-mono text-xs" /></label>
            </div>
            <div className="mt-7 border-t border-[var(--paper-200)] pt-5"><p className="label">Casos rápidos</p><div className="mt-3 space-y-2">{starters.map((starter) => <button key={starter} type="button" onClick={() => setMessage(starter)} className="block w-full border border-[var(--paper-200)] bg-[var(--paper-50)] px-3 py-2 text-left text-xs leading-5 hover:border-[var(--ink-950)]">{starter}</button>)}</div></div>
            <p className="mt-7 border-l-2 border-[var(--cyan-400)] pl-3 text-xs leading-5 text-[var(--slate-500)]">No se muestran datos privados del courier. Las acciones sensibles requieren la decisión correspondiente del dominio.</p>
          </aside>
        </div>
      </section>
    </OperationsShell>
  );
}
