import type { AxisKey, TemperatureSnapshot } from "@/lib/types";
import { AXIS_WEIGHTS, INITIAL_AXES } from "@/lib/score";
import { SERVICE_FAULT_CODES, type AxisEffects } from "@/lib/signals";

/**
 * 개입 판단 v2 — 온도 절대값만 보면 늦는다.
 *
 *   T1 온도 ≤ 39            절대 수준 (차가움 진입)
 *   T2 한 턴 하락폭 ≥ 8     속도. 온도가 높아도 급락은 위험
 *   T3 최근 3턴 하락 합 ≥ 12 누적. 조용히 식는 걸 잡음
 */
export const T1_TEMPERATURE = 39;
export const T2_TURN_DROP = 8;
export const T3_WINDOW_DROP = 12;
/** B1 — 직전 몇 턴 안에 이미 개입했으면 다시 울리지 않는다 (피로도 관리) */
export const B1_COOLDOWN_TURNS = 3;

export type TriggerCode = "T1" | "T2" | "T3";
export type BlockCode = "B1" | "B2" | "B3" | "B4" | "B5";

export type InterventionMode =
  /** 트리거 미달 — 아무것도 띄우지 않는다 */
  | "none"
  /** 개입 카드 + 처방 */
  | "card"
  /** B5 — 하락이 상담사 귀책이라 고객 처방 대신 운영 알림 */
  | "ops"
  /** B2 — 명시적 거절 이후. 정중 종료 안내만, 처방 불가 */
  | "closing"
  /** B1·B3·B4 — 트리거는 걸렸지만 지금은 관망 */
  | "hold";

export type Prescription = {
  axis: AxisKey;
  diagnosis: string;
  action: string;
  /** 개입 카드 버튼 라벨 */
  label: string;
  /** 버튼을 누르면 입력창에 들어가는 문장 */
  draft: string;
};

/** 가장 많이 나빠진 축이 처방을 정한다 — 단일 점수로는 고를 수 없는 부분 */
export const PRESCRIPTIONS: Record<AxisKey, Prescription> = {
  intent: {
    axis: "intent",
    diagnosis: "상품·금액이 안 맞습니다",
    action: "보장을 조정한 대안을 제시하세요.",
    label: "대안 설계 제시",
    draft:
      "보장을 조금 조정한 안으로도 보여드릴 수 있어요. 비교해서 보내드릴까요?",
  },
  engagement: {
    axis: "engagement",
    diagnosis: "관심이 떠났거나 시간이 지났습니다",
    action: "지금까지 내용을 요약하고 종료 예고를 1회만 보내세요. 압박은 금지입니다.",
    label: "요약 + 종료 예고",
    draft:
      "여기까지 내용 정리해서 보내드릴게요. 천천히 보시고 필요하실 때 말씀해주세요.",
  },
  trust: {
    axis: "trust",
    diagnosis: "정보 요구가 과했거나 불신이 생겼습니다",
    action: "정보 요구를 멈추고 수집 목적을 설명한 뒤 개략 금액을 먼저 안내하세요.",
    label: "개략 금액 먼저",
    draft:
      "정보 없이 먼저 알려드릴게요. 조건에 따라 다르지만 대략적인 금액대는 이 정도입니다.",
  },
  resistance: {
    axis: "resistance",
    diagnosis: "가격·타이밍 저항입니다",
    action: '보장을 낮춘 안을 제시하고 "결정 기한 없습니다"를 명시하세요.',
    label: "낮춘 안 제시",
    draft:
      "보장을 낮춘 안으로 먼저 보여드릴게요. 결정 기한은 없으니 편하게 보셔도 됩니다.",
  },
};

export type Intervention = {
  mode: InterventionMode;
  triggers: TriggerCode[];
  blockedBy: BlockCode | null;
  dominant: { axis: AxisKey; delta: number } | null;
  prescription: Prescription | null;
  /** 한 턴 하락폭 / 3턴 하락 합 (하락이 아니면 0) */
  turnDrop: number;
  windowDrop: number;
  /** 화면에 그대로 쓰는 한 줄 사유 */
  reason: string;
};

const NONE: Intervention = {
  mode: "none",
  triggers: [],
  blockedBy: null,
  dominant: null,
  prescription: null,
  turnDrop: 0,
  windowDrop: 0,
  reason: "",
};

/** 저항은 올라갈수록 나쁘다 — 축 변화를 "나빠진 정도"로 통일한다 */
function adverseDelta(axis: AxisKey, from: number, to: number): number {
  return axis === "resistance" ? to - from : from - to;
}

/**
 * 동점일 때의 우선순위. 신뢰가 먼저다 — 신뢰 붕괴는 상담사가 지금 되돌릴 수
 * 있는 문제인데, 여기서 engagement 처방(요약 + 종료 예고)이 나가면 살릴 수
 * 있던 상담에 작별 인사를 보내게 된다.
 */
const TIE_BREAK: AxisKey[] = ["trust", "resistance", "intent", "engagement"];

function dominantAxis(
  from: Record<AxisKey, number>,
  to: Record<AxisKey, number>,
): { axis: AxisKey; delta: number } | null {
  let best: { axis: AxisKey; delta: number } | null = null;
  for (const axis of TIE_BREAK) {
    const delta = adverseDelta(axis, from[axis], to[axis]);
    if (delta <= 0) continue;
    if (!best || delta > best.delta) best = { axis, delta };
  }
  return best;
}

function axisScores(snapshot: TemperatureSnapshot): Record<AxisKey, number> {
  return {
    intent: snapshot.axes.intent.score,
    engagement: snapshot.axes.engagement.score,
    trust: snapshot.axes.trust.score,
    resistance: snapshot.axes.resistance.score,
  };
}

/** 신호 하나가 온도에 준 영향(가중 반영). 음수면 온도를 내린 신호 */
function temperatureImpact(effects: AxisEffects): number {
  let sum = 0;
  for (const [axis, delta] of Object.entries(effects) as [AxisKey, number][]) {
    sum += AXIS_WEIGHTS[axis] * (axis === "resistance" ? -delta : delta);
  }
  return sum;
}

/** B5 — 이번 하락의 과반이 응답 지연·설명 반복 같은 상담사 귀책인가 */
function serviceFaultDominates(snapshot: TemperatureSnapshot): boolean {
  let negative = 0;
  let fault = 0;
  for (const signal of snapshot.turnSignals) {
    const impact = temperatureImpact(signal.effects);
    if (impact >= 0) continue;
    negative += -impact;
    if (SERVICE_FAULT_CODES.includes(signal.code)) fault += -impact;
  }
  return negative > 0 && fault / negative >= 0.5;
}

function describe(triggers: TriggerCode[], turnDrop: number, windowDrop: number): string {
  const parts: string[] = [];
  if (triggers.includes("T1")) parts.push("온도 39 이하");
  if (triggers.includes("T2")) parts.push(`한 턴 −${turnDrop}`);
  if (triggers.includes("T3")) parts.push(`3턴 −${windowDrop}`);
  return parts.join(" · ");
}

/**
 * 스냅샷 이력 전체를 훑어 턴마다의 개입 판단을 만든다.
 * B1(직전 개입 여부)이 앞선 판단에 의존하므로 한 번에 접어서 계산한다.
 */
export function evaluateInterventions(
  snapshots: TemperatureSnapshot[],
): Intervention[] {
  const decisions: Intervention[] = [];
  let rejectedFrom: number | null = null;

  for (let i = 0; i < snapshots.length; i += 1) {
    const current = snapshots[i];
    if (current.explicitRejection && rejectedFrom === null) rejectedFrom = i;

    const previous = snapshots[i - 1];
    const windowBase = i >= 2 ? snapshots[Math.max(0, i - 3)] : undefined;

    const turnDrop = previous
      ? Math.max(0, previous.temperature - current.temperature)
      : 0;
    const windowDrop = windowBase
      ? Math.max(0, windowBase.temperature - current.temperature)
      : 0;

    const triggers: TriggerCode[] = [];
    if (current.temperature <= T1_TEMPERATURE) triggers.push("T1");
    if (turnDrop >= T2_TURN_DROP) triggers.push("T2");
    if (windowDrop >= T3_WINDOW_DROP) triggers.push("T3");

    if (triggers.length === 0) {
      decisions.push(NONE);
      continue;
    }

    // 하락 폭이 가장 넓은 구간을 기준으로 주도 축을 고른다
    const base = triggers.includes("T3") ? windowBase : previous;
    const dominant =
      dominantAxis(base ? axisScores(base) : INITIAL_AXES, axisScores(current)) ??
      dominantAxis(INITIAL_AXES, axisScores(current));
    const prescription = dominant ? PRESCRIPTIONS[dominant.axis] : null;
    const detail = describe(triggers, turnDrop, windowDrop);

    const decide = (
      mode: InterventionMode,
      blockedBy: BlockCode | null,
      reason: string,
    ): Intervention => ({
      mode,
      triggers,
      blockedBy,
      dominant,
      prescription: mode === "card" ? prescription : null,
      turnDrop,
      windowDrop,
      reason,
    });

    // B2 — 명시적 거절 이후에는 처방을 내지 않는다. 재접근은 컴플레인이 된다.
    if (rejectedFrom !== null) {
      decisions.push(
        decide("closing", "B2", "고객이 명시적으로 거절했습니다 — 정중히 종료만 안내하세요."),
      );
      continue;
    }

    // B1 — 직전 3턴 내 이미 개입
    const recentlyFired = decisions
      .slice(Math.max(0, i - B1_COOLDOWN_TURNS), i)
      .some((d) => d.mode === "card" || d.mode === "ops");
    if (recentlyFired) {
      decisions.push(
        decide("hold", "B1", `${detail} — 직전 개입 직후라 알림을 보류합니다.`),
      );
      continue;
    }

    // B3 — 상담사가 이미 "그 축의" 처방 방향으로 대응 중. 축이 어긋난 대응
    // (관심이 식었는데 재촉만 하는 경우)은 관망 사유가 되지 못한다.
    if (dominant && current.counselorAddressing === dominant.axis) {
      decisions.push(
        decide("hold", "B3", `${detail} — 상담사가 이미 대응 중이라 관망합니다.`),
      );
      continue;
    }

    // B4 — 직전 2턴 연속 상승 추세
    const rising =
      i >= 2 &&
      current.temperature > snapshots[i - 1].temperature &&
      snapshots[i - 1].temperature > snapshots[i - 2].temperature;
    if (rising) {
      decisions.push(decide("hold", "B4", `${detail} — 두 턴 연속 상승 중이라 관망합니다.`));
      continue;
    }

    // B5 — 하락 요인의 과반이 상담사 귀책이면 고객 처방이 아니라 운영 알림
    if (serviceFaultDominates(current)) {
      decisions.push(
        decide("ops", "B5", `${detail} — 하락의 과반이 응답 지연·설명 반복입니다.`),
      );
      continue;
    }

    decisions.push(decide("card", null, detail));
  }

  return decisions;
}

export function latestIntervention(
  snapshots: TemperatureSnapshot[],
): Intervention {
  const decisions = evaluateInterventions(snapshots);
  return decisions[decisions.length - 1] ?? NONE;
}
