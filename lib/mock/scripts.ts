import type { Message } from "@/lib/types";

const MIN = 60_000;

/**
 * 시연 시작 시점에 화면에 이미 떠 있는 메시지 수 —
 * 첫 고객 질문까지만. (상담사 인사로 시작하는 대본이면 인사 + 첫 질문)
 * 나머지는 발표자가 메시지를 보낼 때마다 한 턴씩 재생된다.
 */
export function openingCount(script: Message[]): number {
  const first = script.findIndex((m) => m.role === "customer");
  return first === -1 ? Math.min(1, script.length) : first + 1;
}

/**
 * 시연 대본. 타임스탬프는 각 고객의 상담 시작 시각(customers.startedAt)으로부터의
 * 오프셋(ms)이라 재생이 항상 동일하다. 대본이 끝난 뒤부터는 페르소나 응답
 * 엔진(/api/customer-reply)이 고객을 이어서 연기한다.
 *
 * jung(A) 긍정 — 순조로운 전환
 * han(B)  긍정 — 가격 저항 후 대안으로 전환
 * park(C) 이탈 — 보류 ("더 알아보겠다")
 * choi(D) 이탈 — 답변 지연 (고객 발화는 13:44가 마지막, 이후 상담사만 발화)
 * oh(E)   이탈 — 개인정보 부담 → 거절
 */
export const initialMessages: Record<string, Message[]> = {
  // A. 치아보험 · 40대 여 — 16:10 시작
  jung: [
    { id: "jung-m1", role: "customer", text: "치아보험 임플란트 보장되나요?", at: 0 },
    { id: "jung-m2", role: "counselor", text: "네, 개당 최대 150만원까지 보장됩니다.", at: 0 },
    { id: "jung-m3", role: "customer", text: "좋네요 몇 개까지 되나요", at: 2 * MIN },
    {
      id: "jung-m4",
      role: "counselor",
      text: "연간 3개까지 가능하고 면책기간은 2년입니다.",
      at: 3 * MIN,
    },
    {
      id: "jung-m5",
      role: "customer",
      text: "2년은 좀 기네요 근데 어차피 미리 드는 거니까",
      at: 5 * MIN,
    },
    {
      id: "jung-m6",
      role: "counselor",
      text: "맞습니다. 지금 가입하시면 2028년부터 보장돼요.",
      at: 6 * MIN,
    },
    { id: "jung-m7", role: "customer", text: "보험료는 얼마예요?", at: 7 * MIN },
    {
      id: "jung-m8",
      role: "counselor",
      text: "40대 여성 기준 월 2만 4천원입니다.",
      at: 7 * MIN,
    },
    {
      id: "jung-m9",
      role: "customer",
      text: "네 그럼 가입할게요 어떻게 하면 되나요",
      at: 9 * MIN,
    },
    { id: "jung-m10", role: "counselor", text: "정보 입력 도와드릴게요!", at: 9 * MIN },
    { id: "jung-m11", role: "customer", text: "넵 바로 할게요", at: 10 * MIN },
  ],

  // B. 3대진단비 · 50대 여 — 10:22 시작
  han: [
    { id: "han-m1", role: "customer", text: "암이랑 뇌 그런 거 묶어서 들 수 있나요?", at: 0 },
    {
      id: "han-m2",
      role: "counselor",
      text: "네, 3대 진단비로 한 번에 설계 가능합니다.",
      at: 0,
    },
    { id: "han-m3", role: "customer", text: "지금 나이에도 되나요", at: 2 * MIN },
    {
      id: "han-m4",
      role: "counselor",
      text: "50대도 가능하세요. 암 5천, 뇌·심장 3천이 기준입니다.",
      at: 3 * MIN,
    },
    { id: "han-m5", role: "customer", text: "그러면 한 달에 얼마 나와요", at: 4 * MIN },
    {
      id: "han-m6",
      role: "counselor",
      text: "50대 여성 기준 월 14만 2천원입니다.",
      at: 5 * MIN,
    },
    { id: "han-m7", role: "customer", text: "어머 그렇게 비싸요?", at: 6 * MIN },
    { id: "han-m8", role: "counselor", text: "보장 금액이 커서 그렇습니다.", at: 7 * MIN },
    {
      id: "han-m9",
      role: "customer",
      text: "남편 것까지 하면 30만원 가까이인데",
      at: 9 * MIN,
    },
    {
      id: "han-m10",
      role: "counselor",
      text: "두 분 같이 하시면 조정 가능합니다.",
      at: 10 * MIN,
    },
    { id: "han-m11", role: "customer", text: "그래도 부담되는데요", at: 11 * MIN },
    {
      id: "han-m12",
      role: "counselor",
      text: "보장을 조금 낮춘 안으로 먼저 보여드릴게요.",
      at: 12 * MIN,
    },
    {
      id: "han-m13",
      role: "counselor",
      text: "[가설계표] 암 3천·뇌심 2천 / 부부 합산 월 17만 8천원",
      at: 13 * MIN,
    },
    { id: "han-m14", role: "customer", text: "아 이 정도면 해볼 만하네요", at: 15 * MIN },
    { id: "han-m15", role: "customer", text: "이걸로 두 분 같이 하면 되나요?", at: 16 * MIN },
    {
      id: "han-m16",
      role: "counselor",
      text: "네, 두 분 정보만 확인해서 진행하겠습니다.",
      at: 16 * MIN,
    },
  ],

  // C. 종신보험 · 30대 남 — 11:15 시작
  park: [
    { id: "park-m1", role: "customer", text: "종신보험 지금 드는게 나을까요?", at: 0 },
    {
      id: "park-m2",
      role: "counselor",
      text: "젊을 때 드시면 보험료가 고정돼서 유리합니다.",
      at: 1 * MIN,
    },
    { id: "park-m3", role: "customer", text: "아 그렇구나", at: 3 * MIN },
    {
      id: "park-m4",
      role: "counselor",
      text: "사망보장 1억이면 월 11만원 정도예요.",
      at: 4 * MIN,
    },
    { id: "park-m5", role: "customer", text: "네 생각보다 괜찮네요", at: 6 * MIN },
    {
      id: "park-m6",
      role: "counselor",
      text: "가설계표 보내드릴게요. 정보 몇 가지만 여쭤볼게요.",
      at: 7 * MIN,
    },
    { id: "park-m7", role: "customer", text: "아 네", at: 9 * MIN },
    {
      id: "park-m8",
      role: "counselor",
      text: "성함과 생년월일 먼저 알려주세요.",
      at: 10 * MIN,
    },
    { id: "park-m9", role: "customer", text: "조금 더 알아보고 연락드릴게요", at: 11 * MIN },
    {
      id: "park-m10",
      role: "counselor",
      text: "네 편하게 보시고 언제든 말씀해주세요.",
      at: 12 * MIN,
    },
  ],

  // D. 실손 4세대 전환 · 20대 여 — 13:38 시작. 고객 발화는 13:44가 마지막.
  choi: [
    { id: "choi-m1", role: "counselor", text: "안녕하세요! 실비 전환 문의 주셨네요.", at: 0 },
    { id: "choi-m2", role: "customer", text: "4세대로 바꾸면 얼마 싸져요?", at: 2 * MIN },
    {
      id: "choi-m3",
      role: "counselor",
      text: "현재 2세대시고, 전환하면 월 2만 6천원 줄어듭니다.",
      at: 3 * MIN,
    },
    {
      id: "choi-m4",
      role: "counselor",
      text: "대신 자기부담금이 20%로 올라가요.",
      at: 3 * MIN,
    },
    { id: "choi-m5", role: "customer", text: "자기부담금이 뭐예요?", at: 6 * MIN },
    {
      id: "choi-m6",
      role: "counselor",
      text: "병원비의 20%를 본인이 내시는 겁니다.",
      at: 7 * MIN,
    },
    { id: "choi-m7", role: "counselor", text: "전환 도와드릴까요?", at: 17 * MIN },
    { id: "choi-m8", role: "counselor", text: "확인되시면 말씀 주세요!", at: 37 * MIN },
    { id: "choi-m9", role: "counselor", text: "혹시 궁금한 점 있으실까요?", at: 222 * MIN },
    {
      id: "choi-m10",
      role: "counselor",
      text: "천천히 보시고 필요하실 때 연락 주세요.",
      // 익일 09:10 — 상담 시작(13:38)으로부터 19시간 32분
      at: 1172 * MIN,
    },
  ],

  // E. 운전자보험 · 50대 남 — 15:02 시작
  oh: [
    { id: "oh-m1", role: "customer", text: "운전자보험 광고 보고 문의드립니다", at: 0 },
    { id: "oh-m2", role: "counselor", text: "네! 견적 내드릴게요.", at: 1 * MIN },
    {
      id: "oh-m3",
      role: "counselor",
      text: "성함, 생년월일, 주소, 직업, 차량번호 알려주세요.",
      at: 1 * MIN,
    },
    { id: "oh-m4", role: "customer", text: "이거 가입 강요하는거 아니죠?", at: 3 * MIN },
    {
      id: "oh-m5",
      role: "counselor",
      text: "아닙니다. 정확한 견적을 위해 필요합니다.",
      at: 4 * MIN,
    },
    {
      id: "oh-m6",
      role: "customer",
      text: "그냥 대략 얼마인지만 알고 싶은데요",
      at: 5 * MIN,
    },
    {
      id: "oh-m7",
      role: "counselor",
      text: "조건에 따라 달라서 입력이 필요합니다.",
      at: 6 * MIN,
    },
    { id: "oh-m8", role: "customer", text: "왜 차량번호까지 물어보세요", at: 8 * MIN },
    { id: "oh-m9", role: "counselor", text: "대략 월 2만~3만 2천원입니다.", at: 9 * MIN },
    { id: "oh-m10", role: "customer", text: "됐어요 다른데서 알아볼게요", at: 10 * MIN },
  ],
};
