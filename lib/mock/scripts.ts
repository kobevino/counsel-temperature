import type { Message } from "@/lib/types";

const MIN = 60_000;

/**
 * Preloaded messages per customer. Timestamps are offsets from session start
 * so replays are deterministic. 박윤수's opening five messages mirror the
 * Figma mock (14:18–14:22). From here on the customer is driven by the
 * persona reply engine (/api/customer-reply), not a fixed script.
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
