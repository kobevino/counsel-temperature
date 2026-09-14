"use client";

import { useState } from "react";
import type { AxisKey } from "@/lib/types";
import { AXIS_WEIGHTS } from "@/lib/score";
import {
  SIGNALS,
  SIGNAL_CODES,
  isPositiveSignal,
  type AxisEffects,
  type SignalCode,
} from "@/lib/signals";

/** 축 코드 → 화면용 축약 이름 (Δ 칩에 쓴다) */
const AXIS_SHORT: Record<AxisKey, string> = {
  intent: "의향",
  engagement: "참여",
  trust: "신뢰",
  resistance: "저항",
};

type GroupKey = "down" | "up" | "counselor" | "clock";

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "down", label: "↘ 하락 신호" },
  { key: "up", label: "↗ 상승 신호" },
  { key: "counselor", label: "💬 상담사" },
  { key: "clock", label: "⏱ 시간" },
];

/**
 * 신호 분류 — 시간 경과 신호(clock.*)와 상담사 발화 신호를 먼저 떼어내고,
 * 나머지 고객 신호를 온도 방향으로 나눈다. engage.shorter_reply는 source가
 * clock(글자 수 계산)이지만 고객 발화에 대한 신호라 하락 쪽에 묶는다.
 */
function groupOf(code: SignalCode): GroupKey {
  if (code.startsWith("clock.")) return "clock";
  if (SIGNALS[code].source === "counselor") return "counselor";
  return isPositiveSignal(code) ? "up" : "down";
}

/** 이 신호 한 번이 최종 온도를 얼마나 움직이는지 (저항은 역방향) */
function temperatureDelta(effects: AxisEffects): number {
  return (Object.entries(effects) as [AxisKey, number][]).reduce(
    (sum, [axis, delta]) =>
      sum + AXIS_WEIGHTS[axis] * (axis === "resistance" ? -delta : delta),
    0,
  );
}

function isHarmful(axis: AxisKey, delta: number): boolean {
  return axis === "resistance" ? delta > 0 : delta < 0;
}

function EffectChips({ effects }: { effects: AxisEffects }) {
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
      {(Object.entries(effects) as [AxisKey, number][]).map(
        ([axis, delta]) => (
          <span
            key={axis}
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
              isHarmful(axis, delta)
                ? "bg-alert-bg text-[#c73e44]"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {AXIS_SHORT[axis]} {delta > 0 ? `+${delta}` : delta}
          </span>
        ),
      )}
    </span>
  );
}

export default function SignalEffects() {
  const [group, setGroup] = useState<GroupKey>("down");

  const rows = SIGNAL_CODES.filter((code) => groupOf(code) === group).sort(
    (a, b) =>
      Math.abs(temperatureDelta(SIGNALS[b].effects)) -
      Math.abs(temperatureDelta(SIGNALS[a].effects)),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {GROUPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setGroup(key)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              group === key
                ? "border-brand bg-brand-soft text-brand"
                : "border-line bg-surface text-ink-soft hover:border-brand/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((code) => {
          const def = SIGNALS[code];
          return (
            <li
              key={code}
              className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"
            >
              <span className="min-w-0">
                <span className="text-[13px] font-bold text-[#2b3654]">
                  {def.label}
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-faint">
                  {def.hint}
                </span>
                {"repeatEffects" in def && def.repeatEffects && (
                  <span className="mt-1 block text-[11px] text-ink-faint">
                    반복 감지 시:{" "}
                    {(
                      Object.entries(def.repeatEffects) as [AxisKey, number][]
                    )
                      .map(
                        ([axis, delta]) =>
                          `${AXIS_SHORT[axis]} ${delta > 0 ? `+${delta}` : delta}`,
                      )
                      .join(" · ")}
                  </span>
                )}
                {"maxTotal" in def && def.maxTotal !== undefined && (
                  <span className="mt-1 block text-[11px] text-ink-faint">
                    한 상담에서 누적 최대 ±{def.maxTotal}
                  </span>
                )}
              </span>
              <EffectChips effects={def.effects} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
