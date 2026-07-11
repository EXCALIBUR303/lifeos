"use client";

import { CaptureKind, parseCapture } from "@/lib/capture";
import { insights, lifeScore } from "@/lib/insights";
import { ThemeMode, useLife, useSettings } from "@/lib/store";
import { cn, prettyDate, todayISO } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Command,
  CornerDownLeft,
  Droplets,
  Dumbbell,
  Film,
  Footprints,
  GraduationCap,
  HeartPulse,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Moon,
  MoonStar,
  NotebookPen,
  Repeat,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Sun,
  Target,
  Timer,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { SyncManager } from "./sync";
import { ProgressRing } from "./ui";

const NAV_GROUPS: {
  label: string | null;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: null,
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/assistant", label: "Assistant", icon: Bot },
      { href: "/recap", label: "Recap", icon: Film },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckCircle2 },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/focus", label: "Focus", icon: Timer },
    ],
  },
  {
    label: "Track",
    items: [
      { href: "/habits", label: "Habits", icon: Repeat },
      { href: "/expenses", label: "Money", icon: Wallet },
      { href: "/health", label: "Health", icon: HeartPulse },
      { href: "/journal", label: "Journal", icon: NotebookPen },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/study", label: "Study", icon: GraduationCap },
      { href: "/notes", label: "Notes", icon: StickyNote },
    ],
  },
  {
    label: null,
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

const NAV = NAV_GROUPS.flatMap((g) => g.items);

const THEME_ORDER: ThemeMode[] = ["dark", "light", "oled"];

/* ================================================================
   AppShell
   ================================================================ */

const noopSubscribe = () => () => {};

export function AppShell({ children }: { children: ReactNode }) {
  // true only after hydration on the client — SSR renders the splash
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [showSplash, setShowSplash] = useState(true);
  const theme = useSettings((s) => s.theme);
  const accent = useSettings((s) => s.accent);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 800);
    return () => clearTimeout(t);
  }, []);

  // offline/PWA service worker — production builds only (dev uses HMR)
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // apply theme + accent to <html>
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = theme;
    if (accent === "indigo") delete document.documentElement.dataset.accent;
    else document.documentElement.dataset.accent = accent;
  }, [theme, accent, mounted]);

  // global ⌘K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="aurora" aria-hidden>
        <div className="aurora-mid" />
      </div>
      {showSplash && <Splash hiding={mounted} />}
      {mounted && (
        <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
          <SyncManager />
          <Sidebar onSearch={() => setPaletteOpen(true)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onSearch={() => setPaletteOpen(true)} />
            <main className="flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2 sm:px-6 lg:px-10 lg:pb-12">
              {children}
            </main>
          </div>
          <MobileNav />
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
      )}
    </>
  );
}

/* ================================================================
   Splash
   ================================================================ */

function Splash({ hiding }: { hiding: boolean }) {
  // CSS opacity transition (compositor-driven) so the fade completes even in
  // throttled background tabs where rAF-based animations freeze.
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg transition-opacity duration-500",
        hiding && "pointer-events-none opacity-0",
      )}
      aria-hidden
    >
      <div className="relative">
        <div className="size-16 animate-[float-y_2s_ease-in-out_infinite] rounded-3xl bg-gradient-to-br from-[var(--s1)] via-[var(--s5)] to-[var(--s2)] shadow-2xl" />
        <Sparkles className="absolute inset-0 m-auto size-7 text-white" />
      </div>
      <p className="text-sm tracking-[0.35em] text-ink-3">LIFE OS</p>
    </div>
  );
}

/* ================================================================
   Sidebar (desktop)
   ================================================================ */

function Sidebar({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const life = useLife();
  const score = useMemo(() => lifeScore(life), [life]);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-2 p-4 lg:flex">
      <div className="glass flex h-full flex-col rounded-3xl p-4">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <span className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--s1)] via-[var(--s5)] to-[var(--s2)]">
            <Sparkles className="size-4 text-white" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            LifeOS
          </span>
        </Link>

        <button
          onClick={onSearch}
          className="mb-4 flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search or add…</span>
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>

        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1 thin-scroll"
          aria-label="Primary"
        >
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && "mt-2")}>
              {group.label && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                      active ? "text-ink" : "text-ink-3 hover:text-ink-2",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl border border-line bg-card-hover"
                        transition={{ type: "spring", bounce: 0.22, duration: 0.55 }}
                      />
                    )}
                    <item.icon
                      className={cn("relative z-10 size-[18px]", active && "text-accent")}
                      aria-hidden
                    />
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
          <ProgressRing value={score / 100} size={44} stroke={4} label={score} />
          <div>
            <p className="text-xs font-semibold text-ink">Life Score</p>
            <p className="text-[11px] text-ink-3">Balanced week</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ================================================================
   Topbar
   ================================================================ */

function Topbar({ onSearch }: { onSearch: () => void }) {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const cycleTheme = () =>
    setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]);
  const ThemeIcon = theme === "light" ? Sun : theme === "oled" ? MoonStar : Moon;

  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-2">
        {prettyDate(todayISO())}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSearch}
          aria-label="Open command palette"
          className="glass flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink lg:hidden"
        >
          <Search className="size-4" aria-hidden />
        </button>
        <button
          onClick={cycleTheme}
          aria-label={`Theme: ${theme}. Click to change.`}
          className="glass flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink"
        >
          <ThemeIcon className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   Mobile bottom nav
   ================================================================ */

const MOBILE_TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/assistant", label: "Assistant", icon: Bot },
];

function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const onATab = MOBILE_TABS.some((t) => t.href === pathname);

  return (
    <>
      <nav
        aria-label="Primary"
        className="glass-strong fixed inset-x-3 z-40 rounded-2xl px-1 py-1 lg:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-stretch justify-around">
          {MOBILE_TABS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-accent" : "text-ink-3",
                )}
              >
                <span className={cn("rounded-xl px-3 py-0.5 transition-colors", active && "bg-accent-soft")}>
                  <item.icon className="size-5" aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More sections"
            aria-expanded={moreOpen}
            className={cn(
              "flex min-w-14 cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
              !onATab ? "text-accent" : "text-ink-3",
            )}
          >
            <span className={cn("rounded-xl px-3 py-0.5 transition-colors", !onATab && "bg-accent-soft")}>
              <LayoutGrid className="size-5" aria-hidden />
            </span>
            More
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-label="All sections"
              className="glass-strong w-full rounded-t-3xl p-5"
              style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
              <div className="grid grid-cols-4 gap-2">
                {NAV.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-[11px] font-medium transition-colors",
                        active
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-line text-ink-2",
                      )}
                    >
                      <item.icon className="size-5" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ================================================================
   Command palette
   ================================================================ */

interface Action {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && <PaletteInner key="palette" onClose={onClose} />}
    </AnimatePresence>
  );
}

const CAPTURE_ICONS: Record<CaptureKind, typeof Wallet> = {
  expense: Wallet,
  income: Wallet,
  water: Droplets,
  sleep: Moon,
  steps: Footprints,
  workout: Dumbbell,
  habit: Repeat,
  note: StickyNote,
  journal: NotebookPen,
  event: CalendarDays,
  card: Layers,
  task: CheckCircle2,
};

// Mounted fresh each time the palette opens, so query/selection state needs no reset.
function PaletteInner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selRaw, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const logHealth = useLife((s) => s.logHealth);
  const health = useLife((s) => s.health);
  const life = useLife();
  const setTheme = useSettings((s) => s.setTheme);
  const smartInsights = useMemo(() => insights(life), [life]);

  const capture = useMemo(() => (q.trim() ? parseCapture(q) : null), [q]);

  const actions: Action[] = useMemo(() => {
    const base: Action[] = [
      ...NAV.map((n) => ({
        id: `nav-${n.href}`,
        label: `Go to ${n.label}`,
        icon: <n.icon className="size-4" aria-hidden />,
        run: () => router.push(n.href),
      })),
      {
        id: "water",
        label: "Log a glass of water",
        hint: `${health[todayISO()]?.water ?? 0}/8 today`,
        icon: <Droplets className="size-4" aria-hidden />,
        run: () =>
          logHealth(todayISO(), {
            water: (health[todayISO()]?.water ?? 0) + 1,
          }),
      },
      {
        id: "focus",
        label: "Start a focus session",
        icon: <Timer className="size-4" aria-hidden />,
        run: () => router.push("/focus"),
      },
      {
        id: "theme-dark",
        label: "Theme: Dark",
        icon: <Moon className="size-4" aria-hidden />,
        run: () => setTheme("dark"),
      },
      {
        id: "theme-light",
        label: "Theme: Light",
        icon: <Sun className="size-4" aria-hidden />,
        run: () => setTheme("light"),
      },
      {
        id: "theme-oled",
        label: "Theme: OLED",
        icon: <MoonStar className="size-4" aria-hidden />,
        run: () => setTheme("oled"),
      },
    ];
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? base.filter((a) => a.label.toLowerCase().includes(needle))
      : base;

    // universal capture — anything you type becomes data in the right module
    if (capture) {
      const CaptureIcon = CAPTURE_ICONS[capture.kind];
      filtered.unshift({
        id: "capture",
        label: capture.label,
        hint: capture.hint,
        icon: <CaptureIcon className="size-4" aria-hidden />,
        run: () => {
          capture.apply();
          router.push(capture.dest);
        },
      });
    }
    return filtered;
  }, [q, capture, router, logHealth, health, setTheme]);

  const sel = Math.max(0, Math.min(selRaw, actions.length - 1));

  const runAction = (a: Action) => {
    a.run();
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
          <motion.div
            role="dialog"
            aria-label="Command palette"
            className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Command className="size-4 text-ink-3" aria-hidden />
              <input
                ref={inputRef}
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSel((s) => Math.min(actions.length - 1, s + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSel((s) => Math.max(0, s - 1));
                  }
                  if (e.key === "Enter" && actions[sel]) runAction(actions[sel]);
                }}
                placeholder="Try “spent 250 on chai” · “slept 7.5” · “meditate” · “note: …”"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
                aria-label="Command input"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-3">
                esc
              </kbd>
            </div>
            <ul className="max-h-[320px] overflow-y-auto p-2 thin-scroll">
              {actions.map((a, i) => (
                <li key={a.id}>
                  <button
                    onClick={() => runAction(a)}
                    onMouseEnter={() => setSel(i)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      i === sel ? "bg-accent-soft text-ink" : "text-ink-2",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg border border-line",
                        i === sel ? "text-accent" : "text-ink-3",
                      )}
                    >
                      {a.icon}
                    </span>
                    <span className="flex-1">{a.label}</span>
                    {a.hint && (
                      <span className="text-[11px] text-ink-3">{a.hint}</span>
                    )}
                    {i === sel && (
                      <CornerDownLeft className="size-3.5 text-ink-3" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
              {actions.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-ink-3">
                  Nothing matches — try “add task …”
                </li>
              )}
            </ul>
            {smartInsights[0] && (
              <button
                onClick={() => {
                  router.push(smartInsights[0].href);
                  onClose();
                }}
                className="flex w-full cursor-pointer items-center gap-2 border-t border-line px-4 py-2.5 text-left text-xs text-ink-3 transition-colors hover:text-ink-2"
              >
                <Sparkles className="size-3.5 text-accent" aria-hidden />
                <span className="flex-1 truncate">
                  {smartInsights[0].title} — {smartInsights[0].body}
                </span>
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
            )}
          </motion.div>
    </motion.div>
  );
}
