import { CalEvent } from "./types";
import { fromISO, toISO } from "./utils";

/** Does the event occur on the given ISO day? */
export function occursOn(e: CalEvent, iso: string): boolean {
  if (iso < e.date) return false;
  if (e.recur === "none") return e.date === iso;
  if (e.recurUntil && iso > e.recurUntil) return false;
  if (e.recur === "daily") return true;
  // weekly: same weekday as the first occurrence
  return fromISO(iso).getDay() === fromISO(e.date).getDay();
}

/** All events occurring on a day, sorted by start time. */
export function eventsOn(events: CalEvent[], iso: string): CalEvent[] {
  return events
    .filter((e) => occursOn(e, iso))
    .sort((a, b) => (a.start < b.start ? -1 : 1));
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/* ---------------- ICS export ---------------- */

function icsDate(iso: string, hhmm: string): string {
  return `${iso.replace(/-/g, "")}T${hhmm.replace(":", "")}00`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function toICS(events: CalEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifeOS//Calendar//EN",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@lifeos.local`);
    lines.push(`SUMMARY:${icsEscape(e.title)}`);
    lines.push(`DTSTART:${icsDate(e.date, e.start)}`);
    lines.push(`DTEND:${icsDate(e.date, e.end)}`);
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    if (e.notes) lines.push(`DESCRIPTION:${icsEscape(e.notes)}`);
    if (e.recur === "daily") {
      lines.push(`RRULE:FREQ=DAILY${e.recurUntil ? `;UNTIL=${e.recurUntil.replace(/-/g, "")}T235959` : ""}`);
    } else if (e.recur === "weekly") {
      const day = DAY_CODES[fromISO(e.date).getDay()];
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${day}${e.recurUntil ? `;UNTIL=${e.recurUntil.replace(/-/g, "")}T235959` : ""}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/* ---------------- ICS import (pragmatic subset) ---------------- */

/**
 * Parses VEVENT blocks with SUMMARY / DTSTART / DTEND / LOCATION /
 * RRULE FREQ=DAILY|WEEKLY. Times are taken as local wall-clock time
 * (timezone rules are ignored — good enough for timetables).
 */
export function parseICS(text: string): Omit<CalEvent, "id">[] {
  const out: Omit<CalEvent, "id">[] = [];
  // unfold continuation lines per RFC 5545
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);

  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0];
    const prop = (name: string): string | undefined => {
      const m = body.match(new RegExp(`^${name}[^:]*:(.*)$`, "mi"));
      return m?.[1]?.trim();
    };

    const summary = prop("SUMMARY");
    const dtstart = prop("DTSTART");
    if (!summary || !dtstart) continue;

    const dm = dtstart.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
    if (!dm) continue;
    const date = `${dm[1]}-${dm[2]}-${dm[3]}`;
    const start = dm[4] ? `${dm[4]}:${dm[5]}` : "09:00";

    const dtend = prop("DTEND");
    const em = dtend?.match(/\d{8}T(\d{2})(\d{2})/);
    const end = em ? `${em[1]}:${em[2]}` : addHour(start);

    const rrule = prop("RRULE") ?? "";
    const recur: CalEvent["recur"] = /FREQ=WEEKLY/i.test(rrule)
      ? "weekly"
      : /FREQ=DAILY/i.test(rrule)
        ? "daily"
        : "none";
    const um = rrule.match(/UNTIL=(\d{4})(\d{2})(\d{2})/i);

    out.push({
      title: summary.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " "),
      date,
      start,
      end,
      color: 1,
      location: prop("LOCATION")?.replace(/\\,/g, ","),
      kind: "event",
      recur,
      recurUntil: um ? `${um[1]}-${um[2]}-${um[3]}` : undefined,
    });
  }
  return out;
}

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Days of the current month grid (6 weeks, starting Sunday). */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(toISO(new Date(year, month, 1 - startOffset + i)));
  }
  return days;
}
