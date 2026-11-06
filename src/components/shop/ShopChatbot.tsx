"use client";

import { useState } from "react";
import { Bot, MessageCircle, Send, X, Sparkles } from "lucide-react";
import FlagCopyBadge from "@/components/common/FlagCopyBadge";
import { findFlagsInText } from "@/lib/clipboard";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export default function ShopChatbot() {
  const [open, setOpen] = useState(false);
  const [layer, setLayer] = useState<1 | 2 | 3>(1);
  const [productIdForSummary, setProductIdForSummary] = useState("1");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(
    () => `sess_${Math.random().toString(36).slice(2, 10)}`
  );
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o ProzBot, assistente virtual da Proz Store. Como posso ajudar você hoje?",
    },
  ]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          layer,
          mode: layer === 3 ? "summarize_reviews" : "chat",
          productId: productIdForSummary,
          message: trimmed,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || data.error || "Sem resposta do assistente.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erro de comunicação com o atendimento.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarizeReviews() {
    if (loading) return;
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Resuma as avaliações do produto #${productIdForSummary}`,
      },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          layer: 3,
          mode: "summarize_reviews",
          productId: productIdForSummary,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Não foi possível resumir as avaliações.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-2xl shadow-amber-500/20 transition"
        >
          <MessageCircle className="w-5 h-5" />
          Atendimento ProzBot
        </button>
      ) : (
        <div className="w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  ProzBot · Assistente IA
                </h3>
                <span className="text-[10px] text-emerald-400">
                  ● Online agora
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Seletor de Modo / Camada do Bot */}
          <div className="bg-slate-950/70 border-b border-slate-800 p-2 grid grid-cols-3 gap-1 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLayer(1)}
              className={`py-1.5 px-2 rounded-lg transition ${
                layer === 1
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Atendimento (D#5)
            </button>
            <button
              type="button"
              onClick={() => setLayer(2)}
              className={`py-1.5 px-2 rounded-lg transition ${
                layer === 2
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Promoções (D#11)
            </button>
            <button
              type="button"
              onClick={() => setLayer(3)}
              className={`py-1.5 px-2 rounded-lg transition ${
                layer === 3
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Resumir Reviews (D#16)
            </button>
          </div>

          {/* Controle extra quando na Camada 3 (Resumir avaliações de produto) */}
          {layer === 3 && (
            <div className="bg-slate-950/90 border-b border-slate-800 px-3 py-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Produto ID:</span>
                <input
                  type="number"
                  min={1}
                  max={18}
                  value={productIdForSummary}
                  onChange={(e) => setProductIdForSummary(e.target.value)}
                  className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleSummarizeReviews}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Resumir Avaliações
              </button>
            </div>
          )}

          {/* Mensagens */}
          <div className="h-72 overflow-y-auto p-3.5 space-y-3 text-xs bg-slate-900">
            {messages.map((m, idx) => {
              const detectedFlags =
                m.role === "assistant" ? findFlagsInText(m.content) : [];
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  } gap-1.5`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      m.role === "user"
                        ? "bg-amber-500 text-slate-950 font-medium"
                        : "bg-slate-950 border border-slate-800 text-slate-200"
                    }`}
                  >
                    {m.content}
                  </div>
                  {detectedFlags.map((fl) => (
                    <div key={fl} className="w-full max-w-[92%]">
                      <FlagCopyBadge flag={fl} label="Flag encontrada no chat:" />
                    </div>
                  ))}
                </div>
              );
            })}
            {loading && (
              <div className="text-[11px] text-slate-400 italic">
                ProzBot está digitando...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao ProzBot..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
