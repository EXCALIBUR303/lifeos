"use client";

import { Bars } from "@/components/charts";
import {
  Btn,
  Chip,
  GlassCard,
  PageHeader,
  SectionTitle,
  stagger,
} from "@/components/ui";
import { useLife } from "@/lib/store";
import { cn, lastNDates, sum, todayISO, weekdayShort } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw, Sparkles, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const PRESETS = [25, 50, 90];
const LABELS = ["Deep work", "Study", "Reading", "Robot dog", "Admin"];

export default function FocusPage() {
  const { focus, addFocus } = useLife();
  const today = todayISO();

  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState(LABELS[0]);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // countdown loop
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          addFocus(minutes, label);
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 2600);
          return minutes * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, minutes, label, addFocus]);

  const pickPreset = (m: number) => {
    setMinutes(m);
    setSecondsLeft(m * 60);
    setRunning(false);
  };

  const reset = () => {
    setSecondsLeft(minutes * 60);
    setRunning(false);
  };

  const total = minutes * 60;
  const progress = 1 - secondsLeft / total;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const todayMin = sum(focus.filter((f) => f.date === today).map((f) => f.minutes));
  const weekBars = lastNDates(7).map((d) => ({
    label: weekdayShort(d),
    value: sum(focus.filter((f) => f.date === d).map((f) => f.minutes)),
  }));
  const recentSessions = useMemo(
    () => [...focus].reverse().slice(0, 8),
    [focus],
  );

  // ring geometry
  const R = 120;
  const C = 2 * Math.PI * R;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Focus mode"
        title="One thing at a"
        accent="time"
        subtitle="A timer, your intention, and nothing else. Finished sessions are logged automatically."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* timer */}
        <GlassCard className="relative flex flex-col items-center overflow-hidden p-8 xl:col-span-7">
          <AnimatePresence>{celebrate && <Burst key="burst" />}</AnimatePresence>

          <div className="mb-6 flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => pickPreset(p)}
                aria-pressed={minutes === p}
                className={cn(
                  "cursor-pointer rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors",
                  minutes === p
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-ink-3 hover:text-ink",
                )}
              >
                {p} min
              </button>
            ))}
          </div>

          <div className="relative" style={{ width: 280, height: 280 }}>
            <svg width={280} height={280} className="-rotate-90">
              <circle cx={140} cy={140} r={R} fill="none" stroke="var(--line)" strokeWidth={10} />
              <motion.circle
                cx={140}
                cy={140}
                r={R}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={C}
                animate={{ strokeDashoffset: C * (1 - progress) }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p
                className="text-6xl font-semibold tabular-nums tracking-tight text-ink"
                role="timer"
                aria-live="off"
              >
                {mm}:{ss}
              </p>
              <p className="mt-1 text-sm text-ink-3">{running ? label : "ready when you are"}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {LABELS.map((l) => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                aria-pressed={label === l}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  label === l
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-ink-3 hover:text-ink",
                )}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Btn onClick={() => setRunning((r) => !r)} className="min-w-36">
              {running ? (
                <>
                  <Pause className="size-4" aria-hidden /> Pause
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden /> {secondsLeft < total ? "Resume" : "Start"}
                </>
              )}
            </Btn>
            <Btn variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden /> Reset
            </Btn>
          </div>
        </GlassCard>

        {/* stats */}
        <div className="space-y-4 xl:col-span-5">
          <GlassCard className="flex items-center gap-4 p-5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Timer className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-ink">
                {todayMin} min
              </p>
              <p className="text-xs text-ink-3">focused today</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <SectionTitle>This week</SectionTitle>
            <Bars data={weekBars} height={150} color="var(--s1)" fmt={(n) => `${Math.round(n)}m`} />
          </GlassCard>

          <GlassCard className="p-5">
            <SectionTitle>Recent sessions</SectionTitle>
            <ul className="space-y-1.5">
              {recentSessions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm">
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                  <span className="flex-1 text-ink-2">{s.label}</span>
                  <Chip>{s.minutes} min</Chip>
                  <span className="w-16 text-right text-xs text-ink-3">
                    {s.date === today ? "today" : weekdayShort(s.date)}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}

/** Celebration burst when a session completes. */
function Burst() {
  const pieces = Array.from({ length: 18 });
  const colors = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.p
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-strong z-10 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-ink"
      >
        <Sparkles className="size-4 text-accent" aria-hidden /> Session complete — logged!
      </motion.p>
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute size-2 rounded-full"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * (90 + (i % 3) * 40),
              y: Math.sin(angle) * (90 + (i % 3) * 40),
              opacity: 0,
              scale: 0.4,
            }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        );
      })}
    </motion.div>
  );
}
