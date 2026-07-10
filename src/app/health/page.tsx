"use client";

import { AreaTrend, Bars } from "@/components/charts";
import {
  GlassCard,
  PageHeader,
  ProgressRing,
  SectionTitle,
  inputCls,
  stagger,
} from "@/components/ui";
import { healthAvg } from "@/lib/insights";
import { useLife } from "@/lib/store";
import { cn, fmtNum, lastNDates, mean, todayISO } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  BatteryCharging,
  Droplets,
  Dumbbell,
  Footprints,
  Minus,
  Moon,
  Plus,
  Smile,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

export default function HealthPage() {
  const { health, logHealth } = useLife();
  const today = todayISO();
  const h = health[today] ?? {};
  const water = h.water ?? 0;
  const sleep = h.sleep ?? 0;
  const steps = h.steps ?? 0;
  const workout = h.workout ?? 0;
  const mood = h.mood ?? 0;
  const energy = h.energy ?? 0;

  const sleepTrend = lastNDates(14).map((d) => ({
    label: d.slice(8),
    value: health[d]?.sleep ?? 0,
  }));
  const stepBars = lastNDates(14).map((d) => ({
    label: d.slice(8),
    value: health[d]?.steps ?? 0,
  }));

  /* correlation: sleep on workout days vs rest days */
  const correlation = useMemo(() => {
    const withW: number[] = [];
    const withoutW: number[] = [];
    for (const d of lastNDates(30)) {
      const day = health[d];
      if (!day?.sleep) continue;
      if ((day.workout ?? 0) > 0) withW.push(day.sleep);
      else withoutW.push(day.sleep);
    }
    if (withW.length < 3 || withoutW.length < 3) return null;
    const diff = mean(withW) - mean(withoutW);
    return { diff, withW: mean(withW), withoutW: mean(withoutW) };
  }, [health]);

  const sleepAvg = healthAvg(health, "sleep", 7);
  const stepsAvg = healthAvg(health, "steps", 7);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Health"
        title="Take care of the"
        accent="machine"
        subtitle="Water, sleep, movement and mood — logged in seconds, understood over months."
      />

      {/* rings + quick log */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <GlassCard className="p-5 xl:col-span-7">
          <SectionTitle>Today</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <RingStat
              value={water / 8}
              color="var(--s5)"
              icon={<Droplets className="size-4" aria-hidden />}
              label="water"
              display={`${water}/8`}
            />
            <RingStat
              value={sleep / 8}
              color="var(--s1)"
              icon={<Moon className="size-4" aria-hidden />}
              label="sleep"
              display={sleep ? `${sleep}h` : "—"}
            />
            <RingStat
              value={steps / 9000}
              color="var(--s2)"
              icon={<Footprints className="size-4" aria-hidden />}
              label="steps"
              display={fmtNum(steps)}
            />
            <RingStat
              value={workout / 45}
              color="var(--s4)"
              icon={<Dumbbell className="size-4" aria-hidden />}
              label="workout"
              display={`${workout}m`}
            />
          </div>

          {/* water stepper */}
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-line bg-card p-3">
            <span className="flex items-center gap-2 text-sm font-medium text-ink-2">
              <Droplets className="size-4 text-[var(--s5)]" aria-hidden /> Water
            </span>
            <div className="flex items-center gap-3">
              <button
                aria-label="Remove a glass"
                onClick={() => logHealth(today, { water: Math.max(0, water - 1) })}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <div className="flex gap-1" aria-label={`${water} of 8 glasses`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-6 w-2.5 rounded-full transition-colors",
                      i < water ? "bg-[var(--s5)]" : "bg-line",
                    )}
                  />
                ))}
              </div>
              <button
                aria-label="Add a glass"
                onClick={() => logHealth(today, { water: Math.min(12, water + 1) })}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-strong"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          {/* numeric loggers */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <NumField
              id="log-sleep"
              label="Sleep (h)"
              value={sleep || ""}
              step="0.1"
              onChange={(v) => logHealth(today, { sleep: v })}
            />
            <NumField
              id="log-steps"
              label="Steps"
              value={steps || ""}
              step="100"
              onChange={(v) => logHealth(today, { steps: v })}
            />
            <NumField
              id="log-workout"
              label="Workout (min)"
              value={workout || ""}
              step="5"
              onChange={(v) => logHealth(today, { workout: v })}
            />
          </div>

          {/* mood + energy */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <ScalePicker
              label="Mood"
              icon={<Smile className="size-3.5" aria-hidden />}
              value={mood}
              onChange={(v) => logHealth(today, { mood: v })}
            />
            <ScalePicker
              label="Energy"
              icon={<BatteryCharging className="size-3.5" aria-hidden />}
              value={energy}
              onChange={(v) => logHealth(today, { energy: v })}
            />
          </div>
        </GlassCard>

        {/* weekly summary + correlation */}
        <div className="space-y-4 xl:col-span-5">
          <GlassCard className="p-5">
            <SectionTitle>This week</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-ink">
                  {sleepAvg.toFixed(1)}h
                </p>
                <p className="text-xs text-ink-3">avg sleep</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-ink">
                  {fmtNum(stepsAvg)}
                </p>
                <p className="text-xs text-ink-3">avg steps</p>
              </div>
            </div>
          </GlassCard>

          {correlation && (
            <GlassCard className="border-accent-soft p-5">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>
                  <strong className="text-ink">
                    You sleep {Math.abs(correlation.diff).toFixed(1)}h {correlation.diff > 0 ? "more" : "less"} on workout days
                  </strong>{" "}
                  — {correlation.withW.toFixed(1)}h after training vs {correlation.withoutW.toFixed(1)}h on rest days, over the last month.
                </span>
              </p>
            </GlassCard>
          )}

          <GlassCard className="p-5">
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                <Activity className="size-3.5" aria-hidden /> Integrations
              </span>
            </SectionTitle>
            <p className="text-sm leading-relaxed text-ink-3">
              Apple Health, Google Fit and Health Connect sync are on the roadmap — today&apos;s numbers are logged by hand and stored on your device.
            </p>
          </GlassCard>
        </div>
      </div>

      {/* trends */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GlassCard className="p-5">
          <SectionTitle>Sleep, last 14 nights</SectionTitle>
          <AreaTrend
            points={sleepTrend}
            height={170}
            color="var(--s1)"
            fmt={(n) => `${n.toFixed(1)}h`}
            xEvery={2}
            id="sleep-trend"
          />
        </GlassCard>
        <GlassCard className="p-5">
          <SectionTitle>Steps, last 14 days</SectionTitle>
          <Bars data={stepBars} height={170} color="var(--s2)" fmt={fmtNum} labelEvery={2} />
        </GlassCard>
      </div>
    </motion.div>
  );
}

function RingStat({
  value,
  color,
  icon,
  label,
  display,
}: {
  value: number;
  color: string;
  icon: React.ReactNode;
  label: string;
  display: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ProgressRing
        value={value}
        size={68}
        stroke={6}
        color={color}
        label={<span style={{ color }}>{icon}</span>}
      />
      <span className="text-sm font-semibold text-ink">{display}</span>
      <span className="text-[10px] uppercase tracking-wider text-ink-3">{label}</span>
    </div>
  );
}

function NumField({
  id,
  label,
  value,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number | "";
  step: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-2" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        className={inputCls}
      />
    </div>
  );
}

function ScalePicker({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-2">
        {icon} {label}
      </p>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            aria-label={`${label} ${v} of 5`}
            onClick={() => onChange(v)}
            className={cn(
              "h-8 flex-1 cursor-pointer rounded-lg border text-xs font-semibold transition-colors",
              value >= v
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-ink-3 hover:text-ink",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
