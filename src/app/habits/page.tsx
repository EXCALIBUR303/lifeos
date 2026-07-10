"use client";

import { Heatmap } from "@/components/charts";
import {
  Btn,
  Chip,
  DynIcon,
  GlassCard,
  PageHeader,
  fadeUp,
  inputCls,
  stagger,
} from "@/components/ui";
import { habitRate, habitScheduledOn, habitStreak } from "@/lib/insights";
import { useLife } from "@/lib/store";
import { cn, lastNDates, pct, todayISO, weekdayShort } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flame, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];
const ICON_CHOICES = [
  "Flower2", "Dumbbell", "BookOpen", "Code2", "MoonStar", "Phone", "Sunrise",
  "HeartPulse", "GraduationCap", "Plane",
];
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function HabitsPage() {
  const { habits, toggleHabit, addHabit, deleteHabit } = useLife();
  const [creating, setCreating] = useState(false);
  const today = todayISO();

  const combined = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of habits)
      for (const d of h.history) map[d] = (map[d] ?? 0) + 1;
    return map;
  }, [habits]);

  const bestStreak = Math.max(0, ...habits.map((h) => habitStreak(h)));
  const avgRate =
    habits.length > 0
      ? habits.reduce((a, h) => a + habitRate(h, 30), 0) / habits.length
      : 0;
  const perfectDays = useMemo(() => {
    let n = 0;
    for (const d of lastNDates(30)) {
      const scheduled = habits.filter((h) => habitScheduledOn(h, d));
      if (scheduled.length && scheduled.every((h) => h.history.includes(d))) n++;
    }
    return n;
  }, [habits]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Habit tracker"
        title="Small things,"
        accent="daily"
        subtitle="Consistency beats intensity. Tap a day to toggle it."
        actions={
          <Btn onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> New habit
          </Btn>
        }
      />

      {/* overview */}
      <motion.div variants={fadeUp} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard animate={false} className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-warn-soft text-warn">
            <Flame className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xl font-semibold text-ink">{bestStreak} days</p>
            <p className="text-xs text-ink-3">longest active streak</p>
          </div>
        </GlassCard>
        <GlassCard animate={false} className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Check className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xl font-semibold text-ink">{pct(avgRate)}</p>
            <p className="text-xs text-ink-3">completion, last 30 days</p>
          </div>
        </GlassCard>
        <GlassCard animate={false} className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-good-soft text-good">
            <Flame className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xl font-semibold text-ink">{perfectDays}</p>
            <p className="text-xs text-ink-3">perfect days this month</p>
          </div>
        </GlassCard>
      </motion.div>

      {/* combined heatmap */}
      <GlassCard className="mb-6 p-5">
        <h2 className="mb-3 text-sm font-medium text-ink-2">
          Your consistency, last 18 weeks
        </h2>
        <Heatmap values={combined} weeks={18} fmt={(n) => `${n} habit${n === 1 ? "" : "s"}`} />
      </GlassCard>

      {/* habit cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnimatePresence initial={false}>
          {habits.map((h) => {
            const color = SERIES[(h.color - 1) % SERIES.length];
            const streak = habitStreak(h);
            const rate = habitRate(h, 30);
            const week = lastNDates(7);
            const doneToday = h.history.includes(today);
            return (
              <motion.div
                key={h.id}
                layout
                variants={fadeUp}
                exit={{ opacity: 0, scale: 0.97 }}
                className="glass group rounded-2xl p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                  >
                    <DynIcon name={h.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{h.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Chip className={streak >= 7 ? "border-warn-soft bg-warn-soft text-warn" : ""}>
                        <Flame className="size-3" aria-hidden /> {streak} day{streak === 1 ? "" : "s"}
                      </Chip>
                      <Chip>{pct(rate)} · 30d</Chip>
                      <Chip>
                        {h.cadence.length === 7 ? "daily" : h.cadence.map((d) => DAY_LETTERS[d]).join(" ")}
                      </Chip>
                    </div>
                  </div>
                  <button
                    aria-label={`Delete ${h.name}`}
                    onClick={() => deleteHabit(h.id)}
                    className="cursor-pointer text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>

                {/* last 7 days */}
                <div className="mt-4 flex items-center justify-between gap-1">
                  {week.map((d) => {
                    const scheduled = habitScheduledOn(h, d);
                    const done = h.history.includes(d);
                    return (
                      <button
                        key={d}
                        disabled={!scheduled}
                        onClick={() => toggleHabit(h.id, d)}
                        aria-label={`${h.name} on ${d}: ${done ? "done" : "not done"}`}
                        aria-pressed={done}
                        className={cn(
                          "flex h-12 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-medium transition-all",
                          !scheduled && "cursor-not-allowed opacity-30",
                          done ? "border-transparent text-white" : "border-line bg-card text-ink-3 hover:bg-card-hover",
                        )}
                        style={done ? { background: color } : undefined}
                      >
                        {done ? <Check className="size-3.5" strokeWidth={3} /> : weekdayShort(d).slice(0, 1)}
                        <span className={done ? "text-white/80" : ""}>{d.slice(8)}</span>
                      </button>
                    );
                  })}
                </div>

                <Btn
                  variant={doneToday ? "ghost" : "soft"}
                  className="mt-3 w-full"
                  onClick={() => toggleHabit(h.id, today)}
                >
                  {doneToday ? "Done today — undo" : "Mark done today"}
                </Btn>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* create modal */}
      <AnimatePresence>
        {creating && <NewHabitModal onClose={() => setCreating(false)} onAdd={addHabit} />}
      </AnimatePresence>
    </motion.div>
  );
}

function NewHabitModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (h: { name: string; icon: string; color: number; cadence: number[] }) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [color, setColor] = useState(1);
  const [cadence, setCadence] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const toggleDay = (d: number) =>
    setCadence((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d].sort()));

  const submit = () => {
    if (!name.trim() || cadence.length === 0) return;
    onAdd({ name: name.trim(), icon, color, cadence });
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-label="New habit"
        className="glass-strong w-full max-w-md rounded-2xl p-5"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">New habit</h2>
          <button aria-label="Close" onClick={onClose} className="cursor-pointer text-ink-3 hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="habit-name">
          Name
        </label>
        <input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Stretch for 5 minutes"
          className={inputCls}
          autoFocus
        />

        <p className="mb-1 mt-4 text-xs font-medium text-ink-2">Icon</p>
        <div className="flex flex-wrap gap-1.5">
          {ICON_CHOICES.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              aria-label={ic}
              aria-pressed={icon === ic}
              className={cn(
                "flex size-9 cursor-pointer items-center justify-center rounded-xl border transition-colors",
                icon === ic ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-3 hover:text-ink",
              )}
            >
              <DynIcon name={ic} className="size-4" />
            </button>
          ))}
        </div>

        <p className="mb-1 mt-4 text-xs font-medium text-ink-2">Color</p>
        <div className="flex gap-1.5">
          {SERIES.map((c, i) => (
            <button
              key={c}
              onClick={() => setColor(i + 1)}
              aria-label={`Color ${i + 1}`}
              aria-pressed={color === i + 1}
              className={cn(
                "size-8 cursor-pointer rounded-full border-2 transition-transform",
                color === i + 1 ? "scale-110 border-[var(--ink)]" : "border-transparent",
              )}
              style={{ background: c }}
            />
          ))}
        </div>

        <p className="mb-1 mt-4 text-xs font-medium text-ink-2">Days</p>
        <div className="flex gap-1.5">
          {DAY_LETTERS.map((l, d) => (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              aria-label={`Day ${d}`}
              aria-pressed={cadence.includes(d)}
              className={cn(
                "flex size-9 cursor-pointer items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
                cadence.includes(d)
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line text-ink-3 hover:text-ink",
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <Btn className="mt-5 w-full" onClick={submit} disabled={!name.trim() || cadence.length === 0}>
          Create habit
        </Btn>
      </motion.div>
    </motion.div>
  );
}
