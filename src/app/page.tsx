"use client";

import { AreaTrend, Radar, Sparkline, moodGlyph } from "@/components/charts";
import {
  Btn,
  Chip,
  DynIcon,
  GlassCard,
  MeterBar,
  ProgressRing,
  SectionTitle,
  ToneDot,
  fadeUp,
  stagger,
} from "@/components/ui";
import {
  axisScores,
  briefing,
  habitScheduledOn,
  insights,
  lifeScore,
  monthIncome,
  monthSpend,
} from "@/lib/insights";
import { useLife, useSettings } from "@/lib/store";
import { CATEGORY_META } from "@/lib/types";
import {
  cn,
  fmtMoney,
  fmtMoneyCompact,
  fmtNum,
  greeting,
  lastNDates,
  monthKey,
  relativeDay,
  sum,
  todayISO,
  weekdayShort,
} from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Droplets,
  Footprints,
  Moon,
  Plus,
  Sparkles,
  Timer,
} from "lucide-react";
import Link from "next/link";

const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

export default function Dashboard() {
  const life = useLife();
  const name = useSettings((s) => s.name);
  const today = todayISO();

  // cheap derived data — computed per render, sized in the hundreds of items
  const score = lifeScore(life);
  const axes = axisScores(life);
  const smart = insights(life);
  const brief = briefing(life, name);

  /* tasks for today */
  const dueToday = life.tasks.filter(
    (t) => t.status !== "done" && (t.due === today || (t.due && t.due < today)),
  );
  const upNext = life.tasks
    .filter((t) => t.status !== "done" && t.due && t.due > today)
    .sort((a, b) => (a.due! < b.due! ? -1 : 1))
    .slice(0, 2);

  /* habits today */
  const todaysHabits = life.habits.filter((h) => habitScheduledOn(h, today));
  const habitsDone = todaysHabits.filter((h) => h.history.includes(today)).length;

  /* money */
  const mk = monthKey(today);
  const spendMTD = monthSpend(life.transactions, mk);
  const income = monthIncome(life.transactions, mk);
  const budgetTotal = sum(Object.values(life.budgets) as number[]);
  const spendTrend = lastNDates(30).map((d) => ({
    label: relativeDay(d) === "Today" ? "Today" : d.slice(8),
    value: sum(
      life.transactions
        .filter((t) => t.kind === "expense" && t.date === d)
        .map((t) => t.amount),
    ),
  }));
  const byCat = new Map<string, number>();
  for (const t of life.transactions)
    if (t.kind === "expense" && monthKey(t.date) === mk)
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];

  /* health */
  const h = life.health[today] ?? {};
  const water = h.water ?? 0;
  const steps = h.steps ?? 0;
  const sleep = h.sleep ?? 0;

  /* focus */
  const focusToday = sum(
    life.focus.filter((f) => f.date === today).map((f) => f.minutes),
  );
  const focusSpark = lastNDates(14).map((d) =>
    sum(life.focus.filter((f) => f.date === d).map((f) => f.minutes)),
  );

  /* goals */
  const topGoals = life.goals
    .map((g) => ({
      g,
      p:
        g.milestones.filter((m) => m.done).length /
        Math.max(1, g.milestones.length),
    }))
    .filter((x) => x.p < 1)
    .sort((a, b) => b.p - a.p)
    .slice(0, 3);

  const latestEntry = life.journal[0];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* ---------- hero ---------- */}
      <motion.header variants={fadeUp} className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.25em] text-ink-3">
            {weekdayShort(today)} · your day at a glance
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {greeting(name).replace(name, "")}
            <span className="text-display font-normal text-accent">{name}</span>
          </h1>
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>{brief}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing value={score / 100} size={92} stroke={7} label={
            <span className="text-center leading-tight">
              <span className="block text-xl font-bold">{score}</span>
              <span className="block text-[9px] font-medium uppercase tracking-wider text-ink-3">life score</span>
            </span>
          } />
        </div>
      </motion.header>

      {/* ---------- intelligence strip ---------- */}
      {smart.length > 0 && (
        <motion.div
          variants={fadeUp}
          className="mb-6 flex gap-3 overflow-x-auto pb-1 no-scrollbar"
        >
          {smart.map((ins) => (
            <Link
              key={ins.id}
              href={ins.href}
              className="glass group flex w-[300px] shrink-0 items-start gap-2.5 rounded-2xl p-3.5 transition-colors hover:bg-card-hover"
            >
              <ToneDot tone={ins.tone} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {ins.title}
                </span>
                <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-3">
                  {ins.body}
                </span>
              </span>
              <ArrowRight className="ml-auto mt-1 size-3.5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </motion.div>
      )}

      {/* ---------- widget grid ---------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Today's tasks */}
        <GlassCard className="p-5 xl:col-span-4">
          <SectionTitle
            action={
              <Link href="/tasks" className="text-xs font-medium text-accent hover:text-accent-strong">
                All tasks
              </Link>
            }
          >
            Today
          </SectionTitle>
          {dueToday.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-3">
              Clear runway — nothing due today.
            </p>
          )}
          <ul className="space-y-1.5">
            {dueToday.slice(0, 5).map((t) => (
              <li key={t.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-card-hover">
                <button
                  aria-label={`Complete ${t.title}`}
                  onClick={() => life.setTaskStatus(t.id, "done")}
                  className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-line-strong text-transparent transition-all hover:border-accent hover:text-accent"
                >
                  <Check className="size-3" strokeWidth={3} />
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{t.title}</span>
                  <span className={cn(
                    "text-[11px]",
                    t.due && t.due < today ? "font-medium text-bad" : "text-ink-3",
                  )}>
                    {t.due && t.due < today ? "Overdue" : t.dueTime ? `at ${t.dueTime}` : "today"}
                  </span>
                </span>
                {t.priority === "urgent" && (
                  <Chip className="border-bad-soft bg-bad-soft text-bad">urgent</Chip>
                )}
              </li>
            ))}
          </ul>
          {upNext.length > 0 && (
            <p className="mt-3 border-t border-line pt-3 text-xs text-ink-3">
              Up next: {upNext.map((t) => t.title).join(" · ")}
            </p>
          )}
        </GlassCard>

        {/* Habits */}
        <GlassCard className="p-5 xl:col-span-4">
          <SectionTitle
            action={
              <span className="text-xs font-medium text-ink-3">
                {habitsDone}/{todaysHabits.length}
              </span>
            }
          >
            Habits today
          </SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {todaysHabits.map((habit) => {
              const done = habit.history.includes(today);
              const color = SERIES[(habit.color - 1) % SERIES.length];
              return (
                <button
                  key={habit.id}
                  onClick={() => life.toggleHabit(habit.id, today)}
                  aria-pressed={done}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all duration-200",
                    done
                      ? "border-transparent"
                      : "border-line bg-card hover:bg-card-hover",
                  )}
                  style={done ? { background: `color-mix(in srgb, ${color} 18%, transparent)` } : undefined}
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-xl"
                    style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
                  >
                    {done ? <Check className="size-4" strokeWidth={3} /> : <DynIcon name={habit.icon} className="size-4" />}
                  </span>
                  <span className={cn("text-center text-[11px] leading-tight", done ? "text-ink" : "text-ink-3")}>
                    {habit.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <MeterBar value={habitsDone} max={Math.max(1, todaysHabits.length)} color="var(--s2)" />
          </div>
        </GlassCard>

        {/* Balance radar */}
        <GlassCard className="flex flex-col items-center p-5 xl:col-span-4 xl:row-span-2">
          <SectionTitle>Life balance</SectionTitle>
          <Radar axes={axes.map((a) => ({ label: a.label, score: a.score }))} size={300} />
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-3">
            Strongest: {[...axes].sort((a, b) => b.score - a.score)[0].label} ·
            Needs love: {[...axes].sort((a, b) => a.score - b.score)[0].label}
          </p>
        </GlassCard>

        {/* Money */}
        <GlassCard className="p-5 xl:col-span-5">
          <SectionTitle
            action={
              <Link href="/expenses" className="text-xs font-medium text-accent hover:text-accent-strong">
                Money
              </Link>
            }
          >
            Spending this month
          </SectionTitle>
          <div className="mb-1 flex items-end justify-between">
            <p className="text-2xl font-semibold tracking-tight text-ink">
              {fmtMoneyCompact(spendMTD)}
              <span className="ml-2 text-xs font-normal text-ink-3">
                of {fmtMoneyCompact(budgetTotal)} planned
              </span>
            </p>
            {income > 0 && (
              <p className="text-xs font-medium text-good">
                saving {Math.max(0, Math.round(((income - spendMTD) / income) * 100))}%
              </p>
            )}
          </div>
          <MeterBar value={spendMTD} max={budgetTotal} over={spendMTD > budgetTotal} color="var(--s1)" />
          <div className="mt-4">
            <AreaTrend
              points={spendTrend}
              height={150}
              fmt={(n) => fmtMoneyCompact(n)}
              xEvery={7}
              id="dash-spend"
            />
          </div>
          {topCat && (
            <p className="mt-1 text-xs text-ink-3">
              Biggest category: {CATEGORY_META[topCat[0] as keyof typeof CATEGORY_META].label} · {fmtMoney(topCat[1])}
            </p>
          )}
        </GlassCard>

        {/* Health */}
        <GlassCard className="p-5 xl:col-span-3">
          <SectionTitle
            action={
              <Link href="/health" className="text-xs font-medium text-accent hover:text-accent-strong">
                Health
              </Link>
            }
          >
            Body today
          </SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <ProgressRing value={water / 8} size={56} stroke={5} color="var(--s5)" label={<Droplets className="size-4 text-[var(--s5)]" aria-hidden />} />
              <span className="text-xs font-semibold text-ink">{water}/8</span>
              <span className="text-[10px] text-ink-3">water</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ProgressRing value={steps / 9000} size={56} stroke={5} color="var(--s2)" label={<Footprints className="size-4 text-[var(--s2)]" aria-hidden />} />
              <span className="text-xs font-semibold text-ink">{fmtNum(steps)}</span>
              <span className="text-[10px] text-ink-3">steps</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ProgressRing value={sleep / 8} size={56} stroke={5} color="var(--s1)" label={<Moon className="size-4 text-[var(--s1)]" aria-hidden />} />
              <span className="text-xs font-semibold text-ink">{sleep || "—"}h</span>
              <span className="text-[10px] text-ink-3">sleep</span>
            </div>
          </div>
          <Btn
            variant="soft"
            className="mt-4 w-full"
            onClick={() => life.logHealth(today, { water: water + 1 })}
          >
            <Plus className="size-4" aria-hidden /> Log water
          </Btn>
        </GlassCard>

        {/* Focus */}
        <GlassCard className="p-5 xl:col-span-4">
          <SectionTitle
            action={
              <Link href="/focus" className="text-xs font-medium text-accent hover:text-accent-strong">
                Focus
              </Link>
            }
          >
            Deep work
          </SectionTitle>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tracking-tight text-ink">
                {focusToday} <span className="text-sm font-normal text-ink-3">min today</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-3">last 14 days</p>
            </div>
            <Sparkline data={focusSpark} w={130} h={44} color="var(--s1)" />
          </div>
          <Link href="/focus">
            <Btn className="mt-4 w-full">
              <Timer className="size-4" aria-hidden /> Start a session
            </Btn>
          </Link>
        </GlassCard>

        {/* Goals */}
        <GlassCard className="p-5 xl:col-span-4">
          <SectionTitle
            action={
              <Link href="/goals" className="text-xs font-medium text-accent hover:text-accent-strong">
                Goals
              </Link>
            }
          >
            In motion
          </SectionTitle>
          <ul className="space-y-3.5">
            {topGoals.map(({ g, p }, i) => (
              <li key={g.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-ink">{g.title}</span>
                  <span className="text-xs font-semibold text-ink-2">{Math.round(p * 100)}%</span>
                </div>
                <MeterBar value={p} max={1} color={SERIES[i % SERIES.length]} />
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Journal */}
        <GlassCard className="p-5 xl:col-span-4">
          <SectionTitle
            action={
              <Link href="/journal" className="text-xs font-medium text-accent hover:text-accent-strong">
                Journal
              </Link>
            }
          >
            Last entry
          </SectionTitle>
          {latestEntry ? (
            <Link href="/journal" className="block rounded-xl transition-colors hover:bg-card-hover">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span aria-hidden>{moodGlyph(latestEntry.mood)}</span>
                {latestEntry.title}
                <span className="ml-auto text-[11px] font-normal text-ink-3">
                  {relativeDay(latestEntry.date)}
                </span>
              </p>
              <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-ink-2">
                {latestEntry.content}
              </p>
            </Link>
          ) : (
            <p className="py-6 text-center text-sm text-ink-3">No entries yet.</p>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
}
