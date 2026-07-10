"use client";

import {
  Btn,
  GlassCard,
  PageHeader,
  SectionTitle,
  fadeUp,
  inputCls,
  stagger,
} from "@/components/ui";
import { AccentId, ThemeMode, useLife, useSettings } from "@/lib/store";
import { clearSyncMeta, genSyncCode, normalizeCode, useSyncStatus } from "@/lib/sync";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Download,
  Moon,
  MoonStar,
  RefreshCw,
  RotateCcw,
  Sun,
} from "lucide-react";
import { useState } from "react";

const THEMES: { id: ThemeMode; label: string; blurb: string; icon: React.ReactNode; swatch: string }[] = [
  { id: "dark", label: "Dark", blurb: "Deep ink with aurora glass", icon: <Moon className="size-4" aria-hidden />, swatch: "#0a0a10" },
  { id: "light", label: "Light", blurb: "Clean paper, soft glass", icon: <Sun className="size-4" aria-hidden />, swatch: "#f2f2f7" },
  { id: "oled", label: "OLED", blurb: "True black, battery-kind", icon: <MoonStar className="size-4" aria-hidden />, swatch: "#000000" },
];

const ACCENTS: { id: AccentId; label: string; color: string }[] = [
  { id: "indigo", label: "Indigo", color: "#7c86ff" },
  { id: "teal", label: "Teal", color: "#2dd4bf" },
  { id: "rose", label: "Rose", color: "#fb7185" },
  { id: "amber", label: "Amber", color: "#fbbf24" },
];

export default function SettingsPage() {
  const {
    name, setName, theme, setTheme, accent, setAccent,
    apiKey, setApiKey, geminiKey, setGeminiKey, provider, setProvider,
    syncCode, setSyncCode,
  } = useSettings();
  const life = useLife();
  const syncStatus = useSyncStatus();
  const [confirmReset, setConfirmReset] = useState<null | "demo" | "empty">(null);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      tasks: life.tasks,
      habits: life.habits,
      transactions: life.transactions,
      budgets: life.budgets,
      goals: life.goals,
      journal: life.journal,
      health: life.health,
      focus: life.focus,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Settings"
        title="Make it"
        accent="yours"
        subtitle="Themes, identity and your data — which never leaves this device."
      />

      <div className="grid max-w-3xl grid-cols-1 gap-4">
        {/* identity */}
        <GlassCard className="p-5">
          <SectionTitle>You</SectionTitle>
          <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="set-name">
            What should LifeOS call you?
          </label>
          <input
            id="set-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(inputCls, "max-w-xs")}
          />
        </GlassCard>

        {/* sync */}
        <GlassCard className="p-5">
          <SectionTitle>Sync between devices</SectionTitle>
          {!syncCode ? (
            <>
              <p className="mb-4 text-sm leading-relaxed text-ink-3">
                Pair your Mac and iPhone with one code. Data is end-to-end encrypted —
                the server only ever sees ciphertext, and only devices with the code can
                read it. Newest change wins when both devices edit offline.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Btn
                  onClick={() => {
                    clearSyncMeta();
                    setSyncCode(genSyncCode());
                  }}
                >
                  <RefreshCw className="size-4" aria-hidden /> Create sync code
                </Btn>
                <span className="text-xs text-ink-3">or join with an existing code:</span>
              </div>
              <div className="mt-3 flex max-w-md gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                  className={cn(inputCls, "font-mono uppercase")}
                  aria-label="Existing sync code"
                />
                <Btn
                  variant="soft"
                  disabled={normalizeCode(joinCode).length < 16}
                  onClick={() => {
                    clearSyncMeta();
                    setSyncCode(joinCode);
                    setJoinCode("");
                  }}
                >
                  Join
                </Btn>
              </div>
              <p className="mt-2 text-xs text-warn">
                Joining pulls the synced copy — it will replace this device&apos;s data
                if the other device has already pushed.
              </p>
            </>
          ) : (
            <>
              <p className="mb-2 text-xs font-medium text-ink-2">
                Your sync code — enter it on your other device (Settings → Sync → Join)
              </p>
              <div className="flex max-w-md items-center gap-2">
                <code className="flex-1 rounded-xl border border-line bg-card px-3 py-2 font-mono text-sm tracking-wider text-ink">
                  {syncCode}
                </code>
                <Btn
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(syncCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                >
                  <Copy className="size-4" aria-hidden /> {copied ? "Copied!" : "Copy"}
                </Btn>
              </div>
              <p
                className={cn(
                  "mt-3 flex items-center gap-1.5 text-xs",
                  syncStatus.state === "error" ? "text-bad" : syncStatus.state === "ok" ? "text-good" : "text-ink-3",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    syncStatus.state === "error" ? "bg-bad" : syncStatus.state === "ok" ? "bg-good" : "bg-warn animate-pulse",
                  )}
                  aria-hidden
                />
                {syncStatus.detail}
                {syncStatus.at && ` · ${new Date(syncStatus.at).toLocaleTimeString()}`}
              </p>
              <div className="mt-3 flex gap-2">
                <Btn variant="soft" onClick={() => window.dispatchEvent(new Event("lifeos-sync-now"))}>
                  <RefreshCw className="size-4" aria-hidden /> Sync now
                </Btn>
                <Btn
                  variant="ghost"
                  onClick={() => {
                    setSyncCode("");
                    clearSyncMeta();
                  }}
                >
                  Stop syncing
                </Btn>
              </div>
              <p className="mt-3 text-xs text-ink-3">
                Treat the code like a password — anyone who has it can read and change
                this data.
              </p>
            </>
          )}
        </GlassCard>

        {/* theme */}
        <GlassCard className="p-5">
          <SectionTitle>Theme</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 text-left transition-colors",
                  theme === t.id
                    ? "border-accent bg-accent-soft"
                    : "border-line hover:border-line-strong",
                )}
              >
                <span
                  className="mb-3 block h-14 w-full rounded-xl border border-line"
                  style={{ background: t.swatch }}
                  aria-hidden
                />
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {t.icon} {t.label}
                  {theme === t.id && <Check className="ml-auto size-4 text-accent" aria-hidden />}
                </span>
                <span className="mt-0.5 block text-xs text-ink-3">{t.blurb}</span>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-5 text-xs font-medium text-ink-2">Accent</p>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                aria-label={`Accent ${a.label}`}
                aria-pressed={accent === a.id}
                className={cn(
                  "flex size-10 cursor-pointer items-center justify-center rounded-full border-2 transition-transform",
                  accent === a.id ? "scale-110 border-[var(--ink)]" : "border-transparent",
                )}
                style={{ background: a.color }}
              >
                {accent === a.id && <Check className="size-4 text-black/70" aria-hidden />}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* AI */}
        <GlassCard className="p-5">
          <SectionTitle>AI assistant</SectionTitle>
          <p className="mb-4 text-sm leading-relaxed text-ink-3">
            Without a key, the Assistant runs a private on-device rules engine. Add a key
            for real AI conversations — keys are stored only in this browser and sent
            directly from your device to the provider. Note: Claude Pro and Gemini Pro
            <em> subscriptions</em> don&apos;t include API access; keys are separate (and
            Google&apos;s has a free tier).
          </p>

          <p className="mb-2 text-xs font-medium text-ink-2">Preferred model</p>
          <div className="mb-4 grid max-w-md grid-cols-2 gap-2">
            {(
              [
                { id: "claude", label: "Claude", hint: "claude-opus-4-8", ready: !!apiKey },
                { id: "gemini", label: "Gemini", hint: "gemini-2.5-flash", ready: !!geminiKey },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                aria-pressed={provider === p.id}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 text-left transition-colors",
                  provider === p.id
                    ? "border-accent bg-accent-soft"
                    : "border-line hover:border-line-strong",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {p.label}
                  {provider === p.id && <Check className="ml-auto size-4 text-accent" aria-hidden />}
                </span>
                <span className="mt-0.5 block text-xs text-ink-3">{p.hint}</span>
                <span className={cn("mt-1 block text-[11px] font-medium", p.ready ? "text-good" : "text-warn")}>
                  {p.ready ? "key added" : "no key yet"}
                </span>
              </button>
            ))}
          </div>

          <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="set-key">
            Anthropic API key
          </label>
          <input
            id="set-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value.trim())}
            placeholder="sk-ant-…"
            autoComplete="off"
            className={cn(inputCls, "max-w-md font-mono")}
          />
          <p className="mb-3 mt-1 text-xs text-ink-3">
            console.anthropic.com → API keys. Pay-as-you-go credits (separate from Claude Pro).
          </p>

          <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="set-gemini">
            Gemini API key
          </label>
          <input
            id="set-gemini"
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value.trim())}
            placeholder="AIza…"
            autoComplete="off"
            className={cn(inputCls, "max-w-md font-mono")}
          />
          <p className="mt-1 text-xs text-ink-3">
            aistudio.google.com → Get API key — free tier, works with your Google account.
            Avoid saving keys on shared computers.
          </p>
        </GlassCard>

        {/* data */}
        <GlassCard className="p-5">
          <SectionTitle>Your data</SectionTitle>
          <p className="mb-4 text-sm leading-relaxed text-ink-3">
            Everything lives in your browser&apos;s local storage — no account, no cloud, no tracking. Export a JSON backup anytime.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="soft" onClick={exportData}>
              <Download className="size-4" aria-hidden /> Export JSON
            </Btn>
            {confirmReset ? (
              <>
                <Btn
                  variant="danger"
                  onClick={() => {
                    if (confirmReset === "empty") life.resetEmpty();
                    else life.resetAll();
                    setConfirmReset(null);
                  }}
                >
                  {confirmReset === "empty"
                    ? "Yes, wipe everything — start blank"
                    : "Yes, load the demo data"}
                </Btn>
                <Btn variant="ghost" onClick={() => setConfirmReset(null)}>
                  Cancel
                </Btn>
              </>
            ) : (
              <>
                <Btn variant="ghost" onClick={() => setConfirmReset("empty")}>
                  <RotateCcw className="size-4" aria-hidden /> Start fresh (empty)
                </Btn>
                <Btn variant="ghost" onClick={() => setConfirmReset("demo")}>
                  Reset to demo data
                </Btn>
              </>
            )}
          </div>
        </GlassCard>

        {/* about */}
        <motion.p variants={fadeUp} className="px-1 text-xs leading-relaxed text-ink-3">
          LifeOS · local-first personal operating system. Calendar sync, AI assistants and
          health-platform integrations are designed into the architecture and coming next.
        </motion.p>
      </div>
    </motion.div>
  );
}
