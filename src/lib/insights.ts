import { SeedData } from "./seed";
import {
  AxisScore,
  CATEGORY_META,
  Habit,
  Insight,
  Transaction,
} from "./types";
import {
  clamp,
  daysBetween,
  fmtMoney,
  fromISO,
  lastNDates,
  mean,
  monthKey,
  sum,
  toISO,
  todayISO,
  weekdayShort,
} from "./utils";

export type LifeData = Pick<
  SeedData,
  | "tasks"
  | "habits"
  | "transactions"
  | "budgets"
  | "goals"
  | "journal"
  | "health"
  | "focus"
>;

/* ---------------- habit math ---------------- */

export function habitScheduledOn(h: Habit, iso: string): boolean {
  return h.cadence.includes(fromISO(iso).getDay());
}

/** Current streak in scheduled days, counting back from today (today may still be pending). */
export function habitStreak(h: Habit): number {
  const done = new Set(h.history);
  let streak = 0;
  const days = lastNDates(120).reverse(); // newest → oldest
  for (let i = 0; i < days.length; i++) {
    const iso = days[i];
    if (!habitScheduledOn(h, iso)) continue;
    if (done.has(iso)) streak++;
    else if (i === 0) continue; // today not done yet — streak still alive
    else break;
  }
  return streak;
}

/** Completion rate over the last n days (scheduled days only). */
export function habitRate(h: Habit, n: number, offset = 0): number {
  const done = new Set(h.history);
  const days = lastNDates(n + offset).slice(0, n); // oldest slice when offset used
  const scheduled = days.filter((d) => habitScheduledOn(h, d));
  if (!scheduled.length) return 0;
  return scheduled.filter((d) => done.has(d)).length / scheduled.length;
}

/* ---------------- money math ---------------- */

export function monthSpend(
  txs: Transaction[],
  mk: string,
  category?: string,
): number {
  return sum(
    txs
      .filter(
        (t) =>
          t.kind === "expense" &&
          monthKey(t.date) === mk &&
          (!category || t.category === category),
      )
      .map((t) => t.amount),
  );
}

export function monthIncome(txs: Transaction[], mk: string): number {
  return sum(
    txs
      .filter((t) => t.kind === "income" && monthKey(t.date) === mk)
      .map((t) => t.amount),
  );
}

export function prevMonthKeys(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(toISO(d).slice(0, 7));
  }
  return out;
}

/* ---------------- health / focus math ---------------- */

export function healthAvg(
  health: LifeData["health"],
  field: "sleep" | "steps" | "water" | "mood" | "energy",
  days: number,
): number {
  const vals = lastNDates(days)
    .map((d) => health[d]?.[field])
    .filter((v): v is number => typeof v === "number");
  return mean(vals);
}

export function focusMinutes(focus: LifeData["focus"], days: number): number {
  const window = new Set(lastNDates(days));
  return sum(focus.filter((f) => window.has(f.date)).map((f) => f.minutes));
}

/* ---------------- life score ---------------- */

export function axisScores(d: LifeData): AxisScore[] {
  const workout = d.habits.find((h) => h.name.toLowerCase().includes("workout"));
  const meditate = d.habits.find((h) => h.name.toLowerCase().includes("medit"));
  const read = d.habits.find((h) => h.name.toLowerCase().includes("read"));
  const code = d.habits.find((h) => h.name.toLowerCase().includes("code"));
  const call = d.habits.find((h) => h.name.toLowerCase().includes("call"));

  const steps = healthAvg(d.health, "steps", 14);
  const sleep = healthAvg(d.health, "sleep", 14);
  const water = healthAvg(d.health, "water", 14);

  const doneRecent = d.tasks.filter(
    (t) =>
      t.status === "done" &&
      t.completedAt &&
      daysBetween(t.completedAt, todayISO()) <= 14,
  ).length;
  const openTasks = d.tasks.filter((t) => t.status !== "done").length;
  const taskScore = clamp((doneRecent / Math.max(1, doneRecent + openTasks)) * 1.6, 0, 1);

  const focusPerDay = focusMinutes(d.focus, 14) / 14;

  const mk = monthKey(todayISO());
  const income = monthIncome(d.transactions, mk) || 1;
  const spend = monthSpend(d.transactions, mk);
  const savingsRate = clamp((income - spend) / income, 0, 1);
  const budgetCats = Object.entries(d.budgets) as [string, number][];
  const withinBudget = budgetCats.filter(
    ([cat, b]) => monthSpend(d.transactions, mk, cat) <= b,
  ).length;
  const budgetScore = budgetCats.length ? withinBudget / budgetCats.length : 0.5;

  const journalDays = new Set(d.journal.map((j) => j.date));
  const journalRate =
    lastNDates(21).filter((day) => journalDays.has(day)).length / 7; // ~3/week = 100%

  const goalProgress = (area: string) => {
    const gs = d.goals.filter((g) => g.area === area);
    if (!gs.length) return 0.5;
    return mean(
      gs.map(
        (g) =>
          g.milestones.filter((m) => m.done).length /
          Math.max(1, g.milestones.length),
      ),
    );
  };

  const rate = (h?: Habit) => (h ? habitRate(h, 14) : 0.5);

  const scores: AxisScore[] = [
    { area: "health", label: "Health", score: clamp(sleep / 7.5, 0, 1) * 60 + clamp(water / 8, 0, 1) * 40 },
    { area: "fitness", label: "Fitness", score: rate(workout) * 55 + clamp(steps / 9000, 0, 1) * 45 },
    { area: "mindfulness", label: "Mindfulness", score: rate(meditate) * 65 + clamp(journalRate, 0, 1) * 35 },
    { area: "productivity", label: "Productivity", score: taskScore * 55 + clamp(focusPerDay / 120, 0, 1) * 45 },
    { area: "money", label: "Money", score: savingsRate * 55 + budgetScore * 45 },
    { area: "learning", label: "Learning", score: rate(read) * 50 + rate(code) * 50 },
    { area: "career", label: "Career", score: goalProgress("career") * 70 + taskScore * 30 },
    { area: "relationships", label: "Relationships", score: rate(call) * 70 + clamp(journalRate, 0, 1) * 30 },
  ];

  return scores.map((s) => ({ ...s, score: Math.round(clamp(s.score, 4, 100)) }));
}

export function lifeScore(d: LifeData): number {
  return Math.round(mean(axisScores(d).map((s) => s.score)));
}

/* ---------------- insight detectors ---------------- */

export function insights(d: LifeData): Insight[] {
  const out: Insight[] = [];
  const today = todayISO();
  const mk = monthKey(today);
  const dayOfMonth = fromISO(today).getDate();

  // 1 — unusual category spending vs 3-month average
  const prev = prevMonthKeys(3);
  let worst: { cat: string; now: number; avg: number } | null = null;
  for (const cat of Object.keys(CATEGORY_META)) {
    if (CATEGORY_META[cat as keyof typeof CATEGORY_META].kind !== "expense") continue;
    const now = monthSpend(d.transactions, mk, cat);
    const avg = mean(prev.map((p) => monthSpend(d.transactions, p, cat)));
    if (avg > 500 && now > avg * 1.35 && now - avg > 1500) {
      if (!worst || now - avg > worst.now - worst.avg) worst = { cat, now, avg };
    }
  }
  if (worst) {
    const label = CATEGORY_META[worst.cat as keyof typeof CATEGORY_META].label;
    out.push({
      id: "unusual-spend",
      tone: "warn",
      title: `${label} is running hot`,
      body: `${fmtMoney(worst.now)} this month vs your usual ${fmtMoney(worst.avg)} — ${Math.round((worst.now / worst.avg - 1) * 100)}% above normal.`,
      href: "/expenses",
    });
  }

  // 2 — habit at risk (recent rate collapsed vs baseline)
  for (const h of d.habits) {
    const recent = habitRate(h, 14);
    const baseline = habitRate(h, 30, 14);
    if (baseline > 0.55 && recent < baseline * 0.6) {
      out.push({
        id: `habit-risk-${h.id}`,
        tone: "warn",
        title: `“${h.name}” is slipping`,
        body: `Down to ${Math.round(recent * 100)}% these two weeks from ${Math.round(baseline * 100)}%. A 10-minute version tonight restarts the engine.`,
        href: "/habits",
      });
      break;
    }
  }

  // 3 — streak win
  const streaks = d.habits
    .map((h) => ({ h, s: habitStreak(h) }))
    .filter((x) => x.s >= 7)
    .sort((a, b) => b.s - a.s);
  if (streaks.length) {
    out.push({
      id: "streak-win",
      tone: "win",
      title: `${streaks[0].s}-day streak on “${streaks[0].h.name}”`,
      body: `Your longest active streak. Protect it today and it compounds.`,
      href: "/habits",
    });
  }

  // 4 — burnout watch
  const sleep7 = healthAvg(d.health, "sleep", 7);
  const focus7 = focusMinutes(d.focus, 7) / 7;
  if (sleep7 > 0 && sleep7 < 6.6 && focus7 > 90) {
    out.push({
      id: "burnout",
      tone: "warn",
      title: "Burnout watch",
      body: `Averaging ${sleep7.toFixed(1)}h sleep while pushing ${Math.round(focus7)} focus min/day. Tonight is a good night to log off early.`,
      href: "/health",
    });
  }

  // 5 — budget pace
  const budgetTotal = sum(Object.values(d.budgets) as number[]);
  const spendMTD = monthSpend(d.transactions, mk);
  const paceExpected = budgetTotal * (dayOfMonth / 30);
  if (budgetTotal > 0) {
    if (spendMTD > paceExpected * 1.15) {
      out.push({
        id: "budget-pace",
        tone: "warn",
        title: "Spending ahead of pace",
        body: `${fmtMoney(spendMTD)} spent by day ${dayOfMonth} — about ${Math.round((spendMTD / paceExpected - 1) * 100)}% ahead of your monthly plan.`,
        href: "/expenses",
      });
    } else if (spendMTD < paceExpected * 0.9) {
      out.push({
        id: "budget-pace",
        tone: "win",
        title: "Under budget pace",
        body: `${fmtMoney(paceExpected - spendMTD)} below plan for day ${dayOfMonth}. Cushion earned.`,
        href: "/expenses",
      });
    }
  }

  // 6 — savings rate
  const income = monthIncome(d.transactions, mk);
  if (income > 0) {
    const rate = (income - spendMTD) / income;
    if (rate > 0.25) {
      out.push({
        id: "savings",
        tone: "win",
        title: `Saving ${Math.round(rate * 100)}% of income`,
        body: `On pace to put away ${fmtMoney(income - spendMTD)} this month.`,
        href: "/expenses",
      });
    }
  }

  // 7 — most productive weekday
  const doneByDay = new Map<string, number>();
  for (const t of d.tasks) {
    if (t.status === "done" && t.completedAt) {
      const wd = weekdayShort(t.completedAt);
      doneByDay.set(wd, (doneByDay.get(wd) ?? 0) + 1);
    }
  }
  const focusByDay = new Map<string, number>();
  for (const f of d.focus) {
    const wd = weekdayShort(f.date);
    focusByDay.set(wd, (focusByDay.get(wd) ?? 0) + f.minutes);
  }
  const bestFocus = [...focusByDay.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestFocus) {
    out.push({
      id: "best-day",
      tone: "tip",
      title: `${bestFocus[0]} is your deep-work day`,
      body: `You log the most focused minutes on ${bestFocus[0]}s. Schedule the hard thing there.`,
      href: "/focus",
    });
  }

  // 8 — journaling nudge
  const lastEntry = d.journal[0]?.date;
  if (!lastEntry || daysBetween(lastEntry, today) >= 3) {
    out.push({
      id: "journal-nudge",
      tone: "tip",
      title: "Your journal misses you",
      body: `No entry in ${lastEntry ? daysBetween(lastEntry, today) : "a few"} days. Two sentences tonight still counts.`,
      href: "/journal",
    });
  }

  return out.slice(0, 6);
}

/* ---------------- daily briefing ---------------- */

export function briefing(d: LifeData, name: string): string {
  const today = todayISO();
  const due = d.tasks.filter((t) => t.status !== "done" && t.due === today);
  const overdue = d.tasks.filter(
    (t) => t.status !== "done" && t.due && t.due < today,
  );
  const doneHabits = d.habits.filter(
    (h) => habitScheduledOn(h, today) && h.history.includes(today),
  ).length;
  const totalHabits = d.habits.filter((h) => habitScheduledOn(h, today)).length;
  const water = d.health[today]?.water ?? 0;

  const parts: string[] = [];
  if (due.length)
    parts.push(
      `${due.length} task${due.length > 1 ? "s" : ""} due today — start with “${due[0].title}”`,
    );
  else parts.push("Nothing due today — a rare open runway");
  if (overdue.length) parts.push(`${overdue.length} overdue to sweep up`);
  parts.push(`habits ${doneHabits}/${totalHabits} done`);
  if (water < 5) parts.push(`water is at ${water}/8`);

  return `${parts.join(" · ")}. You've got this, ${name}.`;
}
