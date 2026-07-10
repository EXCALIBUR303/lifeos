"use client";

import { AreaTrend, Bars, Donut } from "@/components/charts";
import {
  Btn,
  DynIcon,
  GlassCard,
  MeterBar,
  PageHeader,
  SectionTitle,
  StatTile,
  inputCls,
  stagger,
} from "@/components/ui";
import { monthIncome, monthSpend, prevMonthKeys } from "@/lib/insights";
import { useLife } from "@/lib/store";
import { CATEGORY_META, CategoryId } from "@/lib/types";
import {
  cn,
  fmtMoney,
  fmtMoneyCompact,
  lastNDates,
  monthKey,
  monthLabel,
  prettyDate,
  relativeDay,
  sum,
  todayISO,
} from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

export default function ExpensesPage() {
  const { transactions, budgets, addTransaction, deleteTransaction } = useLife();
  const [adding, setAdding] = useState(false);
  const today = todayISO();
  const mk = monthKey(today);
  const prevMk = prevMonthKeys(1)[0];

  const spendMTD = monthSpend(transactions, mk);
  const spendPrev = monthSpend(transactions, prevMk);
  const income = monthIncome(transactions, mk);
  const saved = income - spendMTD;

  const subs = sum(
    transactions
      .filter((t) => t.recurring && t.kind === "expense" && monthKey(t.date) === mk && (t.category === "subscriptions" || t.category === "bills"))
      .map((t) => t.amount),
  );

  /* category breakdown for donut */
  const catTotals = new Map<CategoryId, number>();
  for (const t of transactions)
    if (t.kind === "expense" && monthKey(t.date) === mk)
      catTotals.set(t.category, (catTotals.get(t.category) ?? 0) + t.amount);
  const sortedCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
  const restTotal = sum(sortedCats.slice(4).map(([, v]) => v));
  const byCat = sortedCats.slice(0, 4).map(([cat, v], i) => ({
    label: CATEGORY_META[cat].label,
    value: v,
    color: SERIES[i],
    cat,
  }));
  if (restTotal > 0)
    byCat.push({ label: "Other", value: restTotal, color: "var(--ink-3)", cat: "other" as CategoryId });

  /* six-month bars */
  const monthly = [...prevMonthKeys(5).reverse(), mk].map((k) => ({
    label: monthLabel(k).split(" ")[0],
    value: monthSpend(transactions, k),
  }));

  /* 30-day trend */
  const trend = lastNDates(30).map((d) => ({
    label: d.slice(8),
    value: sum(transactions.filter((t) => t.kind === "expense" && t.date === d).map((t) => t.amount)),
  }));

  /* grouped recent transactions */
  const groups = new Map<string, typeof transactions>();
  for (const t of [...transactions].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 24)) {
    const g = groups.get(t.date) ?? [];
    g.push(t);
    groups.set(t.date, g);
  }
  const recent = [...groups.entries()];

  const budgetRows = (Object.entries(budgets) as [CategoryId, number][]).sort(
    (a, b) => monthSpend(transactions, mk, b[0]) / b[1] - monthSpend(transactions, mk, a[0]) / a[1],
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Money"
        title="Where it"
        accent="flows"
        subtitle="Every rupee accounted for — spending, income, budgets and the patterns between them."
        actions={
          <Btn onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Add transaction
          </Btn>
        }
      />

      {/* stat tiles */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="Spent this month"
          value={fmtMoneyCompact(spendMTD)}
          delta={spendPrev > 0 ? `${spendMTD <= spendPrev ? "↓" : "↑"} vs ${fmtMoneyCompact(spendPrev)} last month` : undefined}
          deltaGood={spendMTD <= spendPrev}
        />
        <StatTile label="Income" value={fmtMoneyCompact(income)} delta="salary + freelance" />
        <StatTile
          label="Saved"
          value={fmtMoneyCompact(Math.max(0, saved))}
          delta={income > 0 ? `${Math.max(0, Math.round((saved / income) * 100))}% of income` : undefined}
          deltaGood={saved > 0}
        />
        <StatTile label="Recurring bills" value={fmtMoneyCompact(subs)} delta="subscriptions & utilities" />
      </div>

      {/* charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <GlassCard className="p-5 xl:col-span-4">
          <SectionTitle>By category</SectionTitle>
          <div className="flex flex-col items-center gap-4">
            <Donut
              slices={byCat}
              center={
                <>
                  <span className="text-[11px] font-medium text-ink-3">this month</span>
                  <span className="text-lg font-semibold text-ink">{fmtMoneyCompact(spendMTD)}</span>
                </>
              }
            />
            <ul className="w-full space-y-1.5" aria-label="Category legend">
              {byCat.map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="flex-1 text-ink-2">{s.label}</span>
                  <span className="font-medium text-ink">{fmtMoney(s.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>

        <GlassCard className="p-5 xl:col-span-8">
          <SectionTitle>Daily spend, last 30 days</SectionTitle>
          <AreaTrend points={trend} height={190} fmt={fmtMoneyCompact} xEvery={7} id="money-trend" />
          <SectionTitle>
            <span className="mt-4 block">Six-month view</span>
          </SectionTitle>
          <Bars data={monthly} height={150} fmt={fmtMoneyCompact} color="var(--s2)" />
        </GlassCard>
      </div>

      {/* budgets + transactions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GlassCard className="p-5">
          <SectionTitle>Budgets</SectionTitle>
          <ul className="space-y-3.5">
            {budgetRows.map(([cat, amount], i) => {
              const spent = monthSpend(transactions, mk, cat);
              const over = spent > amount;
              return (
                <li key={cat}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-card text-ink-3">
                      <DynIcon name={CATEGORY_META[cat].icon} className="size-3.5" />
                    </span>
                    <span className="flex-1 text-ink-2">{CATEGORY_META[cat].label}</span>
                    <span className={cn("font-medium", over ? "text-bad" : "text-ink")}>
                      {fmtMoney(spent)}
                      <span className="font-normal text-ink-3"> / {fmtMoney(amount)}</span>
                    </span>
                  </div>
                  <MeterBar value={spent} max={amount} over={over} color={SERIES[i % SERIES.length]} />
                </li>
              );
            })}
          </ul>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionTitle>Recent activity</SectionTitle>
          <div className="max-h-[460px] space-y-4 overflow-y-auto pr-1 thin-scroll">
            {recent.map(([date, txs]) => (
              <div key={date}>
                <p className="mb-1.5 text-xs font-medium text-ink-3">{relativeDay(date) === prettyDate(date) ? prettyDate(date) : relativeDay(date)}</p>
                <ul className="space-y-1">
                  <AnimatePresence initial={false}>
                    {txs.map((t) => (
                      <motion.li
                        key={t.id}
                        layout
                        exit={{ opacity: 0, x: -16 }}
                        className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-card-hover"
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-xl",
                            t.kind === "income" ? "bg-good-soft text-good" : "bg-card text-ink-3",
                          )}
                        >
                          <DynIcon name={CATEGORY_META[t.category].icon} className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">{t.note}</span>
                          <span className="text-[11px] text-ink-3">
                            {CATEGORY_META[t.category].label}
                            {t.recurring && " · recurring"}
                          </span>
                        </span>
                        <span className={cn("text-sm font-semibold", t.kind === "income" ? "text-good" : "text-ink")}>
                          {t.kind === "income" ? "+" : "−"}
                          {fmtMoney(t.amount)}
                        </span>
                        <button
                          aria-label={`Delete ${t.note}`}
                          onClick={() => deleteTransaction(t.id)}
                          className="cursor-pointer text-ink-3 opacity-0 transition-opacity hover:text-bad group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <AnimatePresence>
        {adding && (
          <AddTxModal
            onClose={() => setAdding(false)}
            onAdd={(t) => {
              addTransaction(t);
              setAdding(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddTxModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: {
    date: string;
    amount: number;
    kind: "expense" | "income";
    category: CategoryId;
    note: string;
  }) => void;
}) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryId>("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());

  const cats = (Object.entries(CATEGORY_META) as [CategoryId, (typeof CATEGORY_META)[CategoryId]][]).filter(
    ([, m]) => m.kind === kind,
  );

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !note.trim()) return;
    onAdd({ date, amount: amt, kind, category, note: note.trim() });
  };

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
        aria-label="Add transaction"
        className="glass-strong w-full max-w-md rounded-2xl p-5"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Add transaction</h2>
          <button aria-label="Close" onClick={onClose} className="cursor-pointer text-ink-3 hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setKind(k);
                setCategory(k === "expense" ? "food" : "salary");
              }}
              aria-pressed={kind === k}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors",
                kind === k
                  ? k === "expense"
                    ? "border-bad-soft bg-bad-soft text-bad"
                    : "border-good-soft bg-good-soft text-good"
                  : "border-line text-ink-3 hover:text-ink",
              )}
            >
              {k === "expense" ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownLeft className="size-4" aria-hidden />}
              {k === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="tx-amount">Amount (₹)</label>
        <input
          id="tx-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          placeholder="450"
          className={inputCls}
          autoFocus
        />

        <label className="mb-1 mt-3 block text-xs font-medium text-ink-2" htmlFor="tx-note">Note</label>
        <input
          id="tx-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Dinner with friends"
          className={inputCls}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="tx-cat">Category</label>
            <select
              id="tx-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryId)}
              className={inputCls}
            >
              {cats.map(([id, m]) => (
                <option key={id} value={id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor="tx-date">Date</label>
            <input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <Btn className="mt-5 w-full" onClick={submit} disabled={!parseFloat(amount) || !note.trim()}>
          Save
        </Btn>
      </motion.div>
    </motion.div>
  );
}
