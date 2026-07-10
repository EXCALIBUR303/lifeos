"use client";

import { cn } from "@/lib/utils";
import { motion, Variants } from "framer-motion";
import {
  Banknote,
  BookOpen,
  Bus,
  CircleEllipsis,
  Clapperboard,
  Code2,
  Dumbbell,
  Flower2,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  LucideIcon,
  MoonStar,
  Phone,
  Plane,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Sunrise,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { ReactNode } from "react";

/* ---------------- dynamic icons (habits & categories store icon names) ---------------- */

const ICONS: Record<string, LucideIcon> = {
  Flower2, Dumbbell, BookOpen, Code2, MoonStar, Phone, Sunrise,
  UtensilsCrossed, ShoppingBasket, Bus, ShoppingBag, ReceiptText, Home,
  RefreshCw, Clapperboard, HeartPulse, GraduationCap, Plane, CircleEllipsis,
  Banknote, Laptop, TrendingUp,
};

export function DynIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const I = ICONS[name] ?? Sparkles;
  return <I className={className} aria-hidden />;
}

/* ---------------- motion presets ---------------- */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

/* ---------------- surfaces ---------------- */

export function GlassCard({
  children,
  className,
  animate = true,
}: {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}) {
  if (!animate)
    return (
      <div className={cn("glass rounded-2xl", className)}>{children}</div>
    );
  return (
    <motion.div variants={fadeUp} className={cn("glass rounded-2xl", className)}>
      {children}
    </motion.div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-medium tracking-wide text-ink-2">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  /** the word rendered in the display serif */
  accent?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <motion.header
      variants={fadeUp}
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-ink-3">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}{" "}
          {accent && (
            <span className="text-display font-normal text-accent">{accent}</span>
          )}
        </h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.header>
  );
}

/* ---------------- controls ---------------- */

export function Btn({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "soft";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    primary:
      "bg-accent text-accent-ink hover:bg-accent-strong shadow-lg shadow-accent-soft",
    soft: "bg-accent-soft text-accent hover:bg-accent hover:text-accent-ink",
    ghost:
      "bg-transparent border border-line text-ink-2 hover:text-ink hover:border-line-strong hover:bg-card-hover",
    danger: "bg-bad-soft text-bad hover:bg-bad hover:text-white",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-accent";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="glass flex rounded-xl p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative min-h-8 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors duration-200",
            value === o.value ? "text-ink" : "text-ink-3 hover:text-ink-2",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId="seg-pill"
              className="absolute inset-0 rounded-lg bg-card-hover border border-line"
              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- data display ---------------- */

export function StatTile({
  label,
  value,
  delta,
  deltaGood,
  children,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaGood?: boolean;
  children?: ReactNode; // sparkline etc
  className?: string;
}) {
  return (
    <GlassCard className={cn("p-4", className)}>
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
        {children}
      </div>
      {delta && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            deltaGood === undefined ? "text-ink-3" : deltaGood ? "text-good" : "text-bad",
          )}
        >
          {delta}
        </p>
      )}
    </GlassCard>
  );
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  color = "var(--accent)",
  label,
  className,
}: {
  value: number; // 0-1
  size?: number;
  stroke?: number;
  color?: string;
  label?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {label !== undefined && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink">
          {label}
        </span>
      )}
    </div>
  );
}

export function MeterBar({
  value,
  max,
  color = "var(--accent)",
  over,
}: {
  value: number;
  max: number;
  color?: string;
  over?: boolean;
}) {
  const v = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: over ? "var(--bad-soft)" : "color-mix(in srgb, " + color + " 16%, transparent)" }}
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: over ? "var(--bad)" : color }}
        initial={{ width: 0 }}
        animate={{ width: `${v * 100}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        {icon}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-sm text-ink-3">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ToneDot({ tone }: { tone: "win" | "warn" | "tip" }) {
  const map = {
    win: "bg-good",
    warn: "bg-warn",
    tip: "bg-accent",
  } as const;
  return <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", map[tone])} aria-hidden />;
}
