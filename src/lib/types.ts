/* ---------------- tasks ---------------- */

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  /** ISO day the task is due (optional). */
  due?: string;
  /** Optional "HH:MM" time attached to the due day. */
  dueTime?: string;
  tags: string[];
  createdAt: string;
  completedAt?: string;
}

/* ---------------- habits ---------------- */

export interface Habit {
  id: string;
  name: string;
  /** lucide icon key, see ICONS map in components/ui. */
  icon: string;
  /** series color slot 1-5. */
  color: number;
  /** Days of week the habit is scheduled (0=Sun..6=Sat). */
  cadence: number[];
  /** ISO days on which the habit was completed. */
  history: string[];
  createdAt: string;
}

/* ---------------- money ---------------- */

export type CategoryId =
  | "food"
  | "groceries"
  | "transport"
  | "shopping"
  | "bills"
  | "rent"
  | "subscriptions"
  | "entertainment"
  | "health"
  | "education"
  | "travel"
  | "other"
  | "salary"
  | "freelance"
  | "investment";

export interface Transaction {
  id: string;
  date: string; // ISO day
  amount: number; // always positive
  kind: "expense" | "income";
  category: CategoryId;
  note: string;
  recurring?: boolean;
}

export type Budgets = Partial<Record<CategoryId, number>>;

/* ---------------- goals ---------------- */

export type LifeArea =
  | "health"
  | "money"
  | "learning"
  | "career"
  | "relationships"
  | "mindfulness"
  | "fitness"
  | "productivity"
  | "creativity";

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  why?: string;
  area: LifeArea;
  horizon: "short" | "long" | "dream";
  deadline?: string;
  milestones: Milestone[];
  createdAt: string;
}

/* ---------------- journal ---------------- */

export interface JournalEntry {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  title: string;
  content: string;
  gratitude: string[];
}

/* ---------------- health ---------------- */

export interface DayHealth {
  water: number; // glasses (target 8)
  sleep: number; // hours
  steps: number;
  mood: number; // 1-5
  energy: number; // 1-5
  workout: number; // minutes
}

export type HealthLog = Record<string, Partial<DayHealth>>;

/* ---------------- focus ---------------- */

export interface FocusSession {
  id: string;
  date: string;
  minutes: number;
  label: string;
}

/* ---------------- calendar ---------------- */

export interface CalEvent {
  id: string;
  title: string;
  /** First (or only) occurrence day, ISO. */
  date: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  color: number; // series slot 1-5
  location?: string;
  kind: "class" | "event" | "exam" | "block";
  recur: "none" | "daily" | "weekly";
  recurUntil?: string;
  notes?: string;
}

/* ---------------- study ---------------- */

export interface Subject {
  id: string;
  name: string;
  code?: string;
  credits: number;
  /** 10-point grade, set once known — used for CGPA. */
  gradePoint?: number;
  attended: number;
  totalClasses: number;
  color: number;
}

export interface Flashcard {
  id: string;
  deck: string;
  front: string;
  back: string;
  ease: number; // 1.3 – 3.0
  interval: number; // days
  due: string; // ISO day
  reps: number;
}

/* ---------------- notes ---------------- */

export interface Note {
  id: string;
  title: string;
  content: string; // markdown-lite with [[wiki links]]
  pinned?: boolean;
  updatedAt: string;
}

/* ---------------- assistant chat ---------------- */

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string; // ISO datetime
  source?: "claude" | "gemini" | "local";
}

/* ---------------- insights ---------------- */

export interface Insight {
  id: string;
  tone: "win" | "warn" | "tip";
  title: string;
  body: string;
  href: string;
}

export interface AxisScore {
  area: LifeArea;
  label: string;
  score: number; // 0-100
}

/* ---------------- category metadata ---------------- */

export const CATEGORY_META: Record<
  CategoryId,
  { label: string; icon: string; kind: "expense" | "income" }
> = {
  food: { label: "Food & dining", icon: "UtensilsCrossed", kind: "expense" },
  groceries: { label: "Groceries", icon: "ShoppingBasket", kind: "expense" },
  transport: { label: "Transport", icon: "Bus", kind: "expense" },
  shopping: { label: "Shopping", icon: "ShoppingBag", kind: "expense" },
  bills: { label: "Bills & utilities", icon: "ReceiptText", kind: "expense" },
  rent: { label: "Rent", icon: "Home", kind: "expense" },
  subscriptions: { label: "Subscriptions", icon: "RefreshCw", kind: "expense" },
  entertainment: { label: "Entertainment", icon: "Clapperboard", kind: "expense" },
  health: { label: "Health", icon: "HeartPulse", kind: "expense" },
  education: { label: "Education", icon: "GraduationCap", kind: "expense" },
  travel: { label: "Travel", icon: "Plane", kind: "expense" },
  other: { label: "Other", icon: "CircleEllipsis", kind: "expense" },
  salary: { label: "Salary", icon: "Banknote", kind: "income" },
  freelance: { label: "Freelance", icon: "Laptop", kind: "income" },
  investment: { label: "Investment", icon: "TrendingUp", kind: "income" },
};

export const AREA_LABELS: Record<LifeArea, string> = {
  health: "Health",
  money: "Money",
  learning: "Learning",
  career: "Career",
  relationships: "Relationships",
  mindfulness: "Mindfulness",
  fitness: "Fitness",
  productivity: "Productivity",
  creativity: "Creativity",
};
