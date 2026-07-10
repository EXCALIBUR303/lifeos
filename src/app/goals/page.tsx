"use client";

import {
  Btn,
  Chip,
  PageHeader,
  ProgressRing,
  fadeUp,
  inputCls,
  stagger,
} from "@/components/ui";
import { useLife } from "@/lib/store";
import { AREA_LABELS, Goal, LifeArea } from "@/lib/types";
import { cn, daysBetween, prettyDate, todayISO } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";

const HORIZONS: { id: Goal["horizon"]; label: string; blurb: string }[] = [
  { id: "short", label: "Short-term", blurb: "Weeks to a few months" },
  { id: "long", label: "Long-term", blurb: "The year-scale campaigns" },
  { id: "dream", label: "Dream board", blurb: "The ones that make life worth planning" },
];

/** Naive deadline forecast from milestone velocity. */
function forecast(g: Goal): { label: string; good: boolean } | null {
  if (!g.deadline) return null;
  const total = g.milestones.length || 1;
  const done = g.milestones.filter((m) => m.done).length;
  const today = todayISO();
  const elapsed = Math.max(1, daysBetween(g.createdAt, today));
  const remainingDays = daysBetween(today, g.deadline);
  if (remainingDays < 0) return { label: "past deadline", good: false };
  if (done === 0) return { label: "not started", good: false };
  if (done === total) return { label: "complete", good: true };
  const daysPerMilestone = elapsed / done;
  const projected = daysPerMilestone * (total - done);
  return projected <= remainingDays
    ? { label: "on track", good: true }
    : { label: "at risk", good: false };
}

export default function GoalsPage() {
  const { goals, toggleMilestone, deleteGoal, addGoal } = useLife();
  const [creating, setCreating] = useState(false);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Goal tracker"
        title="The life you're"
        accent="building"
        subtitle="Big goals, decomposed into milestones — with an honest forecast of whether you'll make it."
        actions={
          <Btn onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> New goal
          </Btn>
        }
      />

      <div className="space-y-8">
        {HORIZONS.map((hz) => {
          const items = goals.filter((g) => g.horizon === hz.id);
          if (!items.length) return null;
          return (
            <motion.section key={hz.id} variants={fadeUp}>
              <div className="mb-3">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{hz.label}</h2>
                <p className="text-xs text-ink-3">{hz.blurb}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AnimatePresence initial={false}>
                  {items.map((g) => {
                    const done = g.milestones.filter((m) => m.done).length;
                    const total = g.milestones.length || 1;
                    const p = done / total;
                    const fc = forecast(g);
                    return (
                      <motion.article
                        key={g.id}
                        layout
                        exit={{ opacity: 0, scale: 0.97 }}
                        className={cn(
                          "glass group rounded-2xl p-5",
                          hz.id === "dream" && "border-accent-soft bg-gradient-to-br from-accent-soft/60 to-transparent",
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <ProgressRing
                            value={p}
                            size={54}
                            stroke={5}
                            label={p === 1 ? <Trophy className="size-4 text-warn" aria-hidden /> : `${Math.round(p * 100)}%`}
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] font-semibold leading-snug text-ink">{g.title}</h3>
                            {g.why && (
                              <p className="text-display mt-0.5 text-sm text-ink-2">“{g.why}”</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Chip>{AREA_LABELS[g.area as LifeArea]}</Chip>
                              {g.deadline && (
                                <Chip>
                                  <CalendarClock className="size-3" aria-hidden />
                                  {prettyDate(g.deadline)}
                                </Chip>
                              )}
                              {fc && (
                                <Chip
                                  className={
                                    fc.good
                                      ? "border-good-soft bg-good-soft text-good"
                                      : "border-warn-soft bg-warn-soft text-warn"
                                  }
                                >
                                  <Sparkles className="size-3" aria-hidden /> {fc.label}
                                </Chip>
                              )}
                            </div>
                          </div>
                          <button
                            aria-label={`Delete ${g.title}`}
                            onClick={() => deleteGoal(g.id)}
                            className="cursor-pointer text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>

                        <ul className="mt-4 space-y-1">
                          {g.milestones.map((m) => (
                            <li key={m.id}>
                              <button
                                onClick={() => toggleMilestone(g.id, m.id)}
                                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-hover"
                              >
                                <span
                                  className={cn(
                                    "flex size-4.5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                                    m.done
                                      ? "border-good bg-good text-white"
                                      : "border-line-strong text-transparent",
                                  )}
                                >
                                  <Check className="size-3" strokeWidth={3} />
                                </span>
                                <span className={cn("text-sm", m.done ? "text-ink-3 line-through" : "text-ink-2")}>
                                  {m.title}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.section>
          );
        })}
      </div>

      <AnimatePresence>
        {creating && (
          <NewGoalModal
            onClose={() => setCreating(false)}
            onAdd={(g) => {
              addGoal(g);
              setCreating(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NewGoalModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (g: {
    title: string;
    area: LifeArea;
    horizon: Goal["horizon"];
    deadline?: string;
    why?: string;
    milestones: string[];
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [area, setArea] = useState<LifeArea>("learning");
  const [horizon, setHorizon] = useState<Goal["horizon"]>("short");
  const [deadline, setDeadline] = useState("");
  const [milestones, setMilestones] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      area,
      horizon,
      deadline: deadline || undefined,
      why: why.trim() || undefined,
      milestones: milestones
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean),
    });
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
        aria-label="New goal"
        className="glass-strong max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-5 thin-scroll"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">New goal</h2>
          <button aria-label="Close" onClick={onClose} className="cursor-pointer text-ink-3 hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="goal-title">Goal</label>
        <input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run a half marathon" className={inputCls} autoFocus />

        <label className="mb-1 mt-3 block text-xs font-medium text-ink-2" htmlFor="goal-why">Why it matters (optional)</label>
        <input id="goal-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="One honest sentence" className={inputCls} />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="goal-area">Life area</label>
            <select id="goal-area" value={area} onChange={(e) => setArea(e.target.value as LifeArea)} className={inputCls}>
              {Object.entries(AREA_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="goal-deadline">Deadline</label>
            <input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </div>
        </div>

        <p className="mb-1 mt-3 text-xs font-medium text-ink-2">Horizon</p>
        <div className="grid grid-cols-3 gap-2">
          {HORIZONS.map((h) => (
            <button
              key={h.id}
              onClick={() => setHorizon(h.id)}
              aria-pressed={horizon === h.id}
              className={cn(
                "cursor-pointer rounded-xl border py-2 text-xs font-medium transition-colors",
                horizon === h.id ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-3 hover:text-ink",
              )}
            >
              {h.label}
            </button>
          ))}
        </div>

        <label className="mb-1 mt-3 block text-xs font-medium text-ink-2" htmlFor="goal-ms">
          Milestones — one per line
        </label>
        <textarea
          id="goal-ms"
          value={milestones}
          onChange={(e) => setMilestones(e.target.value)}
          rows={4}
          placeholder={"Sign up for the race\nRun 10K comfortably\nRun 15K long run\nRace day"}
          className={cn(inputCls, "resize-none")}
        />

        <Btn className="mt-5 w-full" onClick={submit} disabled={!title.trim()}>
          Create goal
        </Btn>
      </motion.div>
    </motion.div>
  );
}
