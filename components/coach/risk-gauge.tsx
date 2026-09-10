"use client";

import type { TemperatureSnapshot } from "@/lib/types";
import { BAND_META, BAND_ORDER } from "@/lib/score";

export default function RiskGauge({
  snapshot,
  customerTurns,
}: {
  snapshot: TemperatureSnapshot | undefined;
  customerTurns: number;
}) {
  const insufficient =
    !snapshot || customerTurns < 3 || snapshot.confidence === "low";

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(20,24,40,0.06)]">
      <p className="text-[12px] text-ink-soft">현재 이탈 확률</p>

      {insufficient ? (
        <div className="mt-2">
          <p className="text-[15px] font-semibold text-ink-faint">
            판단 근거 부족
          </p>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            고객 발화 {customerTurns}개 — 대화가 더 쌓이면 분석이 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between">
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: BAND_META[snapshot.band].textColor }}
          >
            {snapshot.risk}%
          </span>
          <span
            className="rounded-md px-2.5 py-1 text-[13px] font-bold text-white"
            style={{ backgroundColor: BAND_META[snapshot.band].color }}
          >
            {BAND_META[snapshot.band].label}
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-[3px]">
        {BAND_ORDER.map((band) => {
          const active = !insufficient && snapshot.band === band;
          return (
            <span
              key={band}
              className="h-3 flex-1 rounded-full transition-opacity first:rounded-l-full last:rounded-r-full"
              style={{
                backgroundColor: BAND_META[band].color,
                opacity: insufficient ? 0.25 : active ? 1 : 0.3,
              }}
            />
          );
        })}
      </div>

      <div className="mt-2.5 flex justify-between">
        {BAND_ORDER.map((band) => (
          <span key={band} className="flex flex-col gap-0.5">
            <span
              className="text-[11px] font-bold"
              style={{ color: BAND_META[band].textColor }}
            >
              {BAND_META[band].label}
            </span>
            <span className="text-[10px] text-ink-faint">
              {BAND_META[band].range}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
