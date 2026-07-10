"use client";

import { moodGlyph } from "@/components/charts";
import { GlassCard, PageHeader, fadeUp, stagger } from "@/components/ui";
import { habitScheduledOn } from "@/lib/insights";
import { useLife } from "@/lib/store";
import { CATEGORY_META } from "@/lib/types";
import {
  cn,
  fmtMoney,
  fmtMoneyCompact,
  fmtNum,
  mean,
  monthKey,
  monthLabel,
  sum,
  toISO,
  todayISO,
} from "@/lib/utils";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Flame,
  Footprints,
  HeartPulse,
  Moon,
  NotebookPen,
  PiggyBank,
  Timer,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

function lastMonthKeys(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(toISO(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
  }
  return out;
}

function daysInMonth(mk: string): string[] {
  const [y, m] = mk.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  const today = todayISO();
  return Array.from({ length: count }, (_, i) => {
    const d = `${mk}-${String(i + 1).padStart(2, "0")}`;
    return d;
  }).filter((d) => d <= today);
}

export default function RecapPage() {
  const life = useLife();
  const months = lastMonthKeys(6);
  const [mk, setMk] = useState(months[0]);
  const isCurrent = mk === monthKey(todayISO());

  const r = useMemo(() => {
    const days = daysInMonth(mk);

    const tasksDone = life.tasks.filter(
      (t) => t.completedAt && monthKey(t.completedAt) === mk,
    ).length;

    const focusMin = sum(
      life.focus.filter((f) => monthKey(f.date) === mk).map((f) => f.minutes),
    );

    let habitDone = 0;
    let habitScheduled = 0;
    let perfectDays = 0;
    for (const d of days) {
      const scheduled = life.habits.filter((h) => habitScheduledOn(h, d));
      const done = scheduled.filter((h) => h.history.includes(d));
      habitScheduled += scheduled.length;
      habitDone += done.length;
      if (scheduled.length > 0 && done.length === scheduled.length) perfectDays++;
    }

    const spend = sum(
      life.transactions
        .filter((t) => t.kind === "expense" && monthKey(t.date) === mk)
        .map((t) => t.amount),
    );
    const income = sum(
      life.transactions
        .filter((t) => t.kind === "income" && monthKey(t.date) === mk)
        .map((t) => t.amount),
    );
    const byCat = new Map<string, number>();
    for (const t of life.transactions)
      if (t.kind === "expense" && monthKey(t.date) === mk)
        byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];

    const sleeps = days.map((d) => life.health[d]?.sleep).filter((v): v is number => !!v);
    const steps = sum(days.map((d) => life.health[d]?.steps ?? 0));
    const workouts = days.filter((d) => (life.health[d]?.workout ?? 0) > 0).length;

    const entries = life.journal.filter((j) => monthKey(j.date) === mk);
    const avgMood = entries.length ? mean(entries.map((j) => j.mood)) : 0;
    const bestEntry = [...entries].sort((a, b) => b.mood - a.mood)[0];

    return {
      days: days.length,
      tasksDone,
      focusMin,
      habitRate: habitScheduled ? habitDone / habitScheduled : 0,
      habitDone,
      perfectDays,
      spend,
      income,
      saved: income - spend,
      topCat,
      sleepAvg: sleeps.length ? mean(sleeps) : 0,
      steps,
      workouts,
      entries: entries.length,
      avgMood,
      bestEntry,
    };
  }, [life, mk]);

  const headlines = useMemo(() => {
    const out: string[] = [];
    if (r.focusMin > 0)
      out.push(
        r.tasksDone > 0
          ? `You went deep for ${Math.round(r.focusMin / 60)} hours — ${r.tasksDone} task${r.tasksDone === 1 ? "" : "s"} shipped along the way.`
          : `You went deep for ${Math.round(r.focusMin / 60)} hours of focused work.`,
      );
    if (r.perfectDays > 0)
      out.push(
        `${r.perfectDays} perfect habit day${r.perfectDays === 1 ? "" : "s"}, with ${Math.round(r.habitRate * 100)}% of scheduled habits done overall.`,
      );
    if (r.income > 0 && r.saved > 0)
      out.push(
        `You kept ${fmtMoney(r.saved)} of what you earned — a ${Math.round((r.saved / r.income) * 100)}% savings rate.`,
      );
    else if (r.spend > 0) out.push(`You spent ${fmtMoney(r.spend)} this month.`);
    if (r.bestEntry)
      out.push(
        `Brightest day in the journal: “${r.bestEntry.title}” ${moodGlyph(r.bestEntry.mood)}`,
      );
    return out;
  }, [r]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Life replay"
        title="The story of"
        accent={monthLabel(mk).split(" ")[0]}
        subtitle={
          isCurrent
            ? "The month so far, told by your own data."
            : "A month of your life, told by your own data."
        }
      />

      {/* month picker */}
      <motion.div variants={fadeUp} className="mb-6 flex flex-wrap gap-2">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setMk(m)}
            aria-pressed={m === mk}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              m === mk
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-ink-3 hover:text-ink",
            )}
          >
            {monthLabel(m)}
          </button>
        ))}
      </motion.div>

      {/* headlines */}
      <motion.div variants={fadeUp} className="mb-6 space-y-2">
        {headlines.map((h, i) => (
          <motion.p
            key={mk + i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.12 }}
            className="text-lg leading-relaxed text-ink"
          >
            <span className="text-display text-accent">{String(i + 1).padStart(2, "0")}</span>
            {"  "}
            {h}
          </motion.p>
        ))}
        {headlines.length === 0 && (
          <p className="text-sm text-ink-3">Not enough data in this month for a story yet.</p>
        )}
      </motion.div>

      {/* stat mosaic */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <RecapStat icon={<Timer className="size-5" aria-hidden />} color="var(--s1)" value={`${Math.round(r.focusMin / 60)}h`} label="deep work" sub={`${r.focusMin} focused minutes`} />
        <RecapStat icon={<CheckCircle2 className="size-5" aria-hidden />} color="var(--s2)" value={r.tasksDone} label="tasks completed" sub={`across ${r.days} days`} />
        <RecapStat icon={<Flame className="size-5" aria-hidden />} color="var(--s3)" value={`${Math.round(r.habitRate * 100)}%`} label="habit consistency" sub={`${r.perfectDays} perfect days`} />
        <RecapStat icon={<NotebookPen className="size-5" aria-hidden />} color="var(--s4)" value={r.entries} label="journal entries" sub={r.avgMood ? `avg mood ${r.avgMood.toFixed(1)}/5 ${moodGlyph(Math.round(r.avgMood))}` : "—"} />
        <RecapStat icon={<Wallet className="size-5" aria-hidden />} color="var(--s1)" value={fmtMoneyCompact(r.spend)} label="spent" sub={r.topCat ? `most on ${CATEGORY_META[r.topCat[0] as keyof typeof CATEGORY_META].label.toLowerCase()}` : "—"} />
        <RecapStat
          icon={r.saved >= 0 ? <TrendingUp className="size-5" aria-hidden /> : <TrendingDown className="size-5" aria-hidden />}
          color={r.saved >= 0 ? "var(--s2)" : "var(--s4)"}
          value={fmtMoneyCompact(Math.abs(r.saved))}
          label={r.saved >= 0 ? "saved" : "overspent"}
          sub={r.income > 0 ? `${Math.round((r.saved / r.income) * 100)}% of income` : "no income logged"}
        />
        <RecapStat icon={<PiggyBank className="size-5" aria-hidden />} color="var(--s3)" value={fmtMoneyCompact(r.income)} label="earned" sub="salary + freelance" />
        <RecapStat icon={<Moon className="size-5" aria-hidden />} color="var(--s5)" value={r.sleepAvg ? `${r.sleepAvg.toFixed(1)}h` : "—"} label="avg sleep" sub="per night" />
        <RecapStat icon={<Footprints className="size-5" aria-hidden />} color="var(--s2)" value={fmtNum(r.steps)} label="steps walked" sub={`≈ ${Math.round(r.steps / 1300)} km`} />
        <RecapStat icon={<HeartPulse className="size-5" aria-hidden />} color="var(--s4)" value={r.workouts} label="workouts" sub={`${Math.round((r.workouts / Math.max(1, r.days)) * 7)} per week`} />
      </div>
    </motion.div>
  );
}

function RecapStat({
  icon,
  color,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  color: string;
  value: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <GlassCard className="p-5">
      <span
        className="mb-3 flex size-10 items-center justify-center rounded-2xl"
        style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        {icon}
      </span>
      <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="text-sm font-medium text-ink-2">{label}</p>
      <p className="mt-0.5 text-xs text-ink-3">{sub}</p>
    </GlassCard>
  );
}
