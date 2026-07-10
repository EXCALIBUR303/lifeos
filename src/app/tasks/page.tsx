"use client";

import {
  Btn,
  Chip,
  GlassCard,
  PageHeader,
  Segmented,
  fadeUp,
  stagger,
} from "@/components/ui";
import { parseTask } from "@/lib/nlp";
import { useLife } from "@/lib/store";
import { Task, TaskStatus } from "@/lib/types";
import { cn, relativeDay, todayISO } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDashed,
  Flag,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

const PRIORITY_STYLE: Record<Task["priority"], string> = {
  urgent: "border-bad-soft bg-bad-soft text-bad",
  high: "border-warn-soft bg-warn-soft text-warn",
  medium: "border-line bg-card text-ink-2",
  low: "border-line bg-card text-ink-3",
};

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
];

export default function TasksPage() {
  const { tasks, addTask, setTaskStatus, deleteTask } = useLife();
  const [view, setView] = useState<"list" | "board">("list");
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const today = todayISO();

  const parsed = useMemo(() => (draft.trim() ? parseTask(draft) : null), [draft]);

  const submit = () => {
    if (!parsed?.title) return;
    addTask(parsed);
    setDraft("");
  };

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const groups: { label: string; items: Task[]; tone?: "bad" }[] = [
    { label: "Overdue", items: open.filter((t) => t.due && t.due < today), tone: "bad" },
    { label: "Today", items: open.filter((t) => t.due === today) },
    { label: "Upcoming", items: open.filter((t) => t.due && t.due > today).sort((a, b) => (a.due! < b.due! ? -1 : 1)) },
    { label: "Someday", items: open.filter((t) => !t.due) },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Task manager"
        title="Everything, in"
        accent="flow"
        subtitle="Type naturally — “submit report next friday at 9 #college urgent” becomes a scheduled task."
        actions={
          <Segmented
            options={[
              { value: "list", label: "List" },
              { value: "board", label: "Board" },
            ]}
            value={view}
            onChange={setView}
          />
        }
      />

      {/* quick add */}
      <motion.div variants={fadeUp} className="glass mb-6 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="ml-1 size-4 shrink-0 text-accent" aria-hidden />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a task… try “call dentist tomorrow morning #health”"
            className="min-h-9 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            aria-label="New task"
          />
          <Btn onClick={submit} disabled={!parsed?.title}>
            <Plus className="size-4" aria-hidden /> Add
          </Btn>
        </div>
        {parsed && (parsed.due || parsed.tags.length > 0 || parsed.priority !== "medium") && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7">
            <span className="text-[11px] text-ink-3">Understood:</span>
            {parsed.due && <Chip className="text-accent">{relativeDay(parsed.due)}{parsed.dueTime ? ` · ${parsed.dueTime}` : ""}</Chip>}
            {!parsed.due && parsed.dueTime && <Chip className="text-accent">at {parsed.dueTime}</Chip>}
            {parsed.priority !== "medium" && (
              <Chip className={PRIORITY_STYLE[parsed.priority]}>
                <Flag className="size-3" aria-hidden /> {parsed.priority}
              </Chip>
            )}
            {parsed.tags.map((t) => (
              <Chip key={t}>#{t}</Chip>
            ))}
          </div>
        )}
      </motion.div>

      {view === "list" ? (
        <div className="space-y-6">
          {groups.map(
            (g) =>
              g.items.length > 0 && (
                <motion.section key={g.label} variants={fadeUp}>
                  <h2 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", g.tone === "bad" ? "text-bad" : "text-ink-2")}>
                    {g.label}
                    <span className="text-xs font-normal text-ink-3">{g.items.length}</span>
                  </h2>
                  <GlassCard animate={false} className="divide-y divide-[var(--line)] overflow-hidden">
                    <AnimatePresence initial={false}>
                      {g.items.map((t) => (
                        <TaskRow key={t.id} task={t} onDone={() => setTaskStatus(t.id, "done")} onDelete={() => deleteTask(t.id)} />
                      ))}
                    </AnimatePresence>
                  </GlassCard>
                </motion.section>
              ),
          )}
          {done.length > 0 && (
            <motion.section variants={fadeUp}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-3">
                Done <span className="text-xs font-normal">{done.length}</span>
              </h2>
              <GlassCard animate={false} className="divide-y divide-[var(--line)] overflow-hidden opacity-70">
                <AnimatePresence initial={false}>
                  {done.slice(0, 6).map((t) => (
                    <TaskRow key={t.id} task={t} onDone={() => setTaskStatus(t.id, "todo")} onDelete={() => deleteTask(t.id)} />
                  ))}
                </AnimatePresence>
              </GlassCard>
            </motion.section>
          )}
        </div>
      ) : (
        /* -------- kanban board -------- */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.id);
            return (
              <motion.div
                key={col.id}
                variants={fadeUp}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) setTaskStatus(dragId, col.id);
                  setDragId(null);
                }}
                className="glass min-h-[300px] rounded-2xl p-3"
              >
                <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-ink-2">
                  {col.label}
                  <span className="text-xs font-normal text-ink-3">{items.length}</span>
                </h2>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        className={cn(
                          "cursor-grab rounded-xl border border-line bg-card-strong p-3 transition-shadow active:cursor-grabbing",
                          dragId === t.id && "opacity-50",
                        )}
                      >
                        <p className={cn("text-sm font-medium text-ink", t.status === "done" && "line-through opacity-60")}>
                          {t.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {t.due && (
                            <Chip className={t.due < today && t.status !== "done" ? "text-bad" : ""}>
                              {relativeDay(t.due)}
                            </Chip>
                          )}
                          <Chip className={PRIORITY_STYLE[t.priority]}>{t.priority}</Chip>
                          {t.tags.slice(0, 2).map((tag) => (
                            <Chip key={tag}>#{tag}</Chip>
                          ))}
                          <span className="ml-auto flex gap-0.5">
                            {col.id !== "todo" && (
                              <IconBtn label="Move left" onClick={() => setTaskStatus(t.id, col.id === "done" ? "doing" : "todo")}>
                                <ArrowLeft className="size-3.5" aria-hidden />
                              </IconBtn>
                            )}
                            {col.id !== "done" && (
                              <IconBtn label="Move right" onClick={() => setTaskStatus(t.id, col.id === "todo" ? "doing" : "done")}>
                                <ArrowRight className="size-3.5" aria-hidden />
                              </IconBtn>
                            )}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {items.length === 0 && (
                    <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line py-8 text-xs text-ink-3">
                      <CircleDashed className="size-4" aria-hidden /> Drop tasks here
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-card-hover hover:text-ink"
    >
      {children}
    </button>
  );
}

function TaskRow({
  task,
  onDone,
  onDelete,
}: {
  task: Task;
  onDone: () => void;
  onDelete: () => void;
}) {
  const today = todayISO();
  const isDone = task.status === "done";
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2 }}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card-hover"
    >
      <button
        aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
        onClick={onDone}
        className={cn(
          "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all",
          isDone
            ? "border-good bg-good text-white"
            : "border-line-strong text-transparent hover:border-accent hover:text-accent",
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm text-ink", isDone && "line-through opacity-60")}>
          {task.title}
        </p>
        {task.notes && <p className="truncate text-xs text-ink-3">{task.notes}</p>}
      </div>
      {task.due && !isDone && (
        <Chip className={task.due < today ? "border-bad-soft bg-bad-soft text-bad" : ""}>
          {relativeDay(task.due)}
          {task.dueTime ? ` · ${task.dueTime}` : ""}
        </Chip>
      )}
      <Chip className={cn("hidden sm:inline-flex", PRIORITY_STYLE[task.priority])}>{task.priority}</Chip>
      {task.tags[0] && <Chip className="hidden md:inline-flex">#{task.tags[0]}</Chip>}
      <button
        aria-label={`Delete ${task.title}`}
        onClick={onDelete}
        className="cursor-pointer text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </motion.div>
  );
}
