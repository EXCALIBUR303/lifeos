"use client";

import { AreaTrend, moodGlyph } from "@/components/charts";
import {
  Btn,
  Chip,
  GlassCard,
  PageHeader,
  SectionTitle,
  fadeUp,
  inputCls,
  stagger,
} from "@/components/ui";
import { useLife } from "@/lib/store";
import { JournalEntry } from "@/lib/types";
import { cn, lastNDates, relativeDay } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, PenLine, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function JournalPage() {
  const { journal, addJournal, deleteJournal } = useLife();
  const [q, setQ] = useState("");

  const moodTrend = useMemo(() => {
    const byDate = new Map(journal.map((j) => [j.date, j.mood]));
    return lastNDates(30).map((d) => ({
      label: d.slice(8),
      value: byDate.get(d) ?? 0,
    }));
  }, [journal]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return journal;
    return journal.filter(
      (j) =>
        j.title.toLowerCase().includes(needle) ||
        j.content.toLowerCase().includes(needle) ||
        j.gratitude.some((g) => g.toLowerCase().includes(needle)),
    );
  }, [journal, q]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Journal"
        title="Notes to your"
        accent="future self"
        subtitle="Mood, gratitude and the day in your own words — searchable forever."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* composer + mood trend */}
        <div className="space-y-4 xl:col-span-5">
          <Composer onAdd={addJournal} />
          <GlassCard className="p-5">
            <SectionTitle>Mood, last 30 days</SectionTitle>
            <AreaTrend
              points={moodTrend}
              height={140}
              color="var(--s4)"
              fmt={(n) => (n ? `${moodGlyph(Math.round(n))} ${Math.round(n)}/5` : "—")}
              xEvery={7}
              id="mood-trend"
            />
          </GlassCard>
        </div>

        {/* entries */}
        <div className="xl:col-span-7">
          <motion.div variants={fadeUp} className="glass mb-4 flex items-center gap-2 rounded-2xl px-3.5 py-2.5">
            <Search className="size-4 text-ink-3" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search entries, moods, gratitude…"
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              aria-label="Search journal"
            />
          </motion.div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((j) => (
                <motion.article
                  key={j.id}
                  layout
                  variants={fadeUp}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="glass group rounded-2xl p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none" aria-label={`Mood ${j.mood} of 5`}>
                      {moodGlyph(j.mood)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="truncate text-[15px] font-semibold text-ink">{j.title}</h3>
                        <span className="shrink-0 text-xs text-ink-3">{relativeDay(j.date)}</span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{j.content}</p>
                      {j.gratitude.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <Heart className="size-3.5 text-[var(--s4)]" aria-hidden />
                          {j.gratitude.map((g) => (
                            <Chip key={g}>{g}</Chip>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      aria-label={`Delete entry ${j.title}`}
                      onClick={() => deleteJournal(j.id)}
                      className="cursor-pointer text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line py-12 text-center text-sm text-ink-3">
                No entries match “{q}”.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Composer({
  onAdd,
}: {
  onAdd: (e: {
    mood: JournalEntry["mood"];
    title: string;
    content: string;
    gratitude: string[];
  }) => void;
}) {
  const [mood, setMood] = useState<JournalEntry["mood"]>(4);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [gratitude, setGratitude] = useState("");

  const submit = () => {
    if (!title.trim() && !content.trim()) return;
    onAdd({
      mood,
      title: title.trim() || "Untitled",
      content: content.trim(),
      gratitude: gratitude
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    });
    setTitle("");
    setContent("");
    setGratitude("");
    setMood(4);
  };

  return (
    <GlassCard className="p-5">
      <SectionTitle>How was today?</SectionTitle>
      <div className="mb-3 flex justify-between gap-1">
        {([1, 2, 3, 4, 5] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMood(m)}
            aria-label={`Mood ${m} of 5`}
            aria-pressed={mood === m}
            className={cn(
              "flex-1 cursor-pointer rounded-xl border py-2 text-xl transition-all",
              mood === m
                ? "border-accent bg-accent-soft"
                : "border-line opacity-50 hover:opacity-100",
            )}
          >
            {moodGlyph(m)}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Give today a headline"
        className={inputCls}
        aria-label="Entry title"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="What happened? What did it mean?"
        className={cn(inputCls, "mt-2 resize-none")}
        aria-label="Entry content"
      />
      <input
        value={gratitude}
        onChange={(e) => setGratitude(e.target.value)}
        placeholder="Grateful for… (comma separated)"
        className={cn(inputCls, "mt-2")}
        aria-label="Gratitude list"
      />
      <Btn className="mt-3 w-full" onClick={submit} disabled={!title.trim() && !content.trim()}>
        <PenLine className="size-4" aria-hidden /> Save entry
      </Btn>
    </GlassCard>
  );
}
