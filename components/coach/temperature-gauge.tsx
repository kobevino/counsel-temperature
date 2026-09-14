"use client";

import Link from "next/link";
import type { TemperatureSnapshot } from "@/lib/types";
import { BAND_META, BAND_ORDER } from "@/lib/score";
import { formatElapsed } from "@/lib/time";

/** 카드를 클릭하면 온도 계산 기준 가이드가 새 탭으로 열린다 */
export default function TemperatureGauge({
  snapshot,
  customerTurns,
}: {
  snapshot: TemperatureSnapshot | undefined;
  customerTurns: number;
}) {
  const insufficient = !snapshot;

  return (
    <Link
      href="/temperature-guide"
      target="_blank"
      rel="noopener noreferrer"
      className="group block shrink-0 rounded-2xl border border-line bg-surface p-3.5 shadow-[0_1px_3px_rgba(20,24,40,0.06)] transition-colors hover:border-brand/40"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] text-ink-soft">현재 대화 온도</p>
        <span className="flex items-baseline gap-2">
          {!insufficient && snapshot.silenceMinutes > 0 && (
            <span className="text-[11px] text-ink-faint">
              무응답 {formatElapsed(snapshot.silenceMinutes)} · 야간 제외
            </span>
          )}
          <span className="text-[11px] text-ink-faint transition-colors group-hover:text-brand">
            계산 기준 ↗
          </span>
        </span>
      </div>

      {insufficient ? (
        <div className="mt-2">
          <p className="text-[15px] font-semibold text-ink-faint">분석 대기 중</p>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            고객 발화 {customerTurns}개 — 첫 분석 결과를 기다리고 있습니다.
          </p>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between">
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: BAND_META[snapshot.band].textColor }}
          >
            {snapshot.temperature}
            <span className="ml-0.5 text-xl">°</span>
          </span>
          <span className="flex flex-col items-end gap-1">
            <span
              className="rounded-md px-2.5 py-1 text-[13px] font-bold text-white"
              style={{ backgroundColor: BAND_META[snapshot.band].color }}
            >
              {BAND_META[snapshot.band].label}
            </span>
            {snapshot.confidence === "low" && (
              <span className="text-[11px] text-ink-faint">신뢰도 낮음</span>
            )}
          </span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-5 gap-[3px]">
        {BAND_ORDER.map((band) => {
          const active = !insufficient && snapshot.band === band;
          return (
            <div key={band} className="flex flex-col items-center gap-1.5">
              <span
                className="h-3 w-full rounded-full transition-opacity"
                style={{
                  backgroundColor: BAND_META[band].color,
                  opacity: insufficient ? 0.25 : active ? 1 : 0.3,
                }}
              />
              <span
                className="text-[11px] font-bold whitespace-nowrap"
                style={{ color: BAND_META[band].textColor }}
              >
                {BAND_META[band].label}
              </span>
              <span className="text-[10px] text-ink-faint">
                {BAND_META[band].range}
              </span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}
