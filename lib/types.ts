import { z } from "zod";
import {
  LLM_SIGNAL_CODES,
  type AxisEffects,
  type SignalCode,
} from "@/lib/signals";

// ---------- Chat ----------

export type Role = "counselor" | "customer";

export type Message = {
  id: string;
  role: Role;
  text: string;
  /** offset in ms from session start — keeps demo replays deterministic */
  at: number;
};

// ---------- Customer ----------

export type CustomerStatus = "접수" | "문의" | "응대" | "종료";

export type Customer = {
  id: string;
  name: string;
  displayId: string;
  ageGroup: string;
  product: string;
  channel: string;
  /** session start as wall-clock label, e.g. "14:18" */
  startedAt: string;
  tags: string[];
  lastMessage: string;
  lastMessageAgo: string;
  status: CustomerStatus;
  counselor: string;
};

// ---------- Temperature analysis ----------

/** 가중치가 큰 순서 — 화면 표시 순서와 같다 */
export const AXIS_KEYS = ["intent", "engagement", "trust", "resistance"] as const;
export type AxisKey = (typeof AXIS_KEYS)[number];

/**
 * LLM은 점수를 매기지 않는다. 어떤 신호가 어느 발화에서 나왔는지만 고르고,
 * 축 점수 계산은 lib/signals.ts의 증감 테이블이 맡는다.
 */
export const ReadingSchema = z.object({
  openingTone: z.enum(["neutral", "wary"]),
  signals: z.array(
    z.object({
      code: z.enum(LLM_SIGNAL_CODES as [SignalCode, ...SignalCode[]]),
      quote: z.string(),
    }),
  ),
  counselorAddressing: z.enum(["none", ...AXIS_KEYS]),
  confidence: z.enum(["low", "medium", "high"]),
  trigger: z.string(),
  nextAction: z.string(),
});

export type Reading = z.infer<typeof ReadingSchema>;

export type ResolvedQuote = {
  messageId: string;
  quote: string;
};

/** 감지된 신호 + 실제 발화 대조 결과 (환각 가드) */
export type ResolvedSignal = {
  code: SignalCode;
  label: string;
  quote: string;
  messageId: string | null;
  effects: AxisEffects;
};

export type AxisReading = {
  score: number;
  quotes: ResolvedQuote[];
  note: string;
};

export type Band = "imminent" | "cold" | "cooling" | "lukewarm" | "warm";

export type TemperatureSnapshot = {
  /** 고객 발화 수 — 화면의 "n턴" */
  turn: number;
  /** 판정 시점의 전체 메시지 수. 무응답 구간에서는 턴이 안 늘어도 온도는 움직인다 */
  seq: number;
  axes: Record<AxisKey, AxisReading>;
  /** 0~100, 높을수록 따뜻하다 (v1 이탈 위험도와 방향이 반대) */
  temperature: number;
  band: Band;
  confidence: "low" | "medium" | "high";
  trigger: string;
  nextAction: string;
  /** 대화 전체에서 누적 감지된 신호 */
  signals: ResolvedSignal[];
  /** 직전 판정 이후 새로 감지된 신호 — B5 판정과 근거 표시에 쓴다 */
  turnSignals: ResolvedSignal[];
  explicitRejection: boolean;
  /** 마지막 고객 발화 뒤 상담사가 이미 손대고 있는 축 (B3) */
  counselorAddressing: AxisKey | "none";
  /** 야간(22:00~08:00)을 뺀 현재 무응답 시간(분) */
  silenceMinutes: number;
};

// ---------- API ----------

export type TemperatureRequest = {
  messages: Message[];
  /** 상담 시작 시각 "13:38" — 무응답·응답 속도 계산 기준 */
  startedAt: string;
  previousSnapshot?: TemperatureSnapshot;
};

export type TemperatureResponse = TemperatureSnapshot;
