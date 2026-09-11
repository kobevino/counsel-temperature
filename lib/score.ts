import type { AxisKey, Band } from "@/lib/types";

/**
 * 대화 온도 v2 — 높을수록 따뜻한(전환에 가까운) 상담이다.
 * v1은 "이탈 위험도"(높을수록 나쁨)였고 곡선 방향이 반대다. 두 수치를 섞지 말 것.
 *
 *   온도 = 0.40·intent + 0.25·engagement + 0.20·trust + 0.15·(100 − resistance)
 */
export const AXIS_WEIGHTS: Record<AxisKey, number> = {
  intent: 0.4,
  engagement: 0.25,
  trust: 0.2,
  resistance: 0.15,
};

/** 상담 시작 시점의 축 값 → 초기 온도 55 */
export const INITIAL_AXES: Record<AxisKey, number> = {
  intent: 45,
  engagement: 60,
  trust: 50,
  resistance: 20,
};

/** 첫 발화부터 짜증·의심 톤이면 신뢰가 낮고 저항이 높은 상태에서 시작 → 초기 온도 45 */
export const WARY_AXES: Record<AxisKey, number> = {
  ...INITIAL_AXES,
  trust: 35,
  resistance: 35,
};

export function computeTemperature(scores: Record<AxisKey, number>): number {
  const raw =
    AXIS_WEIGHTS.intent * scores.intent +
    AXIS_WEIGHTS.engagement * scores.engagement +
    AXIS_WEIGHTS.trust * scores.trust +
    AXIS_WEIGHTS.resistance * (100 - scores.resistance);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function bandFromTemperature(temperature: number): Band {
  if (temperature >= 70) return "warm";
  if (temperature >= 55) return "lukewarm";
  if (temperature >= 40) return "cooling";
  if (temperature >= 25) return "cold";
  return "imminent";
}

/**
 * surfacing — 구간만으로 화면에 무엇을 띄울지.
 * 실제 개입 카드 발화 여부는 lib/intervention.ts의 T/B 규칙이 최종 결정한다.
 */
export type Surfacing = "none" | "counselor" | "card" | "team";

export const BAND_META: Record<
  Band,
  {
    label: string;
    range: string;
    color: string;
    textColor: string;
    surfacing: Surfacing;
  }
> = {
  imminent: {
    label: "이탈 임박",
    range: "0-24",
    color: "var(--color-band-imminent)",
    textColor: "var(--color-band-imminent-text)",
    surfacing: "team",
  },
  cold: {
    label: "차가움",
    range: "25-39",
    color: "var(--color-band-cold)",
    textColor: "var(--color-band-cold-text)",
    surfacing: "card",
  },
  cooling: {
    label: "식는 중",
    range: "40-54",
    color: "var(--color-band-cooling)",
    textColor: "var(--color-band-cooling-text)",
    surfacing: "counselor",
  },
  lukewarm: {
    label: "미온",
    range: "55-69",
    color: "var(--color-band-lukewarm)",
    textColor: "var(--color-band-lukewarm-text)",
    surfacing: "none",
  },
  warm: {
    label: "따뜻함",
    range: "70-100",
    color: "var(--color-band-warm)",
    textColor: "var(--color-band-warm-text)",
    surfacing: "none",
  },
};

/** 게이지 표시 순서 — 차가운 쪽에서 따뜻한 쪽으로 (온도계와 같은 방향) */
export const BAND_ORDER: Band[] = [
  "imminent",
  "cold",
  "cooling",
  "lukewarm",
  "warm",
];
