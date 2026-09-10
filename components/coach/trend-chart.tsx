"use client";

import { useState } from "react";
import type { TemperatureSnapshot } from "@/lib/types";
import { BAND_META } from "@/lib/score";

const W = 236;
const H = 72;
const PAD_Y = 8;

function yFor(risk: number): number {
  return PAD_Y + (1 - risk / 100) * (H - PAD_Y * 2);
}

export default function TrendChart({
  snapshots,
}: {
  snapshots: TemperatureSnapshot[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const delta = latest && prev ? latest.risk - prev.risk : null;

  const xFor = (i: number) =>
    snapshots.length <= 1 ? W - 8 : 8 + (i / (snapshots.length - 1)) * (W - 16);

  const path = snapshots
    .map((s, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(s.risk)}`)
    .join(" ");

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(20,24,40,0.06)]">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-bold">턴별 이탈 확률</h3>
        {delta !== null && delta !== 0 && (
          <span
            className="text-[12px] font-bold tabular-nums"
            style={{
              color:
                delta > 0
                  ? "var(--color-band-urgent-text)"
                  : "var(--color-band-safe-text)",
            }}
          >
            {delta > 0 ? "+" : ""}
            {delta}% {delta > 0 ? "↑" : "↓"}
          </span>
        )}
      </div>

      <div className="relative mt-3">
        {snapshots.length === 0 ? (
          <div className="flex h-[72px] items-center justify-center text-[12px] text-ink-faint">
            분석 데이터가 아직 없습니다
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="턴별 이탈 확률 추이"
          >
            {/* 50% baseline */}
            <line
              x1={0}
              y1={yFor(50)}
              x2={W}
              y2={yFor(50)}
              stroke="var(--color-line)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            {snapshots.length > 1 && (
              <path
                d={path}
                fill="none"
                stroke="var(--color-ink-faint)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {snapshots.map((s, i) => {
              const isCurrent = i === snapshots.length - 1;
              return (
                <g key={s.turn}>
                  {/* invisible hit target larger than the mark */}
                  <circle
                    cx={xFor(i)}
                    cy={yFor(s.risk)}
                    r={10}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  <circle
                    cx={xFor(i)}
                    cy={yFor(s.risk)}
                    r={isCurrent ? 4 : hover === i ? 3.5 : 2.5}
                    fill={
                      isCurrent
                        ? BAND_META[s.band].color
                        : "var(--color-ink-faint)"
                    }
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                    pointerEvents="none"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {hover !== null && snapshots[hover] && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white"
            style={{ left: `${(xFor(hover) / W) * 100}%` }}
          >
            {snapshots[hover].turn}턴 · 이탈 {snapshots[hover].risk}%
          </div>
        )}
      </div>

      {snapshots.length > 0 && (
        <div className="mt-1.5 flex justify-between text-[10px] text-ink-faint">
          {snapshots.map((s) => (
            <span key={s.turn}>{s.turn}턴</span>
          ))}
        </div>
      )}
    </div>
  );
}
