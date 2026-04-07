"use client";

import { useId, useState } from "react";
import type { ServiceHistoryPoint } from "@/features/monitoring/types";

type Props = {
  history: ServiceHistoryPoint[];
  targetUrl: string;
};

const WIDTH = 860;
const HEIGHT = 280;
const PADDING = 24;
const MAX_VISIBLE_POINTS = 48;

export function LatencyChart({ history, targetUrl }: Props) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const strokeGradientId = `${useId().replaceAll(":", "")}-latencyStroke`;
  const visibleHistory = history.slice(-MAX_VISIBLE_POINTS);
  const values = visibleHistory.flatMap((point) => (point.latency_ms == null ? [] : [point.latency_ms]));
  const scaleMaxValue = values.length > 0 ? Math.max(...values) : 0;
  const maxValue = Math.max(1, scaleMaxValue);
  const latestLatency = history.at(-1)?.latency_ms ?? null;
  const averageLatency = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const peakLatency = values.length > 0 ? Math.max(...values) : null;
  const chartPoints = visibleHistory.map((point, index) => {
    const x =
      visibleHistory.length <= 1
        ? WIDTH / 2
        : PADDING + (index / (visibleHistory.length - 1)) * (WIDTH - PADDING * 2);
    const y =
      HEIGHT -
      PADDING -
      ((point.latency_ms ?? 0) / maxValue) * (HEIGHT - PADDING * 2);
    return {
      x,
      y,
      point,
      label: `${x},${y}`,
    };
  });
  const polyline = chartPoints.map((point) => point.label).join(" ");
  const ticks = [0, 1, 2, 3].map((lineIndex) => {
    const ratio = 1 - lineIndex / 3;

    return {
      y: PADDING + lineIndex * ((HEIGHT - PADDING * 2) / 3),
      value: Math.round(scaleMaxValue * ratio),
    };
  });
  const activePoint = activePointIndex == null ? null : chartPoints[activePointIndex] ?? null;
  const firstSample = history[0]?.checked_at ?? null;
  const lastSample = history.at(-1)?.checked_at ?? null;
  const plottedSampleCount = visibleHistory.length;

  return (
    <section className="monitor-card overflow-hidden px-6 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="monitor-label">Service health</div>
          <h2 className="mt-2 text-2xl font-semibold">Latency over time</h2>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            The line shows response time, while point color marks whether each synthetic check
            completed successfully.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricBadge label="Latest" value={formatLatency(latestLatency)} />
          <MetricBadge label="Average" value={formatLatency(averageLatency)} />
          <MetricBadge label="Peak" value={formatLatency(peakLatency)} />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <LegendBadge label="Latency trend">
            <span className="h-0.5 w-8 rounded-full bg-[linear-gradient(90deg,oklch(0.76_0.14_205),oklch(0.82_0.16_84))]" />
          </LegendBadge>
          <LegendBadge label="Healthy check">
            <span className="h-3 w-3 rounded-full bg-success ring-4 ring-success/15" />
          </LegendBadge>
          <LegendBadge label="Failed check">
            <span className="h-3 w-3 rounded-full bg-critical ring-4 ring-critical/15" />
          </LegendBadge>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>{plottedSampleCount} shown on chart</div>
          <div>{history.length} checks in history</div>
        </div>
      </div>
      <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-accent/55 px-4 py-3">
        <div className="monitor-label">Latency target</div>
        <div className="mt-2 break-all font-mono text-sm text-foreground">
          {formatTargetLabel(targetUrl)}
        </div>
      </div>
      <div className="relative mt-6 overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(62,173,214,0.18),rgba(8,14,30,0.08))] p-4">
        {activePoint ? (
          <ChartTooltip
            point={activePoint.point}
            x={activePoint.x}
            y={activePoint.y}
          />
        ) : null}
        <svg
          aria-label="Latency chart"
          className="h-auto w-full"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
        >
          <defs>
            <linearGradient id={strokeGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.76 0.14 205)" />
              <stop offset="100%" stopColor="oklch(0.82 0.16 84)" />
            </linearGradient>
          </defs>
          {ticks.map((tick, lineIndex) => {
            return (
              <g key={lineIndex}>
                <line
                  x1={PADDING}
                  x2={WIDTH - PADDING}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="rgba(210, 219, 234, 0.12)"
                  strokeDasharray="6 8"
                />
                <text
                  fill="rgba(222, 230, 240, 0.72)"
                  fontSize="11"
                  x={2}
                  y={tick.y + 4}
                >
                  {tick.value} ms
                </text>
              </g>
            );
          })}
          {chartPoints.length > 1 ? (
            <polyline
              fill="none"
              points={polyline}
              stroke={`url(#${strokeGradientId})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          ) : null}
          {chartPoints.map(({ point, x, y }, index) => {
            return (
              <g key={`${point.checked_at}-${index}`}>
                <circle
                  aria-label={`Latency sample ${index + 1}`}
                  cx={x}
                  cy={y}
                  fill="transparent"
                  focusable="true"
                  r="12"
                  tabIndex={0}
                  onBlur={() => setActivePointIndex((current) => (current === index ? null : current))}
                  onFocus={() => setActivePointIndex(index)}
                  onMouseEnter={() => setActivePointIndex(index)}
                  onMouseLeave={() => setActivePointIndex((current) => (current === index ? null : current))}
                >
                  <title>{formatTooltipSummary(point)}</title>
                </circle>
                <circle
                  cx={x}
                  cy={y}
                  fill={point.available ? "oklch(0.8 0.14 160)" : "oklch(0.68 0.2 26)"}
                  opacity={activePointIndex === index ? 1 : 0.92}
                  pointerEvents="none"
                  r={activePointIndex === index ? 6 : 4.5}
                  stroke="rgba(8, 14, 30, 0.82)"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>{firstSample ? `From ${formatTimestamp(firstSample)}` : "Waiting for samples"}</div>
        <div>{lastSample ? `To ${formatTimestamp(lastSample)}` : "No checks received yet"}</div>
      </div>
    </section>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-accent/65 px-4 py-3">
      <div className="monitor-label">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function LegendBadge({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-accent/55 px-3 py-2">
      {children}
      <span>{label}</span>
    </div>
  );
}

function ChartTooltip({
  point,
  x,
  y,
}: {
  point: ServiceHistoryPoint;
  x: number;
  y: number;
}) {
  const horizontalShift = x < WIDTH * 0.18 ? "0" : x > WIDTH * 0.82 ? "-100%" : "-50%";
  const verticalShift = y < HEIGHT * 0.25 ? "12px" : "calc(-100% - 12px)";
  const statusSummary = point.available
    ? point.status_code != null
      ? `HTTP ${point.status_code}`
      : "Successful check"
    : point.error ?? (point.status_code != null ? `HTTP ${point.status_code}` : "Service unavailable");

  return (
    <div
      className="pointer-events-none absolute z-10 w-[220px] rounded-[1.35rem] border border-border/80 bg-background/94 px-4 py-3 shadow-[0_18px_35px_rgba(4,10,24,0.35)]"
      style={{
        left: `${(x / WIDTH) * 100}%`,
        top: `${(y / HEIGHT) * 100}%`,
        transform: `translate(${horizontalShift}, ${verticalShift})`,
      }}
    >
      <div className="monitor-label">Hovered sample</div>
      <div className="mt-2 text-lg font-semibold">{formatLatency(point.latency_ms)}</div>
      <div className="mt-1 text-xs text-muted-foreground">{formatTimestamp(point.checked_at)}</div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            point.available ? "bg-success" : "bg-critical"
          }`}
        />
        <span>{statusSummary}</span>
      </div>
    </div>
  );
}

function formatLatency(value: number | null) {
  if (value == null) {
    return "No sample";
  }

  return `${value.toFixed(0)} ms`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function formatTooltipSummary(point: ServiceHistoryPoint) {
  const availability = point.available ? "available" : "unavailable";
  const latency = formatLatency(point.latency_ms);

  return `${availability} at ${formatTimestamp(point.checked_at)} with ${latency}`;
}

function formatTargetLabel(targetUrl: string) {
  if (!targetUrl || targetUrl === "Unavailable") {
    return "Target unavailable";
  }

  try {
    const url = new URL(targetUrl);
    const path = `${url.pathname}${url.search}`.replace(/\/$/, "") || "/";

    return `${url.host}${path === "/" ? "" : path}`;
  } catch {
    return targetUrl;
  }
}
