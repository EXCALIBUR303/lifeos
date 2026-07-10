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
import { useLife } from "@/lib/store";
import { cn, relativeDay } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link2, Pin, Plus, Search, Trash2 } from "lucide-react";
import { Fragment, ReactNode, useMemo, useState } from "react";

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote } = useLife();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null);
  const [mode, setMode] = useState<"read" | "edit">("read");

  const sorted = useMemo(
    () =>
      [...notes].sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return a.updatedAt < b.updatedAt ? 1 : -1;
      }),
    [notes],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter(
      (n) =>
        n.title.toLowerCase().includes(needle) ||
        n.content.toLowerCase().includes(needle),
    );
  }, [sorted, q]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const backlinks = useMemo(() => {
    if (!selected) return [];
    const needle = `[[${selected.title.toLowerCase()}]]`;
    return notes.filter(
      (n) => n.id !== selected.id && n.content.toLowerCase().includes(needle),
    );
  }, [notes, selected]);

  const openByTitle = (title: string) => {
    const existing = notes.find(
      (n) => n.title.toLowerCase() === title.toLowerCase(),
    );
    if (existing) {
      setSelectedId(existing.id);
      setMode("read");
    } else {
      const id = addNote({ title, content: "" });
      setSelectedId(id);
      setMode("edit");
    }
  };

  const createNote = () => {
    const id = addNote({ title: "Untitled", content: "" });
    setSelectedId(id);
    setMode("edit");
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Notes"
        title="A second"
        accent="brain"
        subtitle="Markdown notes that link to each other — [[like this]] — with backlinks for free."
        actions={
          <Btn onClick={createNote}>
            <Plus className="size-4" aria-hidden /> New note
          </Btn>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* list */}
        <motion.div variants={fadeUp} className="xl:col-span-4">
          <div className="glass mb-3 flex items-center gap-2 rounded-2xl px-3.5 py-2.5">
            <Search className="size-4 text-ink-3" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes…"
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              aria-label="Search notes"
            />
          </div>
          <ul className="space-y-2">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    setSelectedId(n.id);
                    setMode("read");
                  }}
                  className={cn(
                    "glass w-full cursor-pointer rounded-2xl p-3.5 text-left transition-colors hover:bg-card-hover",
                    n.id === selectedId && "border-accent bg-accent-soft",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {n.pinned && <Pin className="size-3 shrink-0 text-accent" aria-hidden />}
                    <span className="truncate text-sm font-semibold text-ink">{n.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-ink-3">
                      {relativeDay(n.updatedAt)}
                    </span>
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-3">
                    {n.content.replace(/[#*`[\]]/g, "").slice(0, 140) || "Empty note"}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-ink-3">
                No notes match.
              </p>
            )}
          </ul>
        </motion.div>

        {/* editor / viewer */}
        <motion.div variants={fadeUp} className="xl:col-span-8">
          {selected ? (
            <GlassCard animate={false} className="p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {mode === "edit" ? (
                  <input
                    value={selected.title}
                    onChange={(e) => updateNote(selected.id, { title: e.target.value })}
                    className={cn(inputCls, "max-w-sm text-lg font-semibold")}
                    aria-label="Note title"
                  />
                ) : (
                  <h2 className="text-xl font-semibold tracking-tight text-ink">
                    {selected.title}
                  </h2>
                )}
                <span className="flex-1" />
                <button
                  aria-label={selected.pinned ? "Unpin" : "Pin"}
                  aria-pressed={!!selected.pinned}
                  onClick={() => updateNote(selected.id, { pinned: !selected.pinned })}
                  className={cn(
                    "cursor-pointer rounded-lg p-2 transition-colors",
                    selected.pinned ? "bg-accent-soft text-accent" : "text-ink-3 hover:text-ink",
                  )}
                >
                  <Pin className="size-4" aria-hidden />
                </button>
                <Segmented
                  options={[
                    { value: "read", label: "Read" },
                    { value: "edit", label: "Edit" },
                  ]}
                  value={mode}
                  onChange={setMode}
                />
                <button
                  aria-label="Delete note"
                  onClick={() => {
                    deleteNote(selected.id);
                    setSelectedId(notes.find((n) => n.id !== selected.id)?.id ?? null);
                  }}
                  className="cursor-pointer rounded-lg p-2 text-ink-3 transition-colors hover:text-bad"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              {mode === "edit" ? (
                <textarea
                  value={selected.content}
                  onChange={(e) => updateNote(selected.id, { content: e.target.value })}
                  rows={18}
                  className={cn(inputCls, "resize-y font-mono text-[13px] leading-relaxed")}
                  placeholder={"Write in markdown-lite…\n# Heading\n**bold**, *italic*, `code`\n- lists\n[[Link to another note]]"}
                  aria-label="Note content"
                />
              ) : (
                <div className="min-h-40">
                  <NoteBody content={selected.content} onNavigate={openByTitle} />
                </div>
              )}

              {backlinks.length > 0 && (
                <div className="mt-6 border-t border-line pt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-3">
                    <Link2 className="size-3.5" aria-hidden /> Linked from
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {backlinks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedId(b.id);
                          setMode("read");
                        }}
                        className="cursor-pointer"
                      >
                        <Chip className="transition-colors hover:border-accent hover:text-accent">
                          {b.title}
                        </Chip>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          ) : (
            <p className="rounded-2xl border border-dashed border-line py-20 text-center text-sm text-ink-3">
              Select a note, or create one.
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ---------------- markdown-lite renderer ---------------- */

function NoteBody({
  content,
  onNavigate,
}: {
  content: string;
  onNavigate: (title: string) => void;
}) {
  const lines = content.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];

  const flushList = (key: string) => {
    if (list.length) {
      out.push(
        <ul key={key} className="my-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
          {list}
        </ul>,
      );
      list = [];
    }
  };

  lines.forEach((line, i) => {
    if (/^\s*[-*]\s+/.test(line)) {
      list.push(<li key={i}>{inline(line.replace(/^\s*[-*]\s+/, ""), onNavigate)}</li>);
      return;
    }
    flushList(`ul-${i}`);
    if (line.startsWith("## ")) {
      out.push(
        <h3 key={i} className="mb-1 mt-4 text-sm font-semibold text-ink">
          {inline(line.slice(3), onNavigate)}
        </h3>,
      );
    } else if (line.startsWith("# ")) {
      out.push(
        <h2 key={i} className="mb-1 mt-4 text-base font-semibold tracking-tight text-ink">
          {inline(line.slice(2), onNavigate)}
        </h2>,
      );
    } else if (line.trim() === "") {
      out.push(<div key={i} className="h-2" />);
    } else {
      out.push(
        <p key={i} className="text-sm leading-relaxed text-ink-2">
          {inline(line, onNavigate)}
        </p>,
      );
    }
  });
  flushList("ul-end");

  return <>{out}</>;
}

function inline(text: string, onNavigate: (t: string) => void): ReactNode {
  // split on [[wiki]], **bold**, *italic*, `code`
  const parts = text.split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const title = part.slice(2, -2);
      return (
        <button
          key={i}
          onClick={() => onNavigate(title)}
          className="cursor-pointer rounded bg-accent-soft px-1 font-medium text-accent transition-colors hover:bg-accent hover:text-accent-ink"
        >
          {title}
        </button>
      );
    }
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return (
        <em key={i} className="text-ink">
          {part.slice(1, -1)}
        </em>
      );
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="rounded bg-card px-1 py-0.5 font-mono text-[12px] text-accent">
          {part.slice(1, -1)}
        </code>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });
}
