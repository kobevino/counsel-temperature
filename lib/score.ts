import type { AxisKey, Band } from "@/lib/types";

/**
 * Axis weights for the final temperature. Tunable without touching the
 * prompt — resistance is inverted (high resistance lowers temperature).
 */
export const AXIS_WEIGHTS: Record<AxisKey, number> = {
  intent: 0.4,
  engagement: 0.25,
  trust: 0.2,
  resistance: 0.15,
};

export function computeTemperature(scores: Record<AxisKey, number>): number {
  const raw =
    AXIS_WEIGHTS.intent * scores.intent +
    AXIS_WEIGHTS.engagement * scores.engagement +
    AXIS_WEIGHTS.trust * scores.trust +
    AXIS_WEIGHTS.resistance * (100 - scores.resistance);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

/** displayed metric per the Figma design: churn risk = inverse temperature */
export function riskFromTemperature(temperature: number): number {
  return 100 - temperature;
}

export function bandFromRisk(risk: number): Band {
  if (risk >= 70) return "urgent";
  if (risk >= 50) return "risk";
  if (risk >= 30) return "caution";
  return "safe";
}

export const BAND_META: Record<
  Band,
  { label: string; range: string; color: string; textColor: string }
> = {
  safe: {
    label: "안전",
    range: "0-29%",
    color: "var(--color-band-safe)",
    textColor: "var(--color-band-safe-text)",
  },
  caution: {
    label: "주의",
    range: "30-49%",
    color: "var(--color-band-caution)",
    textColor: "var(--color-band-caution-text)",
  },
  risk: {
    label: "위험",
    range: "50-69%",
    color: "var(--color-band-risk)",
    textColor: "var(--color-band-risk-text)",
  },
  urgent: {
    label: "긴급",
    range: "70%+",
    color: "var(--color-band-urgent)",
    textColor: "var(--color-band-urgent-text)",
  },
};

export const BAND_ORDER: Band[] = ["safe", "caution", "risk", "urgent"];
