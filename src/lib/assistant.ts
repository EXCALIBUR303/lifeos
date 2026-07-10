import Anthropic from "@anthropic-ai/sdk";
import { eventsOn } from "./calendar";
import {
  focusMinutes,
  habitRate,
  habitStreak,
  healthAvg,
  insights,
  lifeScore,
  LifeData,
  monthIncome,
  monthSpend,
} from "./insights";
import { CalEvent, CATEGORY_META, ChatMsg, Subject } from "./types";
import { fmtMoney, monthKey, pct, todayISO } from "./utils";

export type AssistantData = LifeData & {
  events: CalEvent[];
  subjects: Subject[];
};

/* ---------------- data digest (context for the model) ---------------- */

export function buildDigest(d: AssistantData, name: string): string {
  const today = todayISO();
  const mk = monthKey(today);

  const openTasks = d.tasks.filter((t) => t.status !== "done");
  const dueToday = openTasks.filter((t) => t.due === today);
  const overdue = openTasks.filter((t) => t.due && t.due < today);

  const habitLines = d.habits.map(
    (h) =>
      `- ${h.name}: streak ${habitStreak(h)}d, 30-day rate ${pct(habitRate(h, 30))}, done today: ${h.history.includes(today) ? "yes" : "no"}`,
  );

  const spend = monthSpend(d.transactions, mk);
  const income = monthIncome(d.transactions, mk);
  const byCat = new Map<string, number>();
  for (const t of d.transactions)
    if (t.kind === "expense" && monthKey(t.date) === mk)
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const catLines = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c, v]) => `${CATEGORY_META[c as keyof typeof CATEGORY_META].label} ${fmtMoney(v)}`);

  const todayEvents = eventsOn(d.events, today).map(
    (e) => `${e.start}–${e.end} ${e.title}${e.location ? ` @ ${e.location}` : ""}`,
  );

  const goalLines = d.goals.map((g) => {
    const done = g.milestones.filter((m) => m.done).length;
    return `- ${g.title} (${g.horizon}): ${done}/${g.milestones.length} milestones${g.deadline ? `, deadline ${g.deadline}` : ""}`;
  });

  const subjectLines = d.subjects.map(
    (s) =>
      `- ${s.name}: attendance ${s.attended}/${s.totalClasses}${s.gradePoint ? `, grade ${s.gradePoint}/10` : ""} (${s.credits} cr)`,
  );

  const journalLines = d.journal
    .slice(0, 4)
    .map((j) => `- ${j.date} (mood ${j.mood}/5): ${j.title}`);

  const smart = insights(d).map((i) => `- [${i.tone}] ${i.title}: ${i.body}`);

  return `USER: ${name}. Date: ${today}. All money in INR.
LIFE SCORE: ${lifeScore(d)}/100

TASKS: ${openTasks.length} open, ${dueToday.length} due today (${dueToday.map((t) => t.title).join("; ") || "none"}), ${overdue.length} overdue (${overdue.map((t) => t.title).join("; ") || "none"}).

HABITS:
${habitLines.join("\n")}

MONEY (this month): spent ${fmtMoney(spend)}, income ${fmtMoney(income)}, savings rate ${income > 0 ? pct((income - spend) / income) : "n/a"}.
Top categories: ${catLines.join(", ")}.

HEALTH (7-day avg): sleep ${healthAvg(d.health, "sleep", 7).toFixed(1)}h, steps ${Math.round(healthAvg(d.health, "steps", 7))}, water ${healthAvg(d.health, "water", 7).toFixed(1)}/8. Focus: ${Math.round(focusMinutes(d.focus, 7) / 7)} min/day.

TODAY'S SCHEDULE:
${todayEvents.join("\n") || "nothing scheduled"}

GOALS:
${goalLines.join("\n")}

STUDY:
${subjectLines.join("\n") || "no subjects"}

RECENT JOURNAL:
${journalLines.join("\n") || "none"}

DETECTED INSIGHTS:
${smart.join("\n")}`;
}

const SYSTEM_PROMPT = `You are the LifeOS assistant — a warm, sharp personal-life copilot living inside the user's private life dashboard. You receive a digest of their real data (tasks, habits, money, health, schedule, goals, study, journal).

Ground every claim in the digest; never invent numbers. Answer directly and concretely, referencing their actual data. Keep replies short (usually under 150 words) unless asked for a plan. Use plain text — no markdown headers or tables; short paragraphs and simple "-" lists are fine. Be encouraging but honest. Currency is INR (₹).`;

/* ---------------- Claude call (browser, user-provided key) ---------------- */

export async function askClaude(
  apiKey: string,
  history: ChatMsg[],
  digest: string,
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    // Key is the user's own, stored locally, calling from their own browser.
    dangerouslyAllowBrowser: true,
  });

  const messages: Anthropic.MessageParam[] = history.slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: SYSTEM_PROMPT },
      { type: "text", text: `Current data digest:\n\n${digest}` },
    ],
    messages,
  });

  if (response.stop_reason === "refusal") {
    return "I couldn't answer that one. Try rephrasing the question.";
  }
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || "I came back empty — try asking again.";
}

/** Maps SDK errors to a friendly message for the chat UI. */
export function describeApiError(err: unknown): string {
  if (err instanceof GeminiApiError) {
    if (err.status === 400 || err.status === 403)
      return "That Gemini API key was rejected. Double-check it in Settings → AI.";
    if (err.status === 429)
      return "Gemini rate limit hit (the free tier is capped per minute) — wait a moment and try again.";
    return `The Gemini API returned an error (${err.status}). Try again shortly.`;
  }
  if (err instanceof Anthropic.AuthenticationError)
    return "That API key was rejected. Double-check it in Settings → AI.";
  if (err instanceof Anthropic.RateLimitError)
    return "Rate limited by the API — wait a moment and try again.";
  if (err instanceof Anthropic.APIConnectionError)
    return "Couldn't reach the API. Check your internet connection.";
  if (err instanceof Anthropic.APIError)
    return `The Claude API returned an error (${err.status ?? "unknown"}). Try again shortly.`;
  return "Something went wrong talking to the model.";
}

/* ---------------- Gemini (user-provided free AI Studio key) ---------------- */

export const GEMINI_MODEL = "gemini-2.5-flash";

class GeminiApiError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`Gemini API error ${status}: ${body.slice(0, 200)}`);
    this.status = status;
  }
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
}

export async function askGemini(
  apiKey: string,
  history: ChatMsg[],
  digest: string,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${SYSTEM_PROMPT}\n\nCurrent data digest:\n\n${digest}` }],
        },
        contents: history.slice(-12).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 2048 },
      }),
    },
  );

  if (!res.ok) throw new GeminiApiError(res.status, await res.text());
  const data: GeminiResponse = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return text || "I came back empty — try asking again.";
}

/* ---------------- provider selection ---------------- */

export type Provider = "claude" | "gemini";

export function activeProvider(s: {
  apiKey: string;
  geminiKey: string;
  provider: Provider;
}): Provider | null {
  if (s.provider === "claude" && s.apiKey) return "claude";
  if (s.provider === "gemini" && s.geminiKey) return "gemini";
  // preferred provider has no key — fall back to whichever does
  if (s.apiKey) return "claude";
  if (s.geminiKey) return "gemini";
  return null;
}

/* ---------------- on-device fallback (no API key) ---------------- */

export function localAnswer(question: string, d: AssistantData, name: string): string {
  const q = question.toLowerCase();
  const today = todayISO();
  const mk = monthKey(today);

  if (/(money|spend|budget|expense|save|savings|rupee|₹)/.test(q)) {
    const spend = monthSpend(d.transactions, mk);
    const income = monthIncome(d.transactions, mk);
    const byCat = new Map<string, number>();
    for (const t of d.transactions)
      if (t.kind === "expense" && monthKey(t.date) === mk)
        byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `This month you've spent ${fmtMoney(spend)} against ${fmtMoney(income)} income${income > 0 ? ` — a ${pct((income - spend) / income)} savings rate` : ""}. Biggest categories: ${top.map(([c, v]) => `${CATEGORY_META[c as keyof typeof CATEGORY_META].label} (${fmtMoney(v)})`).join(", ")}.`;
  }

  if (/(sleep|health|steps|water|tired|energy)/.test(q)) {
    const sleep = healthAvg(d.health, "sleep", 7);
    const steps = Math.round(healthAvg(d.health, "steps", 7));
    const water = d.health[today]?.water ?? 0;
    return `Last 7 days: ${sleep.toFixed(1)}h average sleep and ${steps.toLocaleString("en-IN")} steps/day. Water today is ${water}/8. ${sleep < 7 ? "Sleep is below your 7.5h target — tonight's the night to log off early." : "Sleep looks solid — keep the rhythm."}`;
  }

  if (/(habit|streak)/.test(q)) {
    const lines = d.habits
      .map((h) => `- ${h.name}: ${habitStreak(h)}-day streak, ${pct(habitRate(h, 30))} this month`)
      .join("\n");
    return `Your habits right now:\n${lines}`;
  }

  if (/(plan|schedule|today|tomorrow|do next|priorit)/.test(q)) {
    const due = d.tasks.filter((t) => t.status !== "done" && t.due === today);
    const overdue = d.tasks.filter((t) => t.status !== "done" && t.due && t.due < today);
    const ev = eventsOn(d.events, today);
    const parts = [];
    if (ev.length) parts.push(`Schedule: ${ev.map((e) => `${e.start} ${e.title}`).join(", ")}.`);
    if (overdue.length) parts.push(`Clear the overdue first: ${overdue.map((t) => t.title).join(", ")}.`);
    if (due.length) parts.push(`Due today: ${due.map((t) => t.title).join(", ")}.`);
    const undone = d.habits.filter((h) => !h.history.includes(today));
    if (undone.length) parts.push(`Habits still open: ${undone.map((h) => h.name).join(", ")}.`);
    return parts.join("\n") || `Nothing pressing today, ${name} — a good day to push a goal forward.`;
  }

  if (/(burn|stress|overwhelm)/.test(q)) {
    const sleep = healthAvg(d.health, "sleep", 7);
    const focus = Math.round(focusMinutes(d.focus, 7) / 7);
    return sleep < 6.6 && focus > 90
      ? `Honestly? The signals lean yes — ${sleep.toFixed(1)}h average sleep against ${focus} min/day of deep work. Protect tonight: no screens after 10, and push one deadline if you can.`
      : `You look okay — ${sleep.toFixed(1)}h average sleep and ${focus} min/day of focus is a sustainable load. Keep one true rest day.`;
  }

  // default: daily summary built from the insight engine
  const smart = insights(d).slice(0, 3);
  return `Here's where you stand, ${name} — Life Score ${lifeScore(d)}/100.\n${smart.map((i) => `- ${i.title}: ${i.body}`).join("\n")}\n\nOn-device mode answers best about money, habits, sleep, plans and burnout. Add a Claude API key in Settings for full conversations.`;
}

export const SUGGESTIONS = [
  "Summarize my day",
  "Where does my money go?",
  "Plan my tomorrow",
  "Am I heading for burnout?",
  "How are my streaks?",
];

/** Rough guard so the digest stays a sane size. */
export function digestOk(digest: string): boolean {
  return digest.length < 20000;
}
