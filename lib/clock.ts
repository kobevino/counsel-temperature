import type { Message } from "@/lib/types";
import type { Detection } from "@/lib/signals";
import { activeMinutesBetween } from "@/lib/time";

const FAST_REPLY_MIN = 2;
const COUNSELOR_DELAY_MIN = 3;

/** 무응답 단계 — 넘긴 단계는 모두 한 번씩 적용된다 (10분 → 30분 → 3시간 → 8시간) */
const SILENCE_TIERS: { minutes: number; code: Detection["code"] }[] = [
  { minutes: 10, code: "clock.silence_10m" },
  { minutes: 30, code: "clock.silence_30m" },
  { minutes: 180, code: "clock.silence_3h" },
  { minutes: 480, code: "clock.silence_8h" },
];

/**
 * 상담사 쪽 무응답 단계 — 고객 침묵과 같은 원리로 "지금 이어지고 있는"
 * 무응답만 센다. 상담사가 답하는 순간 재계산에서 빠져 온도가 되살아나고,
 * 늦게라도 답했다는 흉터는 counselor_delay(3분)가 따로 남긴다.
 */
const COUNSELOR_SILENCE_TIERS: { minutes: number; code: Detection["code"] }[] = [
  { minutes: 5, code: "clock.counselor_silent_5m" },
  { minutes: 15, code: "clock.counselor_silent_15m" },
];

const gapMinutes = (a: Message, b: Message) => (b.at - a.at) / 60_000;

/**
 * 타임스탬프에서 직접 읽히는 신호. LLM에 맡기면 시계 계산을 틀리므로
 * 이쪽은 전부 시스템이 센다.
 *
 * 무응답은 "지금 이어지고 있는 침묵"만 계산한다 — 중간에 끊겼다가 고객이
 * 다시 답한 구간은 이미 대화로 회복된 것으로 본다.
 */
export function clockDetections(
  messages: Message[],
  startedAt: string,
): Detection[] {
  const detections: Detection[] = [];
  let lastCustomer: Message | undefined;
  let pendingQuestion: Message | undefined;

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const prev = messages[i - 1];

    if (message.role === "customer") {
      if (prev?.role === "counselor" && gapMinutes(prev, message) < FAST_REPLY_MIN) {
        detections.push({ code: "clock.fast_reply", quote: message.text });
      }
      if (
        lastCustomer &&
        lastCustomer.text.length >= 8 &&
        message.text.length * 2 <= lastCustomer.text.length
      ) {
        detections.push({ code: "engage.shorter_reply", quote: message.text });
      }
      lastCustomer = message;
      pendingQuestion = message;
      continue;
    }

    // 고객 질문에 상담사가 늦게 답한 경우 (연속 발화의 두 번째부터는 세지 않는다)
    if (pendingQuestion && gapMinutes(pendingQuestion, message) >= COUNSELOR_DELAY_MIN) {
      detections.push({ code: "clock.counselor_delay", quote: message.text });
    }
    pendingQuestion = undefined;
  }

  const last = messages[messages.length - 1];
  if (lastCustomer && last && last.id !== lastCustomer.id) {
    const silence = activeMinutesBetween(startedAt, lastCustomer.at, last.at);
    for (const tier of SILENCE_TIERS) {
      if (silence >= tier.minutes) detections.push({ code: tier.code, quote: "" });
    }
  }

  // 상담사 무응답 — 마지막 상담사 발화 이후 첫 고객 발화(답을 기다리기 시작한
  // 시점)부터 지금까지. 고객이 재촉을 이어가도 기다림은 한 덩어리다.
  const lastCounselorIdx = messages.findLastIndex((m) => m.role === "counselor");
  const firstWaiting = messages
    .slice(lastCounselorIdx + 1)
    .find((m) => m.role === "customer");
  if (firstWaiting && last) {
    const waiting = activeMinutesBetween(startedAt, firstWaiting.at, last.at);
    for (const tier of COUNSELOR_SILENCE_TIERS) {
      if (waiting >= tier.minutes) detections.push({ code: tier.code, quote: "" });
    }
  }

  return detections;
}

/** 야간을 제외한 현재 무응답 시간(분). 고객이 마지막 발화자면 0 */
export function silenceMinutes(messages: Message[], startedAt: string): number {
  const last = messages[messages.length - 1];
  const lastCustomer = [...messages].reverse().find((m) => m.role === "customer");
  if (!last || !lastCustomer || last.id === lastCustomer.id) return 0;
  return activeMinutesBetween(startedAt, lastCustomer.at, last.at);
}
