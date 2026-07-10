"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { seed, SeedData } from "./seed";
import {
  Budgets,
  CalEvent,
  CategoryId,
  ChatMsg,
  DayHealth,
  FocusSession,
  Goal,
  Habit,
  JournalEntry,
  LifeArea,
  Note,
  Priority,
  Subject,
  Task,
  TaskStatus,
  Transaction,
} from "./types";
import { addDays, toISO, todayISO, uid } from "./utils";

/* ---------------- settings ---------------- */

export type ThemeMode = "dark" | "light" | "oled";
export type AccentId = "indigo" | "teal" | "rose" | "amber";

export type AiProvider = "claude" | "gemini";

interface SettingsState {
  name: string;
  theme: ThemeMode;
  accent: AccentId;
  /** API keys for the assistant — stored only in this browser. */
  apiKey: string; // Anthropic
  geminiKey: string; // Google AI Studio
  provider: AiProvider;
  /** Device-pairing code for E2E-encrypted sync ("" = sync off). */
  syncCode: string;
  /** Random id for the published calendar feed ("" = never generated). */
  feedId: string;
  publishFeed: boolean;
  setName: (name: string) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentId) => void;
  setApiKey: (apiKey: string) => void;
  setGeminiKey: (geminiKey: string) => void;
  setProvider: (provider: AiProvider) => void;
  setSyncCode: (syncCode: string) => void;
  setFeedId: (feedId: string) => void;
  setPublishFeed: (publishFeed: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      name: "Sid",
      theme: "dark",
      accent: "indigo",
      apiKey: "",
      geminiKey: "",
      provider: "claude",
      syncCode: "",
      feedId: "",
      publishFeed: false,
      setName: (name) => set({ name }),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setApiKey: (apiKey) => set({ apiKey }),
      setGeminiKey: (geminiKey) => set({ geminiKey }),
      setProvider: (provider) => set({ provider }),
      setSyncCode: (syncCode) => set({ syncCode }),
      setFeedId: (feedId) => set({ feedId }),
      setPublishFeed: (publishFeed) => set({ publishFeed }),
    }),
    { name: "lifeos-settings", storage: createJSONStorage(() => localStorage) },
  ),
);

/* ---------------- life data ---------------- */

interface LifeState extends SeedData {
  hydrated: boolean;

  addTask: (t: {
    title: string;
    due?: string;
    dueTime?: string;
    priority?: Priority;
    tags?: string[];
    notes?: string;
  }) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;

  addHabit: (h: { name: string; icon: string; color: number; cadence: number[] }) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, iso: string) => void;

  addTransaction: (t: {
    date: string;
    amount: number;
    kind: "expense" | "income";
    category: CategoryId;
    note: string;
  }) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (category: CategoryId, amount: number) => void;

  addGoal: (g: {
    title: string;
    area: LifeArea;
    horizon: Goal["horizon"];
    deadline?: string;
    why?: string;
    milestones: string[];
  }) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  deleteGoal: (id: string) => void;

  addJournal: (e: {
    mood: JournalEntry["mood"];
    title: string;
    content: string;
    gratitude: string[];
  }) => void;
  deleteJournal: (id: string) => void;

  logHealth: (iso: string, patch: Partial<DayHealth>) => void;
  addFocus: (minutes: number, label: string) => void;

  addEvent: (e: Omit<CalEvent, "id">) => void;
  updateEvent: (id: string, patch: Partial<CalEvent>) => void;
  deleteEvent: (id: string) => void;
  importEvents: (es: Omit<CalEvent, "id">[]) => void;

  addSubject: (s: Omit<Subject, "id">) => void;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  addCard: (c: { deck: string; front: string; back: string }) => void;
  deleteCard: (id: string) => void;
  /** grade: 0 = again, 1 = good, 2 = easy (SM-2-lite). */
  reviewCard: (id: string, grade: 0 | 1 | 2) => void;

  addNote: (n: { title: string; content: string }) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  pushChat: (m: { role: ChatMsg["role"]; content: string; source?: ChatMsg["source"] }) => void;
  clearChat: () => void;

  chat: ChatMsg[];

  resetAll: () => void;
}

export const useLife = create<LifeState>()(
  persist(
    (set) => ({
      ...seed(),
      hydrated: false,

      addTask: (t) =>
        set((s) => ({
          tasks: [
            {
              id: uid(),
              title: t.title,
              status: "todo" as TaskStatus,
              priority: t.priority ?? "medium",
              due: t.due,
              dueTime: t.dueTime,
              tags: t.tags ?? [],
              notes: t.notes,
              createdAt: todayISO(),
            },
            ...s.tasks,
          ],
        })),
      setTaskStatus: (id, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  completedAt: status === "done" ? todayISO() : undefined,
                }
              : t,
          ),
        })),
      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addHabit: (h) =>
        set((s) => ({
          habits: [
            ...s.habits,
            { id: uid(), history: [], createdAt: todayISO(), ...h },
          ],
        })),
      deleteHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
      toggleHabit: (id, iso) =>
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id
              ? {
                  ...h,
                  history: h.history.includes(iso)
                    ? h.history.filter((d) => d !== iso)
                    : [...h.history, iso].sort(),
                }
              : h,
          ),
        })),

      addTransaction: (t) =>
        set((s) => ({
          transactions: [{ id: uid(), ...t }, ...s.transactions],
        })),
      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),
      setBudget: (category, amount) =>
        set((s) => ({
          budgets: { ...s.budgets, [category]: amount } as Budgets,
        })),

      addGoal: (g) =>
        set((s) => ({
          goals: [
            {
              id: uid(),
              title: g.title,
              area: g.area,
              horizon: g.horizon,
              deadline: g.deadline,
              why: g.why,
              createdAt: todayISO(),
              milestones: g.milestones.map((title) => ({
                id: uid(),
                title,
                done: false,
              })),
            },
            ...s.goals,
          ],
        })),
      toggleMilestone: (goalId, milestoneId) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  milestones: g.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, done: !m.done } : m,
                  ),
                }
              : g,
          ),
        })),
      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addJournal: (e) =>
        set((s) => ({
          journal: [
            { id: uid(), date: todayISO(), ...e },
            ...s.journal,
          ],
        })),
      deleteJournal: (id) =>
        set((s) => ({ journal: s.journal.filter((e) => e.id !== id) })),

      logHealth: (iso, patch) =>
        set((s) => ({
          health: { ...s.health, [iso]: { ...s.health[iso], ...patch } },
        })),
      addFocus: (minutes, label) =>
        set((s) => ({
          focus: [
            ...s.focus,
            { id: uid(), date: todayISO(), minutes, label } as FocusSession,
          ],
        })),

      addEvent: (e) => set((s) => ({ events: [...s.events, { id: uid(), ...e }] })),
      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      importEvents: (es) =>
        set((s) => ({
          events: [...s.events, ...es.map((e) => ({ id: uid(), ...e }))],
        })),

      addSubject: (sub) =>
        set((s) => ({ subjects: [...s.subjects, { id: uid(), ...sub }] })),
      updateSubject: (id, patch) =>
        set((s) => ({
          subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteSubject: (id) =>
        set((s) => ({ subjects: s.subjects.filter((x) => x.id !== id) })),

      addCard: (c) =>
        set((s) => ({
          flashcards: [
            ...s.flashcards,
            { id: uid(), ease: 2.5, interval: 0, due: todayISO(), reps: 0, ...c },
          ],
        })),
      deleteCard: (id) =>
        set((s) => ({ flashcards: s.flashcards.filter((c) => c.id !== id) })),
      reviewCard: (id, grade) =>
        set((s) => ({
          flashcards: s.flashcards.map((c) => {
            if (c.id !== id) return c;
            let { ease, interval } = c;
            if (grade === 0) {
              ease = Math.max(1.3, ease - 0.2);
              interval = 1;
            } else if (grade === 1) {
              interval = c.reps === 0 ? 1 : Math.max(1, Math.round(interval * ease));
            } else {
              ease = Math.min(3, ease + 0.15);
              interval = c.reps === 0 ? 2 : Math.max(2, Math.round(interval * ease * 1.3));
            }
            return {
              ...c,
              ease,
              interval,
              reps: c.reps + 1,
              due: toISO(addDays(new Date(), interval)),
            };
          }),
        })),

      addNote: (n) => {
        const id = uid();
        set((s) => ({
          notes: [{ id, updatedAt: todayISO(), ...n }, ...s.notes],
        }));
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: todayISO() } : x,
          ),
        })),
      deleteNote: (id) =>
        set((s) => ({ notes: s.notes.filter((x) => x.id !== id) })),

      chat: [],
      pushChat: (m) =>
        set((s) => ({
          chat: [
            ...s.chat.slice(-60),
            { id: uid(), at: new Date().toISOString(), ...m },
          ],
        })),
      clearChat: () => set({ chat: [] }),

      resetAll: () => set({ ...seed(), chat: [] }),
    }),
    {
      name: "lifeos-data",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hydrated, ...rest } = s;
        return rest;
      },
      onRehydrateStorage: () => () => {
        useLife.setState({ hydrated: true });
      },
    },
  ),
);

export type { Habit, Task, Transaction, Goal, JournalEntry };
