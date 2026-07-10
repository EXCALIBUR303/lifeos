"use client";

import { fromISO, lastNDates, prettyDate } from "@/lib/utils";
import {
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/* ================= shared bits ================= */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

interface Tip {
  x: number;
  y: number;
  node: ReactNode;
}

function TipBox({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div
      className="glass-strong pointer-events-none absolute z-20 rounded-lg px-2.5 py-1.5 text-xs text-ink"
      style={{
        left: tip.x,
        top: tip.y,
        transform: "translate(-50%, calc(-100% - 10px))",
      }}
    >
      {tip.node}
    </div>
  );
}

/** Catmull-Rom → cubic bezier smooth path. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
    ];
    const c2: [number, number] = [
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
    ];
    d += ` C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const unit = max / pow;
  const step = unit <= 2 ? 0.5 * pow : unit <= 5 ? pow : 2 * pow;
  const top = Math.ceil(max / step) * step;
  return [0, top / 2, top];
}

/* ================= sparkline ================= */

export function Sparkline({
  data,
  w = 96,
  h = 32,
  color = "var(--accent)",
}: {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pts: [number, number][] = data.map((v, i) => [
    (i / (data.length - 1)) * (w - 8) + 4,
    h - 4 - ((v - min) / (max - min || 1)) * (h - 8),
  ]);
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <path
        d={smoothPath(pts)}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={color} stroke="var(--chart-surface)" strokeWidth={2} />
    </svg>
  );
}

/* ================= area trend ================= */

export function AreaTrend({
  points,
  height = 180,
  color = "var(--s1)",
  fmt = (n: number) => String(Math.round(n)),
  xEvery = 7,
  id = "area",
}: {
  points: { label: string; value: number }[];
  height?: number;
  color?: string;
  fmt?: (n: number) => string;
  xEvery?: number;
  id?: string;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [hoverI, setHoverI] = useState<number | null>(null);

  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 24;

  const max = Math.max(...points.map((p) => p.value), 1);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];

  const X = (i: number) =>
    padL + (i / Math.max(1, points.length - 1)) * (w - padL - padR);
  const Y = (v: number) => padT + (1 - v / top) * (height - padT - padB);

  const pts: [number, number][] = points.map((p, i) => [X(i), Y(p.value)]);
  const line = smoothPath(pts);
  const area =
    line +
    ` L ${X(points.length - 1)},${Y(0)} L ${X(0)},${Y(0)} Z`;

  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const mx = e.clientX - rect.left + padL;
    const i = Math.round(
      ((mx - padL) / (w - padL - padR)) * (points.length - 1),
    );
    const ci = Math.max(0, Math.min(points.length - 1, i));
    setHoverI(ci);
    setTip({
      x: X(ci),
      y: Y(points[ci].value),
      node: (
        <span>
          <span className="text-ink-3">{points[ci].label}</span>{" "}
          <strong>{fmt(points[ci].value)}</strong>
        </span>
      ),
    });
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Trend chart">
          <defs>
            <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={w - padR}
                y1={Y(t)}
                y2={Y(t)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={Y(t) + 3}
                textAnchor="end"
                fontSize={10}
                fill="var(--ink-3)"
              >
                {fmt(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % xEvery === 0 ? (
              <text
                key={i}
                x={X(i)}
                y={height - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--ink-3)"
              >
                {p.label}
              </text>
            ) : null,
          )}
          <path d={area} fill={`url(#${id}-g)`} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {hoverI !== null && (
            <line
              x1={X(hoverI)}
              x2={X(hoverI)}
              y1={padT}
              y2={height - padB}
              stroke="var(--axis)"
              strokeWidth={1}
            />
          )}
          <circle
            cx={pts[pts.length - 1][0]}
            cy={pts[pts.length - 1][1]}
            r={4}
            fill={color}
            stroke="var(--chart-surface)"
            strokeWidth={2}
          />
          {hoverI !== null && (
            <circle
              cx={X(hoverI)}
              cy={Y(points[hoverI].value)}
              r={4.5}
              fill={color}
              stroke="var(--chart-surface)"
              strokeWidth={2}
            />
          )}
          <rect
            x={padL}
            y={padT}
            width={Math.max(0, w - padL - padR)}
            height={height - padT - padB}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => {
              setTip(null);
              setHoverI(null);
            }}
          />
        </svg>
      )}
      <TipBox tip={tip} />
    </div>
  );
}

/* ================= bar chart ================= */

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M ${x},${y + h} V ${y + rr} Q ${x},${y} ${x + rr},${y} H ${x + w - rr} Q ${x + w},${y} ${x + w},${y + rr} V ${y + h} Z`;
}

export function Bars({
  data,
  height = 160,
  color = "var(--s1)",
  fmt = (n: number) => String(Math.round(n)),
  labelEvery = 1,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  color?: string;
  fmt?: (n: number) => string;
  labelEvery?: number;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [hoverI, setHoverI] = useState<number | null>(null);

  const padL = 40;
  const padR = 8;
  const padT = 10;
  const padB = 22;

  const max = Math.max(...data.map((d) => d.value), 1);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const innerW = w - padL - padR;
  const step = innerW / Math.max(1, data.length);
  const barW = Math.min(24, step * 0.62);
  const Y = (v: number) => padT + (1 - v / top) * (height - padT - padB);
  const maxI = data.findIndex((d) => d.value === max);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Bar chart">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={w - padR}
                y1={Y(t)}
                y2={Y(t)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={Y(t) + 3}
                textAnchor="end"
                fontSize={10}
                fill="var(--ink-3)"
              >
                {fmt(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = padL + i * step + (step - barW) / 2;
            const y = Y(d.value);
            const h = Y(0) - y;
            return (
              <g key={i}>
                <path
                  d={roundedTop(x, y, barW, Math.max(h, 1), 4)}
                  fill={d.color ?? color}
                  opacity={hoverI === null || hoverI === i ? 1 : 0.45}
                  style={{ transition: "opacity 150ms" }}
                  onMouseEnter={() => {
                    setHoverI(i);
                    setTip({
                      x: x + barW / 2,
                      y,
                      node: (
                        <span>
                          <span className="text-ink-3">{d.label}</span>{" "}
                          <strong>{fmt(d.value)}</strong>
                        </span>
                      ),
                    });
                  }}
                  onMouseLeave={() => {
                    setTip(null);
                    setHoverI(null);
                  }}
                />
                {i === maxI && d.value > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={600}
                    fill="var(--ink-2)"
                  >
                    {fmt(d.value)}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text
                    x={x + barW / 2}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--ink-3)"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <TipBox tip={tip} />
    </div>
  );
}

/* ================= donut ================= */

export function Donut({
  slices,
  size = 168,
  thickness = 20,
  center,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  center?: ReactNode;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const gap = 2.5; // px gap between segments

  const fracs = slices.map((s) => s.value / total);
  const segs = slices.map((s, i) => {
    const before = fracs.slice(0, i).reduce((a, b) => a + b, 0);
    return {
      ...s,
      len: Math.max(0, fracs[i] * C - gap),
      offset: before * C + gap / 2,
      i,
    };
  });

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segs.map((s) => (
          <circle
            key={s.i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={hover === s.i ? thickness + 4 : thickness}
            strokeDasharray={`${s.len} ${C - s.len}`}
            strokeDashoffset={-s.offset}
            style={{ transition: "stroke-width 180ms, opacity 180ms" }}
            opacity={hover === null || hover === s.i ? 1 : 0.35}
            onMouseEnter={() => setHover(s.i)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{`${s.label}: ${Math.round((s.value / total) * 100)}%`}</title>
          </circle>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {hover !== null ? (
          <>
            <span className="text-[11px] font-medium text-ink-3">
              {segs[hover].label}
            </span>
            <span className="text-lg font-semibold text-ink">
              {Math.round((segs[hover].value / total) * 100)}%
            </span>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  );
}

/* ================= heatmap ================= */

export function Heatmap({
  values,
  weeks = 18,
  color = "var(--accent)",
  cell = 12,
  gap = 3,
  fmt = (n: number) => `${n}`,
}: {
  values: Record<string, number>;
  weeks?: number;
  color?: string;
  cell?: number;
  gap?: number;
  fmt?: (n: number) => string;
}) {
  // pad so columns align to weeks ending today
  const days = lastNDates(weeks * 7);
  const startPad = fromISO(days[0]).getDay();
  const max = Math.max(...Object.values(values), 1);
  const width = weeks * (cell + gap) + gap;
  const height = 7 * (cell + gap) + gap;

  return (
    <div className="overflow-x-auto no-scrollbar">
      <svg width={width} height={height} role="img" aria-label="Activity heatmap">
        {days.map((iso, i) => {
          const idx = i + startPad;
          const col = Math.floor(idx / 7);
          const row = idx % 7;
          const v = values[iso] ?? 0;
          const alpha = v === 0 ? 0 : 0.25 + 0.75 * Math.min(1, v / max);
          return (
            <rect
              key={iso}
              x={gap + col * (cell + gap)}
              y={gap + row * (cell + gap)}
              width={cell}
              height={cell}
              rx={3}
              fill={
                v === 0
                  ? "var(--line)"
                  : `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
              }
            >
              <title>{`${prettyDate(iso)} — ${fmt(v)}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

/* ================= radar ================= */

export function Radar({
  axes,
  size = 280,
  color = "var(--accent)",
}: {
  axes: { label: string; score: number }[]; // score 0-100
  size?: number;
  color?: string;
}) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 58;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const px = (i: number, r: number) => cx + Math.cos(angle(i)) * r;
  const py = (i: number, r: number) => cy + Math.sin(angle(i)) * r;

  const ringPath = (frac: number) =>
    axes
      .map(
        (_, i) =>
          `${i === 0 ? "M" : "L"} ${px(i, R * frac)},${py(i, R * frac)}`,
      )
      .join(" ") + " Z";

  const poly =
    axes
      .map((a, i) => {
        const r = (a.score / 100) * R;
        return `${i === 0 ? "M" : "L"} ${px(i, r)},${py(i, r)}`;
      })
      .join(" ") + " Z";

  return (
    <svg
      width={size}
      height={size}
      role="img"
      aria-label="Life balance radar"
      className="overflow-visible"
    >
      {[1 / 3, 2 / 3, 1].map((f) => (
        <path key={f} d={ringPath(f)} fill="none" stroke="var(--grid)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={px(i, R)}
          y2={py(i, R)}
          stroke="var(--grid)"
          strokeWidth={1}
        />
      ))}
      <path
        d={poly}
        fill={`color-mix(in srgb, ${color} 16%, transparent)`}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {axes.map((a, i) => {
        const r = (a.score / 100) * R;
        return (
          <circle
            key={i}
            cx={px(i, r)}
            cy={py(i, r)}
            r={3.5}
            fill={color}
            stroke="var(--chart-surface)"
            strokeWidth={2}
          >
            <title>{`${a.label}: ${a.score}`}</title>
          </circle>
        );
      })}
      {axes.map((a, i) => {
        const lx = px(i, R + 18);
        const ly = py(i, R + 16);
        const anchor =
          Math.abs(Math.cos(angle(i))) < 0.3
            ? "middle"
            : Math.cos(angle(i)) > 0
              ? "start"
              : "end";
        return (
          <text
            key={i}
            x={lx}
            y={ly + 3}
            textAnchor={anchor}
            fontSize={11}
            fill="var(--ink-2)"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ================= mood strip (journal) ================= */

const MOODS = ["😖", "😕", "😐", "🙂", "😄"]; // used as data glyphs, not UI icons

export function moodGlyph(m: number) {
  return MOODS[Math.max(0, Math.min(4, m - 1))];
}
