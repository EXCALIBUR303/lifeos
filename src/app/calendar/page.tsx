"use client";

import {
  Btn,
  Chip,
  GlassCard,
  PageHeader,
  Segmented,
  fadeUp,
  inputCls,
  stagger,
} from "@/components/ui";
import { eventsOn, minutesOf, monthGrid, parseICS, toICS } from "@/lib/calendar";
import { useLife, useSettings } from "@/lib/store";
import { feedUrls, genFeedId } from "@/lib/sync";
import { CalEvent } from "@/lib/types";
import {
  addDays,
  cn,
  daysBetween,
  fromISO,
  prettyDate,
  toISO,
  todayISO,
  weekdayShort,
} from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  MapPin,
  Plus,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];
const DAY_START = 7 * 60; // 07:00
const DAY_END = 22 * 60; // 22:00
const DAY_SPAN = DAY_END - DAY_START;
const KIND_LABEL: Record<CalEvent["kind"], string> = {
  class: "class",
  event: "event",
  exam: "exam",
  block: "time block",
};

type Draft = Omit<CalEvent, "id"> & { id?: string };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const { events, addEvent, updateEvent, deleteEvent, importEvents } = useLife();
  const today = todayISO();
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(today); // any day inside the shown week/month
  const [selectedDay, setSelectedDay] = useState(today);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [examMode, setExamMode] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [feedCopied, setFeedCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { publishFeed, setPublishFeed, feedId, setFeedId } = useSettings();

  const anchorDate = fromISO(anchor);
  // week starts Monday
  const weekStart = addDays(anchorDate, -((anchorDate.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i)));

  const gridDays = monthGrid(anchorDate.getFullYear(), anchorDate.getMonth());

  const upcomingExams = useMemo(
    () =>
      events
        .filter((e) => e.kind === "exam" && e.date >= today)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(0, 4),
    [events, today],
  );

  const visible = (e: CalEvent) =>
    !examMode || e.kind === "exam" || e.kind === "class";

  const shift = (dir: 1 | -1) =>
    setAnchor(
      view === "week"
        ? toISO(addDays(anchorDate, dir * 7))
        : toISO(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + dir, 1)),
    );

  const newDraft = (date: string, start = "10:00"): Draft => ({
    title: "",
    date,
    start,
    end: addHour(start),
    color: 1,
    kind: "event",
    recur: "none",
  });

  const onColumnClick = (day: string, ev: React.MouseEvent<HTMLDivElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const frac = (ev.clientY - rect.top) / rect.height;
    const mins = DAY_START + Math.round((frac * DAY_SPAN) / 30) * 30;
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    setDraft(newDraft(day, `${hh}:${mm}`));
  };

  const exportICS = () => {
    const blob = new Blob([toICS(events)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lifeos-calendar.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (f: File) => {
    const text = await f.text();
    const parsed = parseICS(text);
    if (parsed.length) {
      importEvents(parsed);
      setImportMsg(`Imported ${parsed.length} event${parsed.length === 1 ? "" : "s"} from ${f.name}.`);
    } else {
      setImportMsg(`No events found in ${f.name}.`);
    }
    setTimeout(() => setImportMsg(null), 5000);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Calendar & timetable"
        title="Your week,"
        accent="composed"
        subtitle="Classes, exams, deep-work blocks and life — color-coded, recurring, importable."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={[
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
              value={view}
              onChange={setView}
            />
            <Btn onClick={() => setDraft(newDraft(selectedDay))}>
              <Plus className="size-4" aria-hidden /> Event
            </Btn>
          </div>
        }
      />

      {/* toolbar */}
      <motion.div variants={fadeUp} className="mb-4 flex flex-wrap items-center gap-2">
        <div className="glass flex items-center rounded-xl">
          <button aria-label="Previous" onClick={() => shift(-1)} className="cursor-pointer p-2 text-ink-3 hover:text-ink">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <span className="min-w-40 px-1 text-center text-sm font-semibold text-ink">
            {view === "week"
              ? `${prettyDate(weekDays[0])} – ${prettyDate(weekDays[6])}`
              : `${MONTHS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`}
          </span>
          <button aria-label="Next" onClick={() => shift(1)} className="cursor-pointer p-2 text-ink-3 hover:text-ink">
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <Btn variant="ghost" onClick={() => { setAnchor(today); setSelectedDay(today); }}>
          Today
        </Btn>
        <button
          onClick={() => setExamMode((m) => !m)}
          aria-pressed={examMode}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
            examMode
              ? "border-warn-soft bg-warn-soft text-warn"
              : "border-line text-ink-3 hover:text-ink",
          )}
        >
          <AlertTriangle className="size-4" aria-hidden /> Exam mode
        </button>
        <span className="flex-1" />
        <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" aria-hidden /> Import .ics
        </Btn>
        <Btn variant="ghost" onClick={exportICS}>
          <Download className="size-4" aria-hidden /> Export .ics
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = "";
          }}
        />
      </motion.div>

      {importMsg && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border border-good-soft bg-good-soft px-3 py-2 text-sm text-good"
        >
          {importMsg}
        </motion.p>
      )}

      {/* Apple Calendar subscription feed */}
      <motion.div variants={fadeUp} className="glass mb-4 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Smartphone className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">
              iPhone & Mac Calendar sync
            </span>
            <span className="text-xs text-ink-3">
              Publishes a private feed Apple Calendar subscribes to — imported timetables
              and new events appear there automatically.
            </span>
          </span>
          <button
            role="switch"
            aria-checked={publishFeed}
            aria-label="Publish calendar feed"
            onClick={() => {
              if (!publishFeed && !feedId) setFeedId(genFeedId());
              setPublishFeed(!publishFeed);
            }}
            className={cn(
              "relative h-7 w-12 cursor-pointer rounded-full transition-colors",
              publishFeed ? "bg-accent" : "bg-line-strong",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
                publishFeed ? "left-6" : "left-1",
              )}
              aria-hidden
            />
          </button>
        </div>

        {publishFeed && feedId && (
          <div className="mt-4 border-t border-line pt-4">
            <div className="flex max-w-2xl flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-line bg-card px-3 py-2 font-mono text-xs text-ink">
                {feedUrls(feedId).webcal}
              </code>
              <Btn
                variant="soft"
                onClick={() => {
                  navigator.clipboard.writeText(feedUrls(feedId).webcal);
                  setFeedCopied(true);
                  setTimeout(() => setFeedCopied(false), 1600);
                }}
              >
                <Copy className="size-4" aria-hidden /> {feedCopied ? "Copied!" : "Copy link"}
              </Btn>
            </div>
            <ul className="mt-3 space-y-1 text-xs leading-relaxed text-ink-3">
              <li>
                <strong className="text-ink-2">iPhone:</strong> open this link in Safari → Subscribe, or
                Settings → Apps → Calendar → Calendar Accounts → Add Subscribed Calendar.
              </li>
              <li>
                <strong className="text-ink-2">Mac:</strong> Calendar app → File → New Calendar Subscription → paste the link.
              </li>
              <li>
                Apple refreshes subscribed calendars periodically (set it to hourly when subscribing).
                The link is unguessable but not encrypted — it shares event titles/times only. Turn the
                switch off to stop publishing.
              </li>
            </ul>
          </div>
        )}
      </motion.div>

      {/* exam banner */}
      {examMode && upcomingExams.length > 0 && (
        <motion.div variants={fadeUp} className="mb-4 flex flex-wrap gap-2">
          {upcomingExams.map((e) => (
            <div key={e.id} className="glass flex items-center gap-3 rounded-2xl border-warn-soft px-4 py-2.5">
              <span className="text-lg font-bold text-warn">
                {daysBetween(today, e.date)}d
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{e.title}</span>
                <span className="text-xs text-ink-3">
                  {prettyDate(e.date)} · {e.start}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {view === "week" ? (
        /* ---------------- week time-grid ---------------- */
        <GlassCard className="overflow-x-auto p-4">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1">
              <div />
              {weekDays.map((d) => (
                <div key={d} className="pb-2 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    {weekdayShort(d)}
                  </p>
                  <p
                    className={cn(
                      "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                      d === today ? "bg-accent text-accent-ink" : "text-ink",
                    )}
                  >
                    {d.slice(8)}
                  </p>
                </div>
              ))}

              {/* time labels */}
              <div className="relative" style={{ height: 640 }}>
                {Array.from({ length: (DAY_SPAN / 60) + 1 }, (_, i) => (
                  <span
                    key={i}
                    className="absolute right-2 -translate-y-1/2 text-[10px] text-ink-3"
                    style={{ top: `${((i * 60) / DAY_SPAN) * 100}%` }}
                  >
                    {String(7 + i).padStart(2, "0")}:00
                  </span>
                ))}
              </div>

              {weekDays.map((d) => {
                const dayEvents = eventsOn(events, d).filter(visible);
                return (
                  <div
                    key={d}
                    className="relative cursor-pointer rounded-xl border border-line bg-card"
                    style={{ height: 640 }}
                    onClick={(ev) => onColumnClick(d, ev)}
                    role="button"
                    aria-label={`Add event on ${prettyDate(d)}`}
                  >
                    {/* hour lines */}
                    {Array.from({ length: DAY_SPAN / 60 - 1 }, (_, i) => (
                      <span
                        key={i}
                        className="absolute inset-x-0 border-t border-line/60"
                        style={{ top: `${(((i + 1) * 60) / DAY_SPAN) * 100}%` }}
                        aria-hidden
                      />
                    ))}
                    {dayEvents.map((e) => {
                      const top = Math.max(0, ((minutesOf(e.start) - DAY_START) / DAY_SPAN) * 100);
                      const height = Math.max(
                        3.5,
                        ((minutesOf(e.end) - minutesOf(e.start)) / DAY_SPAN) * 100,
                      );
                      const color = SERIES[(e.color - 1) % SERIES.length];
                      return (
                        <button
                          key={e.id + d}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setDraft({ ...e });
                          }}
                          className="absolute inset-x-1 cursor-pointer overflow-hidden rounded-lg border-l-2 px-1.5 py-0.5 text-left transition-transform hover:scale-[1.02]"
                          style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            borderColor: color,
                            background: `color-mix(in srgb, ${color} ${e.kind === "exam" ? 28 : 16}%, transparent)`,
                          }}
                        >
                          <span className="block truncate text-[11px] font-semibold leading-tight text-ink">
                            {e.title}
                          </span>
                          <span className="block truncate text-[10px] text-ink-2">
                            {e.start}–{e.end}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>
      ) : (
        /* ---------------- month grid ---------------- */
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <GlassCard className="p-4 xl:col-span-8">
            <div className="grid grid-cols-7 gap-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <p key={d} className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-ink-3">
                  {d}
                </p>
              ))}
              {reorderMonToSun(gridDays).map((d) => {
                const inMonth = fromISO(d).getMonth() === anchorDate.getMonth();
                const dayEvents = eventsOn(events, d).filter(visible);
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={cn(
                      "flex min-h-20 cursor-pointer flex-col items-stretch gap-0.5 rounded-xl border p-1.5 text-left transition-colors",
                      d === selectedDay ? "border-accent bg-accent-soft" : "border-line hover:bg-card-hover",
                      !inMonth && "opacity-35",
                    )}
                  >
                    <span
                      className={cn(
                        "self-end text-xs font-semibold",
                        d === today ? "flex size-5 items-center justify-center rounded-full bg-accent text-accent-ink" : "text-ink-2",
                      )}
                    >
                      {d.slice(8)}
                    </span>
                    {dayEvents.slice(0, 2).map((e) => (
                      <span
                        key={e.id + d}
                        className="truncate rounded px-1 text-[10px] font-medium text-ink"
                        style={{ background: `color-mix(in srgb, ${SERIES[(e.color - 1) % SERIES.length]} 22%, transparent)` }}
                      >
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="px-1 text-[10px] text-ink-3">+{dayEvents.length - 2} more</span>
                    )}
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* selected day detail */}
          <GlassCard className="p-5 xl:col-span-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-ink-2">{prettyDate(selectedDay)}</h2>
              <Btn variant="soft" onClick={() => setDraft(newDraft(selectedDay))}>
                <Plus className="size-4" aria-hidden /> Add
              </Btn>
            </div>
            <ul className="space-y-2">
              {eventsOn(events, selectedDay).filter(visible).map((e) => {
                const color = SERIES[(e.color - 1) % SERIES.length];
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => setDraft({ ...e })}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line p-2.5 text-left transition-colors hover:bg-card-hover"
                    >
                      <span className="h-9 w-1 rounded-full" style={{ background: color }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
                        <span className="flex items-center gap-1.5 text-xs text-ink-3">
                          {e.start}–{e.end}
                          {e.location && (
                            <>
                              <MapPin className="size-3" aria-hidden /> {e.location}
                            </>
                          )}
                        </span>
                      </span>
                      <Chip>{KIND_LABEL[e.kind]}</Chip>
                    </button>
                  </li>
                );
              })}
              {eventsOn(events, selectedDay).filter(visible).length === 0 && (
                <p className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-ink-3">
                  Nothing here — a free day.
                </p>
              )}
            </ul>
          </GlassCard>
        </div>
      )}

      <AnimatePresence>
        {draft && (
          <EventModal
            draft={draft}
            onClose={() => setDraft(null)}
            onSave={(d) => {
              if (d.id) updateEvent(d.id, d);
              else addEvent(d);
              setDraft(null);
            }}
            onDelete={
              draft.id
                ? () => {
                    deleteEvent(draft.id!);
                    setDraft(null);
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** monthGrid starts weeks on Sunday; shift so columns are Mon..Sun. */
function reorderMonToSun(days: string[]): string[] {
  const out: string[] = [];
  for (let w = 0; w < 6; w++) {
    const week = days.slice(w * 7, w * 7 + 7);
    out.push(...week.slice(1), week[0]);
  }
  return out;
}

function EventModal({
  draft,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Omit<CalEvent, "id"> & { id?: string };
  onClose: () => void;
  onSave: (d: Omit<CalEvent, "id"> & { id?: string }) => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState(draft);
  const set = (patch: Partial<CalEvent>) => setD((x) => ({ ...x, ...patch }));

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
        aria-label={d.id ? "Edit event" : "New event"}
        className="glass-strong max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-5 thin-scroll"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{d.id ? "Edit event" : "New event"}</h2>
          <button aria-label="Close" onClick={onClose} className="cursor-pointer text-ink-3 hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="ev-title">Title</label>
        <input id="ev-title" value={d.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} autoFocus placeholder="e.g. Study group" />

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="ev-date">Date</label>
            <input id="ev-date" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="ev-start">Start</label>
            <input id="ev-start" type="time" value={d.start} onChange={(e) => set({ start: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="ev-end">End</label>
            <input id="ev-end" type="time" value={d.end} onChange={(e) => set({ end: e.target.value })} className={inputCls} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="ev-kind">Type</label>
            <select id="ev-kind" value={d.kind} onChange={(e) => set({ kind: e.target.value as CalEvent["kind"] })} className={inputCls}>
              <option value="event">Event</option>
              <option value="class">Class</option>
              <option value="exam">Exam</option>
              <option value="block">Time block</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="ev-loc">Location</label>
            <input id="ev-loc" value={d.location ?? ""} onChange={(e) => set({ location: e.target.value || undefined })} className={inputCls} placeholder="optional" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="ev-recur">Repeats</label>
            <select id="ev-recur" value={d.recur} onChange={(e) => set({ recur: e.target.value as CalEvent["recur"] })} className={inputCls}>
              <option value="none">Never</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          {d.recur !== "none" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="ev-until">Until</label>
              <input id="ev-until" type="date" value={d.recurUntil ?? ""} onChange={(e) => set({ recurUntil: e.target.value || undefined })} className={inputCls} />
            </div>
          )}
        </div>

        <p className="mb-1 mt-3 text-xs font-medium text-ink-2">Color</p>
        <div className="flex gap-1.5">
          {SERIES.map((c, i) => (
            <button
              key={c}
              onClick={() => set({ color: i + 1 })}
              aria-label={`Color ${i + 1}`}
              aria-pressed={d.color === i + 1}
              className={cn(
                "size-8 cursor-pointer rounded-full border-2 transition-transform",
                d.color === i + 1 ? "scale-110 border-[var(--ink)]" : "border-transparent",
              )}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <Btn className="flex-1" onClick={() => d.title.trim() && onSave(d)} disabled={!d.title.trim() || d.end <= d.start}>
            Save
          </Btn>
          {onDelete && (
            <Btn variant="danger" onClick={onDelete}>
              Delete
            </Btn>
          )}
        </div>
        {d.end <= d.start && (
          <p className="mt-2 text-xs text-bad">End time must be after start time.</p>
        )}
      </motion.div>
    </motion.div>
  );
}
