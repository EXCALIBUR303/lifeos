import { Priority } from "./types";
import { addDays, toISO } from "./utils";

export interface ParsedTask {
  title: string;
  due?: string;
  dueTime?: string;
  priority: Priority;
  tags: string[];
}

const WEEKDAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

/**
 * Parse natural language like:
 *   "Submit assignment next friday at 9pm !high #college"
 *   "Call dentist tomorrow morning"
 *   "Pay rent on 1 aug"
 */
export function parseTask(input: string): ParsedTask {
  let text = ` ${input.trim()} `;
  const now = new Date();
  let due: string | undefined;
  let dueTime: string | undefined;
  let priority: Priority = "medium";
  const tags: string[] = [];

  const eat = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = text.match(re);
    if (m) {
      fn(m);
      text = text.replace(re, " ");
    }
  };

  // tags
  for (const m of text.matchAll(/#([\w-]+)/g)) tags.push(m[1].toLowerCase());
  text = text.replace(/#[\w-]+/g, " ");

  // priority
  eat(/\s!(urgent|high|medium|low)\b/i, (m) => {
    priority = m[1].toLowerCase() as Priority;
  });
  eat(/\b(urgent|asap|critical)\b/i, () => (priority = "urgent"));
  eat(/\b(important|high priority)\b/i, () => (priority = "high"));

  // times — "at 9", "at 9:30pm", "9pm"
  eat(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i, (m) => {
    dueTime = toTime(m[1], m[2], m[3]);
  });
  if (!dueTime)
    eat(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (m) => {
      dueTime = toTime(m[1], m[2], m[3]);
    });
  eat(/\b(tonight|this evening)\b/i, () => {
    due = toISO(now);
    dueTime = dueTime ?? "20:00";
  });
  eat(/\bmorning\b/i, () => (dueTime = dueTime ?? "09:00"));

  // dates
  eat(/\btoday\b/i, () => (due = toISO(now)));
  eat(/\btomorrow\b/i, () => (due = toISO(addDays(now, 1))));
  eat(/\bday after tomorrow\b/i, () => (due = toISO(addDays(now, 2))));
  eat(/\bin\s+(\d{1,2})\s+days?\b/i, (m) => {
    due = toISO(addDays(now, parseInt(m[1], 10)));
  });
  eat(/\bnext\s+week\b/i, () => (due = toISO(addDays(now, 7))));
  eat(
    new RegExp(`\\b(next\\s+)?(${WEEKDAYS.join("|")})\\b`, "i"),
    (m) => {
      const target = WEEKDAYS.indexOf(m[2].toLowerCase());
      let delta = (target - now.getDay() + 7) % 7;
      if (delta === 0) delta = 7; // "friday" said on a Friday → the coming one
      if (m[1] && delta < 7) delta += 7; // "next friday" → the week after
      due = toISO(addDays(now, delta));
    },
  );
  // "on 15 aug" / "15 august"
  eat(
    /\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i,
    (m) => {
      const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      const month = months.indexOf(m[2].toLowerCase().slice(0, 3));
      const d = new Date(now.getFullYear(), month, parseInt(m[1], 10));
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      due = toISO(d);
    },
  );

  const title = text
    .replace(/\b(remind me to|remind me|add task|todo)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: title ? title[0].toUpperCase() + title.slice(1) : input.trim(),
    due,
    dueTime,
    priority,
    tags,
  };
}

function toTime(h: string, m: string | undefined, ampm: string | undefined) {
  let hour = parseInt(h, 10);
  const min = m ? parseInt(m, 10) : 0;
  if (ampm?.toLowerCase() === "pm" && hour < 12) hour += 12;
  if (ampm?.toLowerCase() === "am" && hour === 12) hour = 0;
  // bare "at 9" while evening-ish inputs are ambiguous — assume working hours
  if (!ampm && hour <= 7) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
