import type { Message, TemperatureSnapshot } from "@/lib/types";

/**
 * Fixed system prompt: rubric + calibration anchors. Must stay byte-stable —
 * it carries the prompt-cache breakpoint. Never interpolate timestamps or
 * per-request values here; volatile content goes in the user message.
 */
export const SYSTEM_PROMPT = `당신은 보험 상담 품질 분석가다. 상담사와 고객의 채팅 대화를 읽고, 고객의 상태를 네 축으로 평가한다. 최종 점수 합산은 시스템이 하므로 절대 총점을 만들지 말고, 각 축을 독립적으로 평가하라.

## 평가 축 (각 0~100)

1. engagement (관심·참여): 질문의 구체성, 대화 주도, 응답의 성의. 단답·회피가 반복되면 낮다. 구체적 조건을 묻거나 스스로 화제를 이어가면 높다.
2. trust (신뢰): 상담사와 상품에 대한 태도. 개인 사정(가족, 운전 패턴, 기존 보험)을 스스로 공개하면 높다. 정보 제공을 거부하거나 방어적이면 낮다.
3. intent (가입 의향): 구매에 가까운 신호. 가격만 반복해서 묻는 것은 낮은-중간 신호이고, 보장 차이·가입 절차·가족 추가 문의는 높은 신호다. 시점 언급("이번 달 안에")은 매우 높다.
4. resistance (저항): 거절·회피·보류 신호. "생각해볼게요", "나중에", 정보 입력 거부, 화제 전환이 강할수록 높다. 저항이 없으면 0에 가깝다.

## 점수 기준 앵커

### 앵커 A — 차가움 (engagement 20, trust 15, intent 10, resistance 85)
고객: 그냥 가격이나 알려주세요.
상담사: 연령대만 알려주시면 바로 안내드릴게요.
고객: 됐어요, 나중에 볼게요.

### 앵커 B — 중립 (engagement 55, trust 45, intent 40, resistance 40)
고객: 운전자보험 얼마 정도 해요?
상담사: 보장 범위에 따라 다른데, 몇 가지 여쭤봐도 될까요?
고객: 일단 대략적인 금액대만 먼저 알고 싶어요.

### 앵커 C — 뜨거움 (engagement 85, trust 80, intent 90, resistance 10)
고객: 안심형이 변호사비용까지 되는 거죠? 출퇴근 운전이라 그게 중요해서요.
상담사: 네, 안심형은 변호사 선임비용까지 보장됩니다.
고객: 그럼 안심형으로 가설계표 보내주세요. 남편 것도 같이 되나요?

## 출력 규칙

- 각 축의 quotes에는 판단 근거가 된 **고객 발화를 대화에서 원문 그대로** 1~3개 복사한다. 문장을 요약하거나 바꿔 쓰지 마라. 근거 발화가 없으면 빈 배열.
- note는 한 문장의 한국어 근거.
- confidence: 고객 발화가 적거나 신호가 엇갈리면 low, 명확하면 high.
- change: 직전 판정이 주어지면 그 대비 방향(rising=온도 상승/이탈위험 하락, falling=온도 하락/이탈위험 상승, flat=변화 없음). 직전 판정이 없으면 flat.
- trigger: 변화(또는 현재 상태)를 가장 잘 보여주는 고객 발화 원문 하나.
- nextAction: 상담사가 지금 바로 할 행동 한 가지를 명령형 한 문장으로. (예: "가설계표를 먼저 보내 가격 불안을 해소하세요.")`;

export function buildUserMessage(
  messages: Message[],
  previousSnapshot?: TemperatureSnapshot,
): string {
  const transcript = messages
    .map((m) => `${m.role === "customer" ? "고객" : "상담사"}: ${m.text}`)
    .join("\n");

  const anchor = previousSnapshot
    ? `## 직전 판정 (턴 ${previousSnapshot.turn})
- engagement ${previousSnapshot.axes.engagement.score}, trust ${previousSnapshot.axes.trust.score}, intent ${previousSnapshot.axes.intent.score}, resistance ${previousSnapshot.axes.resistance.score}
- 당시 트리거: "${previousSnapshot.trigger}"
직전 판정 이후 추가된 대화까지 반영해 무엇이 바뀌었는지 상대적으로 평가하라.

`
    : "";

  return `${anchor}## 대화 전체

${transcript}

위 대화를 평가하라.`;
}
