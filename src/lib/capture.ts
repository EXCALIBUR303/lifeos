"use client";

import { parseTask } from "./nlp";
import { useLife } from "./store";
import { CategoryId, CATEGORY_META } from "./types";
import { fmtMoney, fmtNum, todayISO } from "./utils";

/* ================================================================
   Universal capture — one input, routed to the right module.

   "spent 250 on chai"        → Money      (expense added)
   "got 5000 freelance"       → Money      (income added)
   "water"                    → Health     (+1 glass)
   "slept 7.5"                → Health     (sleep logged)
   "walked 8000 steps"        → Health     (steps logged)
   "gym 45"                   → Health     (workout logged)
   "meditate"                 → Habits     (today checked, fuzzy-matched)
   "note: sim2real ideas …"   → Notes      (note created)
   "journal: long day but …"  → Journal    (entry created)
   "class ML monday at 2pm"   → Calendar   (event created)
   "card ACID = Atomicity…"   → Study      (flashcard created)
   anything else              → Tasks      (natural-language task)
   ================================================================ */

export type CaptureKind =
  | "expense" | "income" | "water" | "sleep" | "steps" | "workout"
  | "habit" | "note" | "journal" | "event" | "card" | "task";

export interface Capture {
  kind: CaptureKind;
  label: string;
  hint: string;
  dest: string;
  apply: () => void;
}

const EXPENSE_KEYWORDS: [RegExp, CategoryId][] = [
  [/chai|tea|coffee|lunch|dinner|breakfast|snack|swiggy|zomato|restaurant|pizza|burger|canteen|mess|food/i, "food"],
  [/grocer|blinkit|bigbasket|zepto|vegetable|milk|fruits?/i, "groceries"],
  [/uber|ola|auto|metro|bus|train|fuel|petrol|cab|rapido|rickshaw|transport/i, "transport"],
  [/movie|netflix|game|gaming|concert|bowling|party/i, "entertainment"],
  [/medicine|doctor|pharmacy|hospital|meds/i, "health"],
  [/book|course|fees|stationery|xerox|print/i, "education"],
  [/flight|hotel|trip|travel/i, "travel"],
  [/subscription|spotify|prime|icloud/i, "subscriptions"],
  [/recharge|electricity|bill|wifi|broadband/i, "bills"],
  [/clothes|shoes|amazon|flipkart|myntra|shopping/i, "shopping"],
];

function guessCategory(text: string): CategoryId {
  for (const [re, cat] of EXPENSE_KEYWORDS) if (re.test(text)) return cat;
  return "other";
}

function firstNumber(text: string): number | null {
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseCapture(raw: string): Capture | null {
  const input = raw.trim();
  if (!input) return null;
  const lower = input.toLowerCase();
  const life = useLife.getState();
  const today = todayISO();

  /* ---- health quick logs ---- */

  if (/^(\+\s*)?(drank\s+)?water(\s*\+?1)?$/i.test(lower)) {
    const current = life.health[today]?.water ?? 0;
    return {
      kind: "water",
      label: `Log a glass of water (${current + 1}/8)`,
      hint: "Health",
      dest: "/health",
      apply: () => life.logHealth(today, { water: current + 1 }),
    };
  }

  const sleepM = lower.match(/^slept?\s+(\d+(?:\.\d+)?)\s*h?(?:ours?|rs)?$/);
  if (sleepM) {
    const hours = parseFloat(sleepM[1]);
    if (hours > 0 && hours <= 16) {
      return {
        kind: "sleep",
        label: `Log ${hours}h of sleep`,
        hint: "Health · last night",
        dest: "/health",
        apply: () => life.logHealth(today, { sleep: hours }),
      };
    }
  }

  const stepsM = lower.match(/^(?:walked\s+)?([\d,]{3,7})\s*steps?$/);
  if (stepsM) {
    const steps = parseInt(stepsM[1].replace(/,/g, ""), 10);
    return {
      kind: "steps",
      label: `Log ${fmtNum(steps)} steps`,
      hint: "Health · today",
      dest: "/health",
      apply: () => life.logHealth(today, { steps }),
    };
  }

  const workoutM = lower.match(/^(?:workout|gym|exercised?|trained)\s*(\d{1,3})?\s*(?:min|mins|minutes)?$/);
  if (workoutM) {
    const minutes = workoutM[1] ? parseInt(workoutM[1], 10) : 30;
    return {
      kind: "workout",
      label: `Log a ${minutes}-minute workout`,
      hint: "Health · today",
      dest: "/health",
      apply: () => life.logHealth(today, { workout: minutes }),
    };
  }

  /* ---- money ---- */

  const isExpense =
    /^(spent|paid|bought)\b/i.test(lower) ||
    /^₹\s*\d/.test(input) ||
    /^\d[\d,]*(?:\.\d+)?\s+(on|for)\s+\S/.test(lower);
  if (isExpense) {
    const amount = firstNumber(input);
    if (amount && amount > 0) {
      const note = input
        .replace(/^(spent|paid|bought)\b/i, "")
        .replace(/^\s*₹?\s*[\d,]+(?:\.\d+)?\s*/, "")
        .replace(/^(on|for)\s+/i, "")
        .trim();
      const category = guessCategory(note || input);
      return {
        kind: "expense",
        label: `${fmtMoney(amount)} expense — ${note || CATEGORY_META[category].label}`,
        hint: `Money · ${CATEGORY_META[category].label}`,
        dest: "/expenses",
        apply: () =>
          life.addTransaction({
            date: today,
            amount,
            kind: "expense",
            category,
            note: note ? note[0].toUpperCase() + note.slice(1) : CATEGORY_META[category].label,
          }),
      };
    }
  }

  if (/^(got|received|earned|credited)\b/i.test(lower)) {
    const amount = firstNumber(input);
    if (amount && amount > 0) {
      const note = input
        .replace(/^(got|received|earned|credited)\b/i, "")
        .replace(/^\s*₹?\s*[\d,]+(?:\.\d+)?\s*/, "")
        .replace(/^(from|for)\s+/i, "")
        .trim();
      const category: CategoryId = /salary/i.test(input)
        ? "salary"
        : /invest|dividend|interest/i.test(input)
          ? "investment"
          : "freelance";
      return {
        kind: "income",
        label: `${fmtMoney(amount)} income — ${note || CATEGORY_META[category].label}`,
        hint: "Money · income",
        dest: "/expenses",
        apply: () =>
          life.addTransaction({
            date: today,
            amount,
            kind: "income",
            category,
            note: note ? note[0].toUpperCase() + note.slice(1) : CATEGORY_META[category].label,
          }),
      };
    }
  }

  /* ---- notes / journal / flashcards ---- */

  const noteM = input.match(/^note[:\s]+([\s\S]+)/i);
  if (noteM) {
    const content = noteM[1].trim();
    const title = content.split("\n")[0].split(/\s+/).slice(0, 6).join(" ");
    return {
      kind: "note",
      label: `New note — “${title.slice(0, 44)}${title.length > 44 ? "…" : ""}”`,
      hint: "Notes",
      dest: "/notes",
      apply: () => life.addNote({ title, content }),
    };
  }

  const journalM = input.match(/^(?:journal|diary)[:\s]+([\s\S]+)/i);
  if (journalM) {
    const content = journalM[1].trim();
    const title = content.split(/\s+/).slice(0, 5).join(" ");
    return {
      kind: "journal",
      label: `Journal entry — “${title.slice(0, 40)}…”`,
      hint: "Journal · today",
      dest: "/journal",
      apply: () =>
        life.addJournal({ mood: 3, title, content, gratitude: [] }),
    };
  }

  const cardM = input.match(/^card\s+(.+?)\s*(?:::|=)\s*(.+)$/i);
  if (cardM) {
    return {
      kind: "card",
      label: `Flashcard — “${cardM[1].trim().slice(0, 40)}”`,
      hint: "Study · General deck",
      dest: "/study",
      apply: () =>
        life.addCard({ deck: "General", front: cardM[1].trim(), back: cardM[2].trim() }),
    };
  }

  /* ---- calendar events ---- */

  const eventM = input.match(/^(event|class|meeting|meet)\b[:\s]*([\s\S]+)/i);
  if (eventM && eventM[2].trim()) {
    const parsed = parseTask(eventM[2]);
    const date = parsed.due ?? today;
    const start = parsed.dueTime ?? "10:00";
    const isClass = /^class$/i.test(eventM[1]);
    if (parsed.title) {
      return {
        kind: "event",
        label: `Add “${parsed.title}” to the calendar`,
        hint: `Calendar · ${date === today ? "today" : date} ${start}`,
        dest: "/calendar",
        apply: () =>
          life.addEvent({
            title: parsed.title,
            date,
            start,
            end: addHour(start),
            color: isClass ? 2 : 1,
            kind: isClass ? "class" : "event",
            recur: isClass ? "weekly" : "none",
          }),
      };
    }
  }

  /* ---- habit check (fuzzy name match) ---- */

  const habitQuery = lower.replace(/^(did|done|finished|completed)\s+/, "").trim();
  if (habitQuery.length >= 3) {
    const habit = life.habits.find((h) => {
      const name = h.name.toLowerCase();
      return name.includes(habitQuery) || habitQuery.includes(name);
    });
    if (habit) {
      const done = habit.history.includes(today);
      return {
        kind: "habit",
        label: done
          ? `“${habit.name}” already done — undo it`
          : `Mark “${habit.name}” done today`,
        hint: "Habits",
        dest: "/habits",
        apply: () => life.toggleHabit(habit.id, today),
      };
    }
  }

  /* ---- fallback: natural-language task ---- */

  const parsed = parseTask(input);
  if (!parsed.title) return null;
  return {
    kind: "task",
    label: `Add task “${parsed.title}”`,
    hint: [
      "Tasks",
      parsed.due,
      parsed.dueTime,
      parsed.priority !== "medium" ? parsed.priority : null,
      ...parsed.tags.map((t) => `#${t}`),
    ]
      .filter(Boolean)
      .join(" · "),
    dest: "/tasks",
    apply: () => life.addTask(parsed),
  };
}
