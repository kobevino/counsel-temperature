import type { AxisKey } from "@/lib/types";
import { INITIAL_AXES } from "@/lib/score";

/**
 * 온도 로직 v2의 축별 증감 테이블.
 *
 * 축 점수는 LLM이 직접 매기지 않는다. LLM(또는 mock 감지기)은 "어떤 신호가
 * 있었는지"만 코드로 집어내고, 초기값에서 그 신호들의 Δ를 누적하는 산술은
 * 시스템이 한다 — 같은 대화에서 같은 점수가 나와야 시연이 성립한다.
 */

export type AxisEffects = Partial<Record<AxisKey, number>>;

/** customer/counselor = 발화 기반(LLM 감지), clock = 타임스탬프 기반(시스템 계산) */
export type SignalSource = "customer" | "counselor" | "clock";

export type SignalDef = {
  label: string;
  source: SignalSource;
  effects: AxisEffects;
  /** 같은 신호가 두 번째부터 반복될 때의 Δ (없으면 effects를 그대로 반복 적용) */
  repeatEffects?: AxisEffects;
  /** 한 상담에서 이 신호가 한 축에 누적으로 줄 수 있는 최대 절대치 */
  maxTotal?: number;
  /** LLM 감지 지침 — 프롬프트에 그대로 실린다 */
  hint: string;
};

export const SIGNALS = {
  // ---------- intent (가중 0.40) ----------
  "intent.commit": {
    label: "가입 의사 표명",
    source: "customer",
    effects: { intent: 35 },
    hint: '"가입할게요", "진행할게요" 처럼 가입을 결정한 발화',
  },
  "intent.timing": {
    label: "시점 언급",
    source: "customer",
    effects: { intent: 25 },
    hint: '고객이 자기 가입 시점을 말한 경우 — "이번 달 안에", "다음 달부터", "바로 할게요". "지금 드는 게 나을까요" 같은 시기 상담 질문은 해당하지 않는다',
  },
  "intent.process": {
    label: "가입 절차 문의",
    source: "customer",
    effects: { intent: 20 },
    hint: '"어떻게 하면 되나요", "뭐부터 하면 되죠" 처럼 절차를 물음',
  },
  "intent.family": {
    label: "가족 추가 문의",
    source: "customer",
    effects: { intent: 15 },
    hint: '"아이도 같이 되나요", "남편 것도 되나요" 처럼 가족 가입을 물음',
  },
  "intent.inquiry": {
    label: "보장 차이·금액 문의",
    source: "customer",
    effects: { intent: 8 },
    hint: "보장 범위·보험료를 묻는 일반 문의 (구매 직전 신호는 아님)",
  },
  "intent.price_burden": {
    label: "가격 부담 표명",
    source: "customer",
    effects: { intent: -8, resistance: 25 },
    repeatEffects: { intent: -8, resistance: 15 },
    hint: '"그렇게 비싸요?", "부담되는데요" 처럼 금액이 부담이라고 말함',
  },
  "intent.alt_request": {
    label: "다른 상품 요구",
    source: "customer",
    effects: { intent: -12 },
    hint: "지금 제안을 거부하고 다른 상품·다른 설계를 요구함",
  },
  hold: {
    label: "보류 발화",
    source: "customer",
    effects: { intent: -30, resistance: 30 },
    hint: '"조금 더 알아볼게요", "생각해볼게요", "나중에 연락드릴게요" — 완곡한 거절',
  },
  reject: {
    label: "명시적 거절",
    source: "customer",
    effects: { intent: -45, resistance: 15 },
    hint: '"됐어요", "다른 데서 알아볼게요", "안 할게요" — 대화를 끝내는 거절',
  },

  // ---------- engagement (가중 0.25) ----------
  "engage.self_topic": {
    label: "스스로 화제 이어가기",
    source: "customer",
    effects: { engagement: 10 },
    hint: "상담사가 묻지 않았는데 스스로 다음 논점을 꺼내거나 자기 해석을 덧붙임",
  },
  "engage.detail_question": {
    label: "구체적 조건 질문",
    source: "customer",
    effects: { engagement: 8 },
    hint: "금액·한도·면책기간·조건 등 구체적인 것을 물음",
  },
  "engage.minimal_reply": {
    label: "최소 응답",
    source: "customer",
    effects: { engagement: -15 },
    hint: '"네", "아 네", "음" 처럼 내용 없는 단답',
  },
  "engage.shorter_reply": {
    label: "발화 길이 절반 이하로 감소",
    source: "clock",
    effects: { engagement: -12 },
    hint: "직전 자기 발화의 절반 이하로 짧아짐 (시스템이 글자 수로 계산)",
  },
  "engage.topic_shift": {
    label: "화제 전환",
    source: "customer",
    effects: { engagement: -10, resistance: 15 },
    hint: "상담 중인 상품과 무관한 쪽으로 화제를 돌림",
  },

  // ---------- trust (가중 0.20) ----------
  "trust.disclosure": {
    label: "개인 사정 자발 공개",
    source: "customer",
    effects: { trust: 18 },
    hint: "묻지 않은 가족·운전 패턴·기존 보험·직업 사정을 스스로 말함",
  },
  "trust.direct_answer": {
    label: "요청에 즉답 받음",
    source: "counselor",
    effects: { trust: 12 },
    // 성실한 응대가 반복된다고 신뢰가 무한히 쌓이지는 않는다
    maxTotal: 24,
    hint: "고객이 물은 금액·조건을 상담사가 되묻지 않고 바로 알려줌",
  },
  "trust.purpose_explained": {
    label: "수집 목적 설명을 들음",
    source: "counselor",
    effects: { trust: 10 },
    hint: "어떤 정보를 왜 쓰는지 구체적으로 설명함. \"정보 몇 가지만 여쭤볼게요\" 같은 예고는 목적 설명이 아니다",
  },
  "trust.demand_no_purpose": {
    label: "목적 설명 없는 정보 요구",
    source: "counselor",
    effects: { trust: -15 },
    hint: "개인정보(성함·생년월일·주소·직업·차량번호 등)를 요구하거나 요구하겠다고 예고하면서 그 정보가 왜 필요한지는 밝히지 않음. 고객이 먼저 가입 의사를 밝히거나 절차를 물은 뒤의 정보 안내는 해당하지 않는다",
  },
  "trust.repeat_demand": {
    label: "이미 준 정보를 다시 요구",
    source: "counselor",
    effects: { trust: -15 },
    hint: "고객이 이미 말한 정보나 이미 한 설명을 다시 요구·반복함",
  },
  "trust.info_refusal": {
    label: "정보 입력 거부",
    source: "customer",
    effects: { trust: -20, resistance: 20 },
    hint: '"그냥 대략만 알고 싶은데요", "왜 그것까지 물어보세요" — 정보 제공을 거부',
  },
  "trust.coercion_doubt": {
    label: "가입 강요 의심",
    source: "customer",
    effects: { trust: -25 },
    hint: '"가입 강요하는 거 아니죠?", "팔려고 그러는 거죠?"',
  },

  // ---------- resistance (가중 0.15 · 역산) ----------
  "resist.condition_complaint": {
    label: "조건 불만",
    source: "customer",
    effects: { resistance: 10 },
    hint: '"2년은 기네요" 처럼 조건 자체에 대한 불만 (가격 불만은 intent.price_burden)',
  },
  "resist.alt_accepted": {
    label: "대안 수용",
    source: "customer",
    effects: { resistance: -30 },
    hint: '상담사가 낮춘 안·대안을 받아들임 ("이 정도면 해볼 만하네요")',
  },
  "resist.positive": {
    label: "긍정 표현",
    source: "customer",
    effects: { resistance: -20 },
    hint: '"좋네요", "괜찮네요", "감사해요" 같은 긍정 반응',
  },
  "resist.concern_resolved": {
    label: "우려가 해소됨",
    source: "customer",
    effects: { resistance: -15 },
    hint: "앞서 말한 걱정이 상담사 답변으로 풀렸다고 고객이 인정함",
  },

  // ---------- clock (시스템 계산 · LLM은 감지하지 않는다) ----------
  "clock.fast_reply": {
    label: "2분 내 응답",
    source: "clock",
    effects: { engagement: 4 },
    // 빠른 응답만으로 engagement가 무한정 오르지 않도록 누적 상한을 둔다
    maxTotal: 12,
    hint: "직전 상담사 발화로부터 2분 안에 답함",
  },
  "clock.counselor_delay": {
    label: "상담사 응답 3분 이상 지연",
    source: "clock",
    effects: { trust: -10 },
    hint: "고객 질문에 상담사가 3분 넘게 답하지 않음",
  },
  "clock.silence_10m": {
    label: "무응답 10분",
    source: "clock",
    effects: { engagement: -10 },
    hint: "고객 무응답이 10분을 넘김 (야간 22:00~08:00 제외)",
  },
  "clock.silence_30m": {
    label: "무응답 30분",
    source: "clock",
    effects: { engagement: -20, resistance: 10 },
    hint: "고객 무응답이 30분을 넘김 (야간 제외)",
  },
  "clock.silence_3h": {
    label: "무응답 3시간",
    source: "clock",
    effects: { engagement: -35, intent: -10 },
    hint: "고객 무응답이 3시간을 넘김 (야간 제외)",
  },
  "clock.silence_8h": {
    label: "무응답 8시간(하루 넘김)",
    source: "clock",
    effects: { engagement: -50, intent: -8 },
    hint: "야간을 제외한 실 경과가 8시간을 넘김 — 사실상 하루가 지난 무응답",
  },
} as const satisfies Record<string, SignalDef>;

export type SignalCode = keyof typeof SIGNALS;

export const SIGNAL_CODES = Object.keys(SIGNALS) as SignalCode[];

/** 발화로 판단하는 신호만 LLM이 고른다 — 시간 신호는 타임스탬프로 계산한다 */
export const LLM_SIGNAL_CODES = SIGNAL_CODES.filter(
  (code) => SIGNALS[code].source !== "clock",
);

/** 하락 요인이 상담사 귀책(응답 지연·설명 반복)인지 판정할 때 쓰는 코드 — B5 */
export const SERVICE_FAULT_CODES: SignalCode[] = [
  "clock.counselor_delay",
  "trust.repeat_demand",
];

/** 온도를 올리는 쪽의 신호인가 (저항은 내려가야 긍정) */
export function isPositiveSignal(code: SignalCode): boolean {
  return Object.entries(SIGNALS[code].effects as AxisEffects).some(
    ([axis, delta]) => (axis === "resistance" ? delta < 0 : delta > 0),
  );
}

export type Detection = {
  code: SignalCode;
  /** 근거 발화 원문. 시간 신호는 빈 문자열 */
  quote: string;
};

export type Contribution = Detection & {
  label: string;
  effects: AxisEffects;
};

/**
 * 감지된 신호를 초기값에 순서대로 누적해 축 점수를 만든다.
 * 각 신호를 적용할 때마다 0~100으로 자르므로, 한 번 바닥을 친 축이
 * 음수로 더 내려갔다가 뒤늦게 되살아나는 일은 없다.
 */
export function applyDetections(
  detections: Detection[],
  baseline: Record<AxisKey, number> = INITIAL_AXES,
): { axes: Record<AxisKey, number>; contributions: Contribution[] } {
  const axes = { ...baseline };
  const seen = new Map<SignalCode, number>();
  const spent = new Map<SignalCode, number>();
  const contributions: Contribution[] = [];

  for (const detection of detections) {
    const def = SIGNALS[detection.code] as SignalDef | undefined;
    if (!def) continue;

    const count = seen.get(detection.code) ?? 0;
    seen.set(detection.code, count + 1);
    const base = count > 0 ? (def.repeatEffects ?? def.effects) : def.effects;

    // 누적 상한이 있는 신호는 남은 만큼만 반영한다
    const applied: AxisEffects = {};
    for (const [axis, delta] of Object.entries(base) as [AxisKey, number][]) {
      let value = delta;
      if (def.maxTotal !== undefined) {
        const used = spent.get(detection.code) ?? 0;
        const room = Math.max(0, def.maxTotal - used);
        value = Math.sign(delta) * Math.min(Math.abs(delta), room);
        spent.set(detection.code, used + Math.abs(value));
      }
      if (value === 0) continue;
      applied[axis] = value;
      axes[axis] = Math.min(100, Math.max(0, axes[axis] + value));
    }

    if (Object.keys(applied).length === 0) continue;
    contributions.push({ ...detection, label: def.label, effects: applied });
  }

  return { axes, contributions };
}
