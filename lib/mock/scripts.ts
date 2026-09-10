import type { Message, ScriptStep } from "@/lib/types";

const MIN = 60_000;

/**
 * Preloaded messages per customer. Timestamps are offsets from session start
 * so replays are deterministic. 박윤수's opening five messages mirror the
 * Figma mock (14:18–14:22).
 */
export const initialMessages: Record<string, Message[]> = {
  park: [
    { id: "park-m1", role: "customer", text: "운전자보험은 월 보험료가 얼마인가요?", at: 0 },
    {
      id: "park-m2",
      role: "counselor",
      text: "원하시는 보장 범위에 따라 달라요. 간단히 몇 가지 여쭤봐도 될까요?",
      at: 1 * MIN,
    },
    { id: "park-m3", role: "customer", text: "일단 가격만 먼저 알고 싶어요.", at: 2 * MIN },
    {
      id: "park-m4",
      role: "counselor",
      text: "네, 기본형과 안심형 가설계표를 먼저 보내드릴게요.",
      at: 3 * MIN,
    },
    { id: "park-m5", role: "customer", text: "가장 저렴한 건 얼마예요?", at: 4 * MIN },
  ],
  kim: [
    { id: "kim-m1", role: "customer", text: "암보험 보장 내용을 더 보고 싶어요.", at: 0 },
  ],
  lee: [
    { id: "lee-m1", role: "customer", text: "보내주신 가설계표 확인했습니다.", at: 0 },
  ],
  choi: [
    { id: "choi-m1", role: "customer", text: "실손보험 상담 가능한가요?", at: 0 },
  ],
};

/**
 * Customer reply queue per customer. The counselor types freely; each send
 * consumes the next step. `expect` is the demo hint for what the script
 * assumes the counselor asks. A `branch` step pauses until the demo operator
 * picks one of the candidate replies — placed where the temperature should
 * visibly diverge.
 */
export const scripts: Record<string, ScriptStep[]> = {
  park: [
    {
      expect: "최저가 플랜 안내 + 정확한 견적을 위한 정보 입력 요청",
      customer: "정보 입력은 좀 그런데… 대략적인 금액만 먼저 알려주시면 안 돼요?",
    },
    {
      expect: "대략 금액 안내 + 가설계표 발송 제안",
      branch: [
        {
          label: "관심",
          customer: "그럼 기본형이랑 안심형은 뭐가 달라요? 보험료 차이가 큰가요?",
        },
        {
          label: "보류",
          customer: "음… 일단 좀 더 생각해보고 다시 연락드릴게요.",
        },
      ],
    },
    {
      expect: "보장 차이 설명 + 운전 패턴 질문",
      customer: "운전은 출퇴근용이에요. 벌금이나 변호사비용 같은 것도 다 보장되는 거죠?",
    },
    {
      expect: "보장 확인 + 가입 절차 안내",
      customer: "네, 그럼 안심형으로 가설계표 보내주세요. 남편 것도 같이 받을 수 있나요?",
    },
    {
      expect: "가설계표 발송 + 부부 할인 안내",
      customer: "네, 확인해 볼게요. 감사합니다!",
    },
  ],
  kim: [
    {
      expect: "암보험 보장 범위 안내",
      customer: "진단비 말고 치료비 지원도 포함인가요?",
    },
    {
      expect: "치료비 특약 설명",
      customer: "표적항암 치료도 되는지 궁금해요.",
    },
    {
      expect: "표적항암 특약 안내 + 가설계표 제안",
      customer: "네, 가설계표 한번 보내주세요.",
    },
  ],
  lee: [
    {
      expect: "가설계표 관련 후속 안내",
      customer: "월 납입액을 조금 줄일 수 있는 옵션이 있을까요?",
    },
  ],
  choi: [
    {
      expect: "상담 시작 인사 + 니즈 파악",
      customer: "네, 병원 자주 다녀서 실손 하나 들어두려고요.",
    },
  ],
};
