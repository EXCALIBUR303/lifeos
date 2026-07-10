"use client";

import { Btn, Chip, PageHeader, stagger } from "@/components/ui";
import {
  activeProvider,
  askClaude,
  askGemini,
  buildDigest,
  describeApiError,
  localAnswer,
  SUGGESTIONS,
} from "@/lib/assistant";
import { useLife, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, Cpu, Eraser, SendHorizonal, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function AssistantPage() {
  const life = useLife();
  const { chat, pushChat, clearChat } = life;
  const name = useSettings((s) => s.name);
  const apiKey = useSettings((s) => s.apiKey);
  const geminiKey = useSettings((s) => s.geminiKey);
  const provider = useSettings((s) => s.provider);
  const active = activeProvider({ apiKey, geminiKey, provider });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length, sending]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    setInput("");
    pushChat({ role: "user", content: question });

    if (!active) {
      // on-device engine — instant, honest about what it is
      setSending(true);
      setTimeout(() => {
        pushChat({ role: "assistant", content: localAnswer(question, life, name), source: "local" });
        setSending(false);
      }, 350);
      return;
    }

    setSending(true);
    try {
      const digest = buildDigest(life, name);
      const history = [
        ...chat.slice(-10),
        { id: "tmp", at: "", role: "user" as const, content: question },
      ];
      const reply =
        active === "claude"
          ? await askClaude(apiKey, history, digest)
          : await askGemini(geminiKey, history, digest);
      pushChat({ role: "assistant", content: reply, source: active });
    } catch (err) {
      pushChat({ role: "assistant", content: describeApiError(err), source: "local" });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex min-h-[calc(100dvh-160px)] flex-col">
      <PageHeader
        eyebrow="AI assistant"
        title="Ask your"
        accent="life"
        subtitle="Grounded in your real data — tasks, money, habits, health, schedule and goals."
        actions={
          <div className="flex items-center gap-2">
            <Chip className={active ? "border-good-soft bg-good-soft text-good" : ""}>
              {active === "claude" ? (
                <>
                  <Sparkles className="size-3" aria-hidden /> Claude · opus-4.8
                </>
              ) : active === "gemini" ? (
                <>
                  <Sparkles className="size-3" aria-hidden /> Gemini · 2.5-flash
                </>
              ) : (
                <>
                  <Cpu className="size-3" aria-hidden /> On-device mode
                </>
              )}
            </Chip>
            {chat.length > 0 && (
              <Btn variant="ghost" onClick={clearChat}>
                <Eraser className="size-4" aria-hidden /> Clear
              </Btn>
            )}
          </div>
        }
      />

      {!active && (
        <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-sm text-ink-2">
          <Cpu className="size-4 shrink-0 text-accent" aria-hidden />
          <span className="flex-1">
            Running the on-device rules engine. Add a Claude or Gemini API key
            (Gemini&apos;s is free via Google AI Studio) for real conversations over your data.
          </span>
          <Link href="/settings">
            <Btn variant="soft">
              <Settings2 className="size-4" aria-hidden /> Settings
            </Btn>
          </Link>
        </div>
      )}

      {/* thread */}
      <div className="flex-1 space-y-4 pb-4">
        {chat.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-3xl bg-accent-soft text-accent">
              <Bot className="size-7" aria-hidden />
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-ink-3">
              Ask anything about your life data. Try one of these:
            </p>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="cursor-pointer rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-ink-2 transition-colors hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[70%]",
                m.role === "user"
                  ? "rounded-br-md bg-accent text-accent-ink"
                  : "glass rounded-bl-md text-ink",
              )}
            >
              {m.content}
              {m.role === "assistant" && (
                <span className="mt-1.5 block text-[10px] uppercase tracking-wider text-ink-3">
                  {m.source === "claude" ? "claude" : m.source === "gemini" ? "gemini" : "on-device"}
                </span>
              )}
            </div>
          </motion.div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-1.5 rounded-full bg-accent"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="glass sticky bottom-20 flex items-center gap-2 rounded-2xl p-2 lg:bottom-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={
            active === "claude"
              ? "Ask Claude about your life…"
              : active === "gemini"
                ? "Ask Gemini about your life…"
                : "Ask about money, habits, sleep, plans…"
          }
          className="min-h-10 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-ink-3"
          aria-label="Message the assistant"
          disabled={sending}
        />
        <Btn onClick={() => send(input)} disabled={!input.trim() || sending}>
          <SendHorizonal className="size-4" aria-hidden />
          <span className="sr-only">Send</span>
        </Btn>
      </div>
    </motion.div>
  );
}
