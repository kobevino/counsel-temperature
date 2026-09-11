"use client";

import { useState } from "react";
import type { TemperatureSnapshot } from "@/lib/types";
import { BAND_META } from "@/lib/score";
import { T1_TEMPERATURE, type Intervention } from "@/lib/intervention";

const W = 236;
const H = 72;
const PAD_Y = 8;

function yFor(temperature: number): number {
  return PAD_Y + (1 - temperature / 100) * (H - PAD_Y * 2);
}

export default function TrendChart({
  snapshots,
  interventions,
}: {
  snapshots: TemperatureSnapshot[];
  interventions: Intervention[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const delta = latest && prev ? latest.temperature - prev.temperature : null;

  const xFor = (i: number) =>
    snapshots.length <= 1 ? W - 8 : 8 + (i / (snapshots.length - 1)) * (W - 16);

  const path = snapshots
    .map((s, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(s.temperature)}`)
    .join(" ");

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(20,24,40,0.06)]">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-bold">턴별 대화 온도</h3>
        {delta !== null && delta !== 0 && (
          <span
            className="text-[12px] font-bold tabular-nums"
            style={{
              color:
                delta < 0
                  ? "var(--color-band-imminent-text)"
                  : "var(--color-band-warm-text)",
            }}
          >
            {delta > 0 ? "+" : "−"}
            {Math.abs(delta)}° {delta > 0 ? "↑" : "↓"}
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
            aria-label="턴별 대화 온도 추이"
          >
            {/* T1 개입선 (온도 39) */}
            <line
              x1={0}
              y1={yFor(T1_TEMPERATURE)}
              x2={W}
              y2={yFor(T1_TEMPERATURE)}
              stroke="var(--color-band-cold)"
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.6}
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
              const fired =
                interventions[i]?.mode === "card" ||
                interventions[i]?.mode === "ops";
              return (
                <g key={s.seq}>
                  {/* invisible hit target larger than the mark */}
                  <circle
                    cx={xFor(i)}
                    cy={yFor(s.temperature)}
                    r={10}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  {fired && (
                    <circle
                      cx={xFor(i)}
                      cy={yFor(s.temperature)}
                      r={7}
                      fill="none"
                      stroke="var(--color-band-cold)"
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  )}
                  <circle
                    cx={xFor(i)}
                    cy={yFor(s.temperature)}
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
            {snapshots[hover].turn}턴 · {snapshots[hover].temperature}°
            {interventions[hover]?.mode === "card" ? " · 개입" : ""}
          </div>
        )}
      </div>

      {snapshots.length > 0 && (
        <div className="mt-1.5 flex justify-between text-[10px] text-ink-faint">
          {snapshots.map((s, i) => (
            // 무응답 구간은 턴이 같은 판정이 이어진다 — 라벨은 바뀔 때만 찍는다
            <span key={s.seq}>
              {i === 0 || s.turn !== snapshots[i - 1].turn ? `${s.turn}턴` : "·"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
