export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/* ---------------- dates (all local, ISO day keys) ---------------- */

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function todayISO(): string {
  return toISO(new Date());
}

/** Last n day keys, oldest → newest, ending today. */
export function lastNDates(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(toISO(addDays(now, -i)));
  return out;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function daysBetween(aISO: string, bISO: string): number {
  return Math.round(
    (fromISO(bISO).getTime() - fromISO(aISO).getTime()) / 86400000,
  );
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function weekdayShort(iso: string): string {
  return WEEKDAY[fromISO(iso).getDay()];
}

/** "Mon 7 Jul" style label. */
export function prettyDate(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Today / Tomorrow / Yesterday / "Mon 7 Jul" (+ overdue awareness left to caller). */
export function relativeDay(iso: string): string {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return prettyDate(iso);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function greeting(name: string): string {
  const h = new Date().getHours();
  const part =
    h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}`;
}

/* ---------------- numbers & money ---------------- */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function fmtMoney(n: number): string {
  return inr.format(Math.round(n));
}

/** ₹1.2L / ₹45K style compact figure for tiles. */
export function fmtMoneyCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
