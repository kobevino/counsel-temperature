import type { Message, Reading } from "@/lib/types";
import { SIGNALS, type AxisEffects, type Detection } from "@/lib/signals";

/**
 * API 키 없이 돌리는 결정적 감지기 (TEMPERATURE_MOCK=1).
 * LLM과 같은 신호 코드를 뱉고, 점수 계산은 똑같이 lib/signals.ts가 한다 —
 * 두 경로가 같은 산술을 쓰므로 mock 시연과 실서비스 곡선이 갈리지 않는다.
 */

// "아 그렇구나"는 내용 없는 단답이 아니라 이해했다는 반응이라 여기 넣지 않는다
const MINIMAL = /^(네{1,2}|넵|예|음+|아 ?네|아…네|알겠어요|그러네요)[.!~]*$/;

type Rule = { code: Detection["code"]; match: RegExp; unless?: RegExp };

// 순서대로 검사한다 — 거절이 보류보다 먼저다
const CUSTOMER_RULES: Rule[] = [
  { code: "reject", match: /됐어요|됐습니다|안 ?할게요|필요 ?없|다른 ?데서|그만할게요/ },
  {
    code: "hold",
    match: /알아보고|알아볼게요|생각해 ?볼게요|생각 좀|나중에|다음에 (연락|할게)/,
    unless: /됐어요|다른 ?데서/,
  },
  { code: "intent.commit", match: /가입할게요|가입하겠|진행할게요|진행하겠|신청할게요|그걸로 할게요/ },
  { code: "intent.timing", match: /이번 ?달|다음 ?달|이번 ?주|내일부터|바로 할게요|오늘 ?중/ },
  { code: "intent.process", match: /어떻게 하면 되|어떻게 하나요|어떻게 진행|절차|뭐부터/ },
  {
    code: "intent.family",
    match: /(남편|아내|배우자|아이|자녀|아들|딸|두 ?분)[^.?!]*(되나요|되죠|가능|같이 하면|할 수 있)/,
  },
  // "자기부담금"은 가격 저항이 아니라 상품 용어다
  { code: "intent.price_burden", match: /비싸|비싼|부담(?!금)|가까이|가까운데/ },
  { code: "intent.alt_request", match: /다른 (상품|거|걸|플랜|설계)|말고/ },
  {
    code: "intent.inquiry",
    match: /얼마|보험료|가격|보장|몇 개|차이|싸져|되나요|있나요|까요|하나요/,
  },
  { code: "trust.info_refusal", match: /그냥 대략|대략만|왜 .*(물어|필요)|입력은|알려드리기/ },
  { code: "trust.coercion_doubt", match: /강요|강매|팔려고|의무인가/ },
  {
    // "운전자보험"처럼 상품명에 들어간 단어는 개인 사정 공개가 아니다
    code: "trust.disclosure",
    match: /남편|아내|아이|자녀|출퇴근|운전(을|이|만|도) |기존 (보험|계약)|2세대|보유|직장/,
    unless: /되나요|되죠|가능한가|\?/,
  },
  { code: "resist.condition_complaint", match: /기네요|길네요|짧네요|아쉽|불편/ },
  { code: "resist.alt_accepted", match: /해볼 만|이 정도면|그걸로 하면/ },
  { code: "resist.positive", match: /좋네요|괜찮네요|감사|다행|마음에 (들|드)/ },
  { code: "resist.concern_resolved", match: /이해했|알겠네요|그럼 됐네|어차피|미리 드는/ },
];

const INFO_DEMAND = /성함|생년월일|주민등록|주소|직업|차량번호|정보 (몇 가지|입력|알려)/;
const PURPOSE = /위해|위한|때문에|목적|용도/;
const AMOUNT = /\d+\s*만|\d+\s*천원|월 \d/;
const PRICE_QUESTION = /얼마|보험료|가격|싸져/;
/** 상담사가 이미 실행한 처방 — 축별로 갈라서 본다 (B3) */
const ADDRESSING: [Exclude<Reading["counselorAddressing"], "none">, RegExp][] = [
  ["resistance", /낮춘|기한 없|부담 없이|천천히 결정/],
  ["trust", /대략|먼저 알려|정보 없이|목적|필요한 이유/],
  ["engagement", /요약|정리해서|비교표|천천히 보시고/],
  ["intent", /가설계표|대안|조정한|다른 설계/],
];

function customerSignals(text: string): Detection[] {
  const found: Detection[] = [];
  const minimal = MINIMAL.test(text.trim());
  if (minimal) found.push({ code: "engage.minimal_reply", quote: text });

  for (const rule of CUSTOMER_RULES) {
    if (minimal) break;
    if (!rule.match.test(text)) continue;
    if (rule.unless?.test(text)) continue;
    found.push({ code: rule.code, quote: text });
  }

  // 의심·거부·가격 저항이 실린 발화는 질문 형태여도 "관심"으로 세지 않는다.
  // (조건 불만은 저항만 건드리므로 여기서 빠진다 — 불만을 말하면서 대화를 이어가는
  //  발화는 관심이 살아 있는 쪽이다.)
  const guarded = found.some((f) => {
    const effects = SIGNALS[f.code].effects as AxisEffects;
    return (effects.intent ?? 0) < 0 || (effects.trust ?? 0) < 0;
  });

  if (!minimal && !guarded) {
    if (/\?|나요|예요|인가요|뭐예요/.test(text) && text.length >= 6) {
      found.push({ code: "engage.detail_question", quote: text });
    }
    if (/근데|그러면|그럼|어차피|그리고|사실/.test(text) && text.length >= 10) {
      found.push({ code: "engage.self_topic", quote: text });
    }
  }
  return found;
}

export function mockReading(messages: Message[]): Reading {
  const signals: Detection[] = [];
  let demanded = false;
  let lastCustomerText = "";
  let invited = false;

  for (const message of messages) {
    if (message.role === "customer") {
      const found = customerSignals(message.text);
      signals.push(...found);
      lastCustomerText = message.text;
      // 고객이 가입 의사·절차를 먼저 물었으면 그 뒤의 정보 요구는 목적이 분명하다
      invited = found.some(
        (f) => f.code === "intent.commit" || f.code === "intent.process",
      );
      continue;
    }

    const text = message.text;
    if (INFO_DEMAND.test(text) && !invited) {
      // 두 번째부터는 "이미 준 정보를 다시 요구"로 본다
      signals.push({
        code: demanded ? "trust.repeat_demand" : "trust.demand_no_purpose",
        quote: text,
      });
      demanded = true;
    } else if (PURPOSE.test(text)) {
      signals.push({ code: "trust.purpose_explained", quote: text });
    }
    if (AMOUNT.test(text) && PRICE_QUESTION.test(lastCustomerText)) {
      signals.push({ code: "trust.direct_answer", quote: text });
    }
  }

  const customer = messages.filter((m) => m.role === "customer");
  const trailing = messages.slice(
    messages.findLastIndex((m) => m.role === "customer") + 1,
  );

  return {
    openingTone: /강요|왜 자꾸|진짜 |아니 /.test(customer[0]?.text ?? "")
      ? "wary"
      : "neutral",
    signals,
    counselorAddressing:
      ADDRESSING.find(([, re]) => trailing.some((m) => re.test(m.text)))?.[0] ??
      "none",
    confidence: customer.length >= 3 ? "medium" : "low",
    trigger: customer[customer.length - 1]?.text ?? "",
    nextAction: "고객이 마지막에 말한 조건을 기준으로 다음 한 걸음을 안내하세요.",
  };
}
