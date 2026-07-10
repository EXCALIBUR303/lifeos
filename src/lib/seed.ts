import {
  Budgets,
  CalEvent,
  DayHealth,
  Flashcard,
  FocusSession,
  Goal,
  Habit,
  HealthLog,
  JournalEntry,
  Note,
  Subject,
  Task,
  Transaction,
} from "./types";
import { addDays, toISO, todayISO, uid } from "./utils";

/** Deterministic RNG so demo data is organic but stable across reloads. */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 200;

export interface SeedData {
  tasks: Task[];
  habits: Habit[];
  transactions: Transaction[];
  budgets: Budgets;
  goals: Goal[];
  journal: JournalEntry[];
  health: HealthLog;
  focus: FocusSession[];
  events: CalEvent[];
  subjects: Subject[];
  flashcards: Flashcard[];
  notes: Note[];
}

export function seed(): SeedData {
  const rnd = mulberry32(20260709);
  const now = new Date();
  const today = todayISO();
  const day = (offset: number) => toISO(addDays(now, offset));
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const between = (a: number, b: number) => a + rnd() * (b - a);

  /* ---------------- habits ---------------- */

  const habitDefs = [
    { name: "Meditate 10 min", icon: "Flower2", color: 1, cadence: [0, 1, 2, 3, 4, 5, 6], rate: 0.86, recent: 0.95 },
    { name: "Workout", icon: "Dumbbell", color: 4, cadence: [1, 2, 3, 4, 5], rate: 0.72, recent: 0.8 },
    { name: "Read 30 min", icon: "BookOpen", color: 3, cadence: [0, 1, 2, 3, 4, 5, 6], rate: 0.8, recent: 0.42 },
    { name: "Code practice", icon: "Code2", color: 5, cadence: [1, 2, 3, 4, 5], rate: 0.83, recent: 0.9 },
    { name: "Sleep by 11:30", icon: "MoonStar", color: 2, cadence: [0, 1, 2, 3, 4, 5, 6], rate: 0.65, recent: 0.6 },
    { name: "Call home", icon: "Phone", color: 1, cadence: [0, 3, 6], rate: 0.85, recent: 0.9 },
  ];

  const habits: Habit[] = habitDefs.map((h) => {
    const history: string[] = [];
    for (let i = DAYS; i >= 0; i--) {
      const d = addDays(now, -i);
      if (!h.cadence.includes(d.getDay())) continue;
      const p = i <= 14 ? h.recent : h.rate;
      // guarantee live streaks for the well-kept habits
      if (i <= 6 && h.recent >= 0.85) history.push(toISO(d));
      else if (rnd() < p) history.push(toISO(d));
    }
    return {
      id: uid(),
      name: h.name,
      icon: h.icon,
      color: h.color,
      cadence: h.cadence,
      history,
      createdAt: day(-DAYS),
    };
  });

  /* ---------------- money ---------------- */

  const transactions: Transaction[] = [];
  const tx = (t: Omit<Transaction, "id">) =>
    transactions.push({ id: uid(), ...t });

  for (let i = DAYS; i >= 0; i--) {
    const d = addDays(now, -i);
    const iso = toISO(d);
    const dom = d.getDate();

    // recurring
    if (dom === 1) tx({ date: iso, amount: 85000, kind: "income", category: "salary", note: "Salary", recurring: true });
    if (dom === 2) tx({ date: iso, amount: 22000, kind: "expense", category: "rent", note: "Rent", recurring: true });
    if (dom === 5) tx({ date: iso, amount: 10000, kind: "expense", category: "investment", note: "Index fund SIP", recurring: true });
    if (dom === 3) tx({ date: iso, amount: 1500, kind: "expense", category: "health", note: "Gym membership", recurring: true });
    if (dom === 7) tx({ date: iso, amount: 649, kind: "expense", category: "subscriptions", note: "Netflix", recurring: true });
    if (dom === 11) tx({ date: iso, amount: 119, kind: "expense", category: "subscriptions", note: "Spotify", recurring: true });
    if (dom === 15) tx({ date: iso, amount: 399, kind: "expense", category: "bills", note: "Mobile plan", recurring: true });
    if (dom === 18) tx({ date: iso, amount: 799, kind: "expense", category: "bills", note: "Broadband", recurring: true });

    // day-to-day spending
    if (rnd() < 0.75)
      tx({
        date: iso,
        amount: Math.round(between(120, 650)),
        kind: "expense",
        category: "food",
        note: pick(["Lunch out", "Coffee", "Dinner with friends", "Swiggy order", "Chai & snacks"]),
      });
    if (rnd() < 0.35)
      tx({
        date: iso,
        amount: Math.round(between(300, 1400)),
        kind: "expense",
        category: "groceries",
        note: pick(["BigBasket", "Local market", "Blinkit run"]),
      });
    if (rnd() < 0.5)
      tx({
        date: iso,
        amount: Math.round(between(60, 400)),
        kind: "expense",
        category: "transport",
        note: pick(["Metro", "Uber", "Auto", "Fuel"]),
      });
    if (rnd() < 0.12)
      tx({
        date: iso,
        amount: Math.round(between(400, 2600)),
        kind: "expense",
        category: "shopping",
        note: pick(["Amazon order", "Clothes", "Stationery", "Gadget accessories"]),
      });
    if (rnd() < 0.12)
      tx({
        date: iso,
        amount: Math.round(between(200, 900)),
        kind: "expense",
        category: "entertainment",
        note: pick(["Movie night", "Gaming", "Concert ticket", "Bowling"]),
      });
    if (rnd() < 0.05)
      tx({
        date: iso,
        amount: Math.round(between(3000, 9000)),
        kind: "income",
        category: "freelance",
        note: "Freelance project",
      });
  }

  // this-month anomaly for the unusual-spending detector
  tx({ date: day(-3), amount: 14999, kind: "expense", category: "shopping", note: "Noise-cancelling headphones" });

  const budgets: Budgets = {
    food: 10000,
    groceries: 9000,
    transport: 4500,
    shopping: 6000,
    entertainment: 3500,
    subscriptions: 1500,
    health: 2500,
    bills: 1500,
    rent: 22000,
    education: 3000,
  };

  /* ---------------- tasks ---------------- */

  const tasks: Task[] = [
    { id: uid(), title: "Submit DBMS assignment", status: "todo", priority: "urgent", due: today, dueTime: "21:00", tags: ["college"], createdAt: day(-4), notes: "Normalization + ER diagram. Upload PDF to portal." },
    { id: uid(), title: "Review ML lecture notes", status: "todo", priority: "high", due: today, tags: ["college", "study"], createdAt: day(-2) },
    { id: uid(), title: "Pay electricity bill", status: "todo", priority: "medium", due: day(1), tags: ["home"], createdAt: day(-1) },
    { id: uid(), title: "Refactor robot gait controller", status: "doing", priority: "high", due: day(2), tags: ["robot-dog", "project"], createdAt: day(-6), notes: "Phase 2: sim-to-real transfer prep." },
    { id: uid(), title: "Book dentist appointment", status: "todo", priority: "low", due: day(4), tags: ["health"], createdAt: day(-3) },
    { id: uid(), title: "Prepare OS viva answers", status: "doing", priority: "high", due: day(3), tags: ["college", "study"], createdAt: day(-2) },
    { id: uid(), title: "Plan weekend trek", status: "todo", priority: "low", due: day(6), tags: ["personal"], createdAt: day(-1) },
    { id: uid(), title: "Update resume with RL project", status: "todo", priority: "medium", due: day(8), tags: ["career"], createdAt: day(-5) },
    { id: uid(), title: "Finish reading Deep Work ch. 4", status: "done", priority: "medium", tags: ["reading"], createdAt: day(-8), completedAt: day(-1) },
    { id: uid(), title: "Set up quadruped URDF in Isaac Sim", status: "done", priority: "high", tags: ["robot-dog", "project"], createdAt: day(-12), completedAt: day(-2) },
    { id: uid(), title: "Split hostel electricity bill", status: "done", priority: "low", tags: ["money"], createdAt: day(-4), completedAt: day(-3) },
    { id: uid(), title: "Email professor about project extension", status: "done", priority: "urgent", tags: ["college"], createdAt: day(-3), completedAt: day(-2) },
  ];

  /* ---------------- goals ---------------- */

  const ms = (titles: [string, boolean][]): Goal["milestones"] =>
    titles.map(([title, done]) => ({ id: uid(), title, done }));

  const goals: Goal[] = [
    {
      id: uid(),
      title: "Build a robot dog that walks outdoors",
      why: "The project that ties together everything I'm learning.",
      area: "career",
      horizon: "long",
      deadline: day(140),
      createdAt: day(-90),
      milestones: ms([
        ["Phase 1 — RL trot gait in simulation", true],
        ["Phase 2 — sim-to-real transfer on hardware", false],
        ["Phase 3 — outdoor terrain robustness", false],
        ["Phase 4 — autonomous navigation demo", false],
      ]),
    },
    {
      id: uid(),
      title: "Run a 10K",
      area: "fitness",
      horizon: "short",
      deadline: day(75),
      createdAt: day(-40),
      milestones: ms([
        ["Run 3K without stopping", true],
        ["Run 5K under 35 min", true],
        ["Run 8K long run", false],
        ["Race day — 10K", false],
      ]),
    },
    {
      id: uid(),
      title: "Read 24 books this year",
      area: "learning",
      horizon: "long",
      deadline: day(175),
      createdAt: day(-190),
      milestones: ms([
        ["6 books by March", true],
        ["12 books by June", true],
        ["18 books by September", false],
        ["24 books by December", false],
      ]),
    },
    {
      id: uid(),
      title: "Save ₹3L emergency fund",
      area: "money",
      horizon: "long",
      deadline: day(200),
      createdAt: day(-100),
      milestones: ms([
        ["₹75K saved", true],
        ["₹1.5L saved", true],
        ["₹2.25L saved", false],
        ["₹3L saved", false],
      ]),
    },
    {
      id: uid(),
      title: "9+ CGPA this semester",
      area: "productivity",
      horizon: "short",
      deadline: day(120),
      createdAt: day(-60),
      milestones: ms([
        ["All assignments on time (month 1)", true],
        ["Mid-sems ≥ 85%", false],
        ["Projects submitted early", false],
        ["End-sems ≥ 90%", false],
      ]),
    },
    {
      id: uid(),
      title: "Solo trip to Japan",
      why: "See the robots. Eat the ramen. Ride the Shinkansen.",
      area: "creativity",
      horizon: "dream",
      createdAt: day(-150),
      milestones: ms([
        ["Passport renewed", true],
        ["Save ₹1.8L trip fund", false],
        ["Learn basic Japanese phrases", false],
        ["Plan 10-day itinerary", false],
      ]),
    },
  ];

  /* ---------------- journal ---------------- */

  const journalSeeds: Array<[number, JournalEntry["mood"], string, string, string[]]> = [
    [-1, 4, "Gait finally converged", "The trot policy stopped collapsing after I fixed the reward shaping. Watched the sim dog walk 40 metres without falling. Screamed a little.", ["Working reward function", "Chai at 2am", "Patient friends"]],
    [-2, 3, "Long college day", "Three lectures back to back and a surprise quiz. Managed to hit the gym anyway, which saved the day mentally.", ["Gym session", "Quiz went okay"]],
    [-4, 5, "Best run yet", "5K in 33:40! Legs were dead by the end but the sunrise over the lake was unreal. I get why people become morning people.", ["Cool morning air", "New personal best", "Good playlist"]],
    [-6, 2, "Overwhelmed", "Too many deadlines landing in the same week. Skipped reading again. Need to plan the week on Sunday instead of winging it.", ["Roommate made dinner"]],
    [-8, 4, "Deep work actually works", "Two 50-minute focus blocks before lunch and the DBMS assignment is basically done. Phone in the other room is the whole trick.", ["Quiet library corner", "Finished early"]],
    [-11, 3, "Called home", "Talked to Ma for an hour. Dadi's knee is better. Felt lighter after — should not let two weeks pass between calls again.", ["Family", "Ma's laugh"]],
    [-13, 4, "Small wins", "Cleared my inbox, fixed the URDF joint limits, and cooked instead of ordering. Boring day on paper, great day in practice.", ["Home-cooked food", "Clean inbox"]],
    [-16, 3, "Rain day", "Campus flooded, classes online. Used the found time to read 60 pages. The reading goal might survive this semester after all.", ["Rain sounds", "Extra reading time"]],
    [-19, 5, "Robot dog stands!", "First successful standing policy on the real hardware. It wobbles like a newborn deer but IT STANDS. Phase 2 has officially begun.", ["The team", "Motors that didn't burn", "That first wobble"]],
    [-22, 3, "Reset day", "Slept in, long walk, meal prepped for the week. No screens after 9. I should protect one day like this every week.", ["Slow morning", "Meal prep done"]],
  ];

  const journal: JournalEntry[] = journalSeeds.map(([offset, mood, title, content, gratitude]) => ({
    id: uid(),
    date: day(offset),
    mood,
    title,
    content,
    gratitude,
  }));

  /* ---------------- health ---------------- */

  const health: HealthLog = {};
  for (let i = DAYS; i >= 0; i--) {
    const d = addDays(now, -i);
    const iso = toISO(d);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const recentCrunch = i <= 10; // slightly rougher sleep lately
    const workoutDay = habits[1].history.includes(iso);
    const entry: DayHealth = {
      water: Math.round(between(4, 8)),
      sleep: Number(
        (recentCrunch ? between(5.7, 7.2) : between(6.3, 8.4)).toFixed(1),
      ),
      steps: Math.round(weekend ? between(3000, 9000) : between(4500, 12000)),
      mood: Math.round(between(2.4, 5)) as DayHealth["mood"],
      energy: Math.round(between(2, 5)),
      workout: workoutDay ? Math.round(between(30, 70)) : 0,
    };
    health[iso] = entry;
  }
  // today starts partially logged
  health[today] = { water: 3, steps: 4200, sleep: 6.4, mood: 4, energy: 3, workout: 0 };

  /* ---------------- focus ---------------- */

  const focus: FocusSession[] = [];
  const focusLabels = ["Deep work", "DSA practice", "Robot dog", "Reading", "College prep"];
  for (let i = 45; i >= 1; i--) {
    const iso = day(-i);
    const sessions = Math.floor(between(0, 4.2));
    for (let s = 0; s < sessions; s++) {
      focus.push({
        id: uid(),
        date: iso,
        minutes: pick([25, 25, 50, 50, 90]),
        label: pick(focusLabels),
      });
    }
  }
  focus.push({ id: uid(), date: today, minutes: 50, label: "Deep work" });

  /* ---------------- study ---------------- */

  const subjects: Subject[] = [
    { id: uid(), name: "Database Systems", code: "CS304", credits: 4, attended: 28, totalClasses: 32, color: 1 },
    { id: uid(), name: "Operating Systems", code: "CS302", credits: 4, attended: 24, totalClasses: 31, color: 2 },
    { id: uid(), name: "Machine Learning", code: "CS420", credits: 3, attended: 27, totalClasses: 30, color: 4 },
    { id: uid(), name: "Robotics Lab", code: "RO310", credits: 2, gradePoint: 9, attended: 14, totalClasses: 15, color: 5 },
    { id: uid(), name: "Linear Algebra", code: "MA201", credits: 3, gradePoint: 8, attended: 22, totalClasses: 30, color: 3 },
  ];

  /* ---------------- calendar ---------------- */

  // helper: most recent occurrence of a weekday (0=Sun..6=Sat), looking back
  const lastWeekday = (dow: number) => {
    const d = new Date(now);
    while (d.getDay() !== dow) d.setDate(d.getDate() - 1);
    d.setDate(d.getDate() - 28); // anchor a month back so recurrence is established
    return toISO(d);
  };

  const semesterEnd = day(80);
  const events: CalEvent[] = [
    { id: uid(), title: "Database Systems", date: lastWeekday(1), start: "09:00", end: "10:30", color: 1, location: "LH-2", kind: "class", recur: "weekly", recurUntil: semesterEnd },
    { id: uid(), title: "Database Systems", date: lastWeekday(4), start: "09:00", end: "10:30", color: 1, location: "LH-2", kind: "class", recur: "weekly", recurUntil: semesterEnd },
    { id: uid(), title: "Operating Systems", date: lastWeekday(2), start: "11:00", end: "12:30", color: 2, location: "LH-1", kind: "class", recur: "weekly", recurUntil: semesterEnd },
    { id: uid(), title: "Operating Systems", date: lastWeekday(5), start: "11:00", end: "12:30", color: 2, location: "LH-1", kind: "class", recur: "weekly", recurUntil: semesterEnd },
    { id: uid(), title: "Machine Learning", date: lastWeekday(1), start: "14:00", end: "15:30", color: 4, location: "LH-4", kind: "class", recur: "weekly", recurUntil: semesterEnd },
    { id: uid(), title: "Machine Learning", date: lastWeekday(3), start: "14:00", end: "15:30", color: 4, location: "LH-4", kind: "class", recur: "weekly", recurUntil: semesterEnd },
    { id: uid(), title: "Linear Algebra", date: lastWeekday(2), start: "09:00", end: "10:00", color: 3, location: "LH-3", kind: "class", recur: "weekly", recurUntil: semesterEnd },
    { id: uid(), title: "Robotics Lab", date: lastWeekday(6), start: "10:00", end: "13:00", color: 5, location: "Mech Block", kind: "class", recur: "weekly", recurUntil: semesterEnd },
    { id: uid(), title: "Gym", date: lastWeekday(2), start: "18:00", end: "19:00", color: 4, kind: "block", recur: "weekly" },
    { id: uid(), title: "Gym", date: lastWeekday(4), start: "18:00", end: "19:00", color: 4, kind: "block", recur: "weekly" },
    { id: uid(), title: "Deep work — robot dog", date: lastWeekday(0), start: "10:00", end: "12:00", color: 1, kind: "block", recur: "weekly", notes: "Phase 2 hardware bring-up" },
    { id: uid(), title: "OS Mid-sem exam", date: day(5), start: "10:00", end: "12:00", color: 2, location: "Exam Hall B", kind: "exam", recur: "none" },
    { id: uid(), title: "DBMS Mid-sem exam", date: day(7), start: "10:00", end: "12:00", color: 1, location: "Exam Hall B", kind: "exam", recur: "none" },
    { id: uid(), title: "ML quiz 3", date: day(12), start: "14:00", end: "14:45", color: 4, location: "LH-4", kind: "exam", recur: "none" },
    { id: uid(), title: "Movie night with hostel gang", date: day(2), start: "20:00", end: "23:00", color: 3, kind: "event", recur: "none" },
    { id: uid(), title: "10K training run", date: day(3), start: "06:30", end: "07:30", color: 4, kind: "event", recur: "none" },
  ];

  /* ---------------- flashcards ---------------- */

  const card = (deck: string, front: string, back: string, dueOffset: number): Flashcard => ({
    id: uid(), deck, front, back,
    ease: 2.5, interval: Math.max(1, dueOffset + 1), due: day(dueOffset), reps: dueOffset < 0 ? 0 : 2,
  });

  const flashcards: Flashcard[] = [
    card("DBMS", "What does ACID stand for?", "Atomicity, Consistency, Isolation, Durability", 0),
    card("DBMS", "When is a relation in 3NF?", "In 2NF and no transitive dependency of non-prime attributes on any key", 0),
    card("DBMS", "Clustered vs non-clustered index?", "Clustered orders the physical rows (one per table); non-clustered is a separate structure pointing at rows", 1),
    card("OS", "What is a race condition?", "Outcome depends on unsynchronized timing of concurrent accesses to shared state", 0),
    card("OS", "Deadlock: four Coffman conditions?", "Mutual exclusion, hold & wait, no preemption, circular wait", 2),
    card("OS", "Paging vs segmentation?", "Paging: fixed-size frames, no external fragmentation. Segmentation: variable logical units, can fragment", 1),
    card("ML", "Bias-variance tradeoff?", "Simple models underfit (high bias); complex models overfit (high variance); tune capacity/regularization", 0),
    card("ML", "Why does L2 regularization shrink weights?", "Penalty λ‖w‖² adds 2λw to the gradient, pulling weights toward zero", 3),
    card("Robotics", "What is sim-to-real gap?", "Performance drop when policies trained in simulation meet unmodeled real-world dynamics", 0),
    card("Robotics", "PD control law?", "u = Kp·error + Kd·d(error)/dt — proportional pulls to target, derivative damps oscillation", 4),
  ];

  /* ---------------- notes ---------------- */

  const notes: Note[] = [
    {
      id: uid(),
      title: "Robot Dog Log",
      updatedAt: day(-1),
      pinned: true,
      content: `# Phase 2 — sim-to-real
Current status: standing policy works on hardware, trot transfers badly.

## What's failing
- Motor latency ~12ms unmodeled in sim
- Ground friction in sim too optimistic
- See [[Sim-to-Real Checklist]] before next flash

## Next
- Add actuator delay to sim
- Domain randomization on friction 0.4–1.1
- Log real IMU traces for comparison`,
    },
    {
      id: uid(),
      title: "Sim-to-Real Checklist",
      updatedAt: day(-3),
      content: `Before flashing any new policy:
- Torque limits set to 80% of spec
- Kill switch tested *twice*
- Battery above 40%
- Soft floor mats down
- Video recording on (for the [[Robot Dog Log]])
- One person on the e-stop at all times`,
    },
    {
      id: uid(),
      title: "Semester Plan",
      updatedAt: day(-5),
      pinned: true,
      content: `Target: **9+ CGPA** while shipping robot dog Phase 2.

## Weekly rhythm
- Mon/Wed ML problem sets same evening as lecture
- Tue/Fri OS reading before class
- Sat morning = Robotics Lab, afternoon = [[Robot Dog Log]] work
- Sun = weekly review + [[Reading List]]

Mid-sems in 1 week — prioritize OS and DBMS decks in flashcards.`,
    },
    {
      id: uid(),
      title: "Reading List",
      updatedAt: day(-9),
      content: `Currently reading: *Deep Work* (ch. 5)

Queue:
- Legged Robots That Balance — Raibert
- The Pragmatic Programmer
- Why We Sleep (after mid-sems, ironically)

Done this year: 13 books — tracking against the 24-book goal.`,
    },
  ];

  return {
    tasks, habits, transactions, budgets, goals, journal, health, focus,
    events, subjects, flashcards, notes,
  };
}
