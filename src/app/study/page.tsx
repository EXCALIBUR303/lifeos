"use client";

import {
  Btn,
  Chip,
  GlassCard,
  MeterBar,
  PageHeader,
  SectionTitle,
  StatTile,
  fadeUp,
  inputCls,
  stagger,
} from "@/components/ui";
import { useLife } from "@/lib/store";
import { Flashcard, Subject } from "@/lib/types";
import { cn, daysBetween, lastNDates, prettyDate, sum, todayISO } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  Layers,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];
const ATTENDANCE_TARGET = 0.75;

export default function StudyPage() {
  const {
    subjects, updateSubject, addSubject, deleteSubject,
    flashcards, addCard, deleteCard, reviewCard,
    events, focus,
  } = useLife();
  const today = todayISO();
  const [reviewDeck, setReviewDeck] = useState<string | null>(null);
  const [addingSubject, setAddingSubject] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

  /* CGPA over graded subjects */
  const graded = subjects.filter((s) => s.gradePoint !== undefined);
  const cgpa =
    graded.length > 0
      ? sum(graded.map((s) => s.credits * (s.gradePoint ?? 0))) /
        sum(graded.map((s) => s.credits))
      : null;

  const attended = sum(subjects.map((s) => s.attended));
  const total = sum(subjects.map((s) => s.totalClasses));

  const dueCards = flashcards.filter((c) => c.due <= today);

  const week = new Set(lastNDates(7));
  const studyMinutes = sum(
    focus
      .filter((f) => week.has(f.date) && /study|college|read/i.test(f.label))
      .map((f) => f.minutes),
  );

  const upcomingExams = useMemo(
    () =>
      events
        .filter((e) => e.kind === "exam" && e.date >= today)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [events, today],
  );

  const decks = useMemo(() => {
    const map = new Map<string, { total: number; due: number }>();
    for (const c of flashcards) {
      const d = map.get(c.deck) ?? { total: 0, due: 0 };
      d.total++;
      if (c.due <= today) d.due++;
      map.set(c.deck, d);
    }
    return [...map.entries()];
  }, [flashcards, today]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Study dashboard"
        title="Semester, under"
        accent="control"
        subtitle="Attendance, CGPA, exams and spaced-repetition flashcards in one place."
        actions={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setAddingCard(true)}>
              <Plus className="size-4" aria-hidden /> Card
            </Btn>
            <Btn onClick={() => setAddingSubject(true)}>
              <Plus className="size-4" aria-hidden /> Subject
            </Btn>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="CGPA (graded so far)"
          value={cgpa !== null ? cgpa.toFixed(2) : "—"}
          delta={graded.length ? `${graded.length} of ${subjects.length} subjects graded` : "no grades yet"}
        />
        <StatTile
          label="Attendance"
          value={total ? `${Math.round((attended / total) * 100)}%` : "—"}
          delta={`${attended}/${total} classes`}
          deltaGood={total > 0 && attended / total >= ATTENDANCE_TARGET}
        />
        <StatTile
          label="Cards due today"
          value={dueCards.length}
          delta={`${flashcards.length} in all decks`}
        />
        <StatTile
          label="Study focus, 7 days"
          value={`${Math.round(studyMinutes / 60)}h ${studyMinutes % 60}m`}
          delta="from focus sessions"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* subjects */}
        <GlassCard className="p-5 xl:col-span-7">
          <SectionTitle>Subjects & attendance</SectionTitle>
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {subjects.map((s, i) => (
                <SubjectRow
                  key={s.id}
                  subject={s}
                  color={SERIES[(s.color - 1) % SERIES.length] ?? SERIES[i % SERIES.length]}
                  onUpdate={(patch) => updateSubject(s.id, patch)}
                  onDelete={() => deleteSubject(s.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </GlassCard>

        <div className="space-y-4 xl:col-span-5">
          {/* exams */}
          <GlassCard className="p-5">
            <SectionTitle>Upcoming exams</SectionTitle>
            {upcomingExams.length === 0 && (
              <p className="py-4 text-center text-sm text-ink-3">
                Nothing scheduled — add exams in the Calendar.
              </p>
            )}
            <ul className="space-y-2">
              {upcomingExams.map((e) => {
                const days = daysBetween(today, e.date);
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span
                      className={cn(
                        "flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-center",
                        days <= 3 ? "bg-bad-soft text-bad" : days <= 7 ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent",
                      )}
                    >
                      <span className="text-base font-bold leading-none">{days}</span>
                      <span className="text-[9px] uppercase">days</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{e.title}</span>
                      <span className="text-xs text-ink-3">
                        {prettyDate(e.date)} · {e.start}
                        {e.location ? ` · ${e.location}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </GlassCard>

          {/* flashcards */}
          <GlassCard className="p-5">
            <SectionTitle
              action={
                dueCards.length > 0 ? (
                  <Btn variant="soft" onClick={() => setReviewDeck("__all__")}>
                    <BookOpenCheck className="size-4" aria-hidden /> Review {dueCards.length} due
                  </Btn>
                ) : undefined
              }
            >
              Flashcards
            </SectionTitle>
            <ul className="space-y-1.5">
              {decks.map(([deck, info]) => (
                <li key={deck}>
                  <button
                    onClick={() => setReviewDeck(deck)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-card-hover"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Layers className="size-4" aria-hidden />
                    </span>
                    <span className="flex-1 text-sm font-medium text-ink">{deck}</span>
                    {info.due > 0 && (
                      <Chip className="border-warn-soft bg-warn-soft text-warn">{info.due} due</Chip>
                    )}
                    <span className="text-xs text-ink-3">{info.total} cards</span>
                  </button>
                </li>
              ))}
              {decks.length === 0 && (
                <p className="py-4 text-center text-sm text-ink-3">No cards yet.</p>
              )}
            </ul>
          </GlassCard>
        </div>
      </div>

      <AnimatePresence>
        {reviewDeck && (
          <ReviewModal
            cards={flashcards.filter(
              (c) => c.due <= today && (reviewDeck === "__all__" || c.deck === reviewDeck),
            )}
            onGrade={reviewCard}
            onDelete={deleteCard}
            onClose={() => setReviewDeck(null)}
          />
        )}
        {addingSubject && (
          <SubjectModal
            onClose={() => setAddingSubject(false)}
            onAdd={(s) => {
              addSubject(s);
              setAddingSubject(false);
            }}
          />
        )}
        {addingCard && (
          <CardModal
            decks={decks.map(([d]) => d)}
            onClose={() => setAddingCard(false)}
            onAdd={(c) => {
              addCard(c);
              setAddingCard(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------------- subject row ---------------- */

function SubjectRow({
  subject: s,
  color,
  onUpdate,
  onDelete,
}: {
  subject: Subject;
  color: string;
  onUpdate: (patch: Partial<Subject>) => void;
  onDelete: () => void;
}) {
  const rate = s.totalClasses > 0 ? s.attended / s.totalClasses : 1;
  // how many future classes can be missed while staying ≥ target
  const canMiss = Math.floor(s.attended / ATTENDANCE_TARGET - s.totalClasses);
  const mustAttend = Math.ceil(
    (ATTENDANCE_TARGET * s.totalClasses - s.attended) / (1 - ATTENDANCE_TARGET),
  );

  return (
    <motion.li layout variants={fadeUp} exit={{ opacity: 0, scale: 0.98 }} className="group">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
        <span className="flex-1 truncate text-sm font-semibold text-ink">
          {s.name}
          {s.code && <span className="ml-1.5 font-normal text-ink-3">{s.code}</span>}
        </span>
        <Chip>{s.credits} cr</Chip>
        <GradeSelect value={s.gradePoint} onChange={(gp) => onUpdate({ gradePoint: gp })} />
        <button
          aria-label={`Delete ${s.name}`}
          onClick={onDelete}
          className="cursor-pointer text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <MeterBar value={s.attended} max={s.totalClasses} color={color} over={rate < ATTENDANCE_TARGET} />
        </div>
        <span className={cn("w-24 text-right text-xs font-medium", rate < ATTENDANCE_TARGET ? "text-bad" : "text-ink-2")}>
          {s.attended}/{s.totalClasses} · {Math.round(rate * 100)}%
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <p className="flex-1 text-[11px] text-ink-3">
          {rate >= ATTENDANCE_TARGET
            ? canMiss > 0
              ? `Safe to skip ${canMiss} more class${canMiss === 1 ? "" : "es"} (75% floor)`
              : "Right at the 75% floor — attend the next one"
            : `Below 75% — attend the next ${mustAttend} straight to recover`}
        </p>
        <button
          onClick={() => onUpdate({ attended: s.attended + 1, totalClasses: s.totalClasses + 1 })}
          className="cursor-pointer rounded-lg bg-good-soft px-2 py-0.5 text-[11px] font-medium text-good transition-colors hover:bg-good hover:text-white"
        >
          <Check className="mr-0.5 inline size-3" aria-hidden />
          Present
        </button>
        <button
          onClick={() => onUpdate({ totalClasses: s.totalClasses + 1 })}
          className="cursor-pointer rounded-lg bg-bad-soft px-2 py-0.5 text-[11px] font-medium text-bad transition-colors hover:bg-bad hover:text-white"
        >
          Missed
        </button>
      </div>
    </motion.li>
  );
}

function GradeSelect({
  value,
  onChange,
}: {
  value?: number;
  onChange: (gp?: number) => void;
}) {
  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label="Grade point"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="cursor-pointer appearance-none rounded-full border border-line bg-card py-0.5 pl-2 pr-6 text-[11px] font-medium text-ink-2 outline-none transition-colors hover:text-ink focus:border-accent"
      >
        <option value="">grade…</option>
        {[10, 9, 8, 7, 6, 5, 4].map((g) => (
          <option key={g} value={g}>
            {g}/10
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-ink-3" aria-hidden />
    </span>
  );
}

/* ---------------- flashcard review ---------------- */

function ReviewModal({
  cards,
  onGrade,
  onDelete,
  onClose,
}: {
  cards: Flashcard[];
  onGrade: (id: string, grade: 0 | 1 | 2) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [queue] = useState(cards);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = queue[i];

  const grade = (g: 0 | 1 | 2) => {
    onGrade(card.id, g);
    setFlipped(false);
    if (i + 1 >= queue.length) onClose();
    else setI(i + 1);
  };

  if (!card) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-label="Flashcard review"
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between text-sm text-white/80">
          <span>
            {card.deck} · {i + 1} / {queue.length}
          </span>
          <button aria-label="Close review" onClick={onClose} className="cursor-pointer hover:text-white">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="glass-strong flex min-h-56 w-full cursor-pointer flex-col items-center justify-center rounded-3xl p-8 text-center"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
            {flipped ? "answer" : "question — tap to flip"}
          </p>
          <p className={cn("mt-3 text-lg leading-relaxed text-ink", !flipped && "font-semibold")}>
            {flipped ? card.back : card.front}
          </p>
        </button>

        <div className="mt-4 flex gap-2">
          {flipped ? (
            <>
              <Btn variant="danger" className="flex-1" onClick={() => grade(0)}>
                Again
              </Btn>
              <Btn variant="soft" className="flex-1" onClick={() => grade(1)}>
                Good · {Math.max(1, Math.round(card.interval * card.ease)) || 1}d
              </Btn>
              <Btn className="flex-1" onClick={() => grade(2)}>
                Easy
              </Btn>
            </>
          ) : (
            <Btn className="flex-1" onClick={() => setFlipped(true)}>
              Show answer
            </Btn>
          )}
          <Btn
            variant="ghost"
            onClick={() => {
              onDelete(card.id);
              if (i + 1 >= queue.length) onClose();
              else setI(i + 1);
              setFlipped(false);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
          </Btn>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- add modals ---------------- */

function SubjectModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (s: Omit<Subject, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState(3);

  return (
    <ModalShell title="New subject" onClose={onClose}>
      <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="sub-name">Name</label>
      <input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus placeholder="e.g. Computer Networks" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="sub-code">Code</label>
          <input id="sub-code" value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="CS305" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="sub-cr">Credits</label>
          <input id="sub-cr" type="number" min={1} max={6} value={credits} onChange={(e) => setCredits(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
        </div>
      </div>
      <Btn
        className="mt-5 w-full"
        disabled={!name.trim()}
        onClick={() =>
          onAdd({ name: name.trim(), code: code.trim() || undefined, credits, attended: 0, totalClasses: 0, color: ((Math.random() * 5) | 0) + 1 })
        }
      >
        Add subject
      </Btn>
    </ModalShell>
  );
}

function CardModal({
  decks,
  onClose,
  onAdd,
}: {
  decks: string[];
  onClose: () => void;
  onAdd: (c: { deck: string; front: string; back: string }) => void;
}) {
  const [deck, setDeck] = useState(decks[0] ?? "General");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  return (
    <ModalShell title="New flashcard" onClose={onClose}>
      <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="card-deck">Deck</label>
      <input id="card-deck" value={deck} onChange={(e) => setDeck(e.target.value)} className={inputCls} list="deck-list" />
      <datalist id="deck-list">
        {decks.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <label className="mb-1 mt-3 block text-xs font-medium text-ink-2" htmlFor="card-front">Front</label>
      <textarea id="card-front" value={front} onChange={(e) => setFront(e.target.value)} rows={2} className={cn(inputCls, "resize-none")} placeholder="The question" />
      <label className="mb-1 mt-3 block text-xs font-medium text-ink-2" htmlFor="card-back">Back</label>
      <textarea id="card-back" value={back} onChange={(e) => setBack(e.target.value)} rows={3} className={cn(inputCls, "resize-none")} placeholder="The answer" />
      <Btn
        className="mt-5 w-full"
        disabled={!front.trim() || !back.trim() || !deck.trim()}
        onClick={() => onAdd({ deck: deck.trim(), front: front.trim(), back: back.trim() })}
      >
        Add card
      </Btn>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
        aria-label={title}
        className="glass-strong w-full max-w-md rounded-2xl p-5"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="cursor-pointer text-ink-3 hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
