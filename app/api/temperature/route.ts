import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  AXIS_KEYS,
  ReadingSchema,
  type AxisKey,
  type AxisReading,
  type Message,
  type Reading,
  type TemperatureSnapshot,
} from "@/lib/types";
import { bandFromRisk, computeTemperature, riskFromTemperature } from "@/lib/score";
import { resolveQuotes } from "@/lib/quotes";
import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/prompt";

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["counselor", "customer"]),
        text: z.string(),
        at: z.number(),
      }),
    )
    .min(1),
  previousSnapshot: z.looseObject({ turn: z.number() }).optional(),
});

const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

function toSnapshot(reading: Reading, messages: Message[]): TemperatureSnapshot {
  let confidence = reading.confidence;
  const axes = {} as Record<AxisKey, AxisReading>;
  const scores = {} as Record<AxisKey, number>;

  for (const key of AXIS_KEYS) {
    const axis = reading[key];
    const { resolved } = resolveQuotes(axis.quotes, messages);
    // every quote for this axis was hallucinated → downgrade confidence
    if (axis.quotes.length > 0 && resolved.length === 0) confidence = "low";
    scores[key] = clamp(axis.score);
    axes[key] = { score: scores[key], quotes: resolved, note: axis.note };
  }

  const temperature = computeTemperature(scores);
  const risk = riskFromTemperature(temperature);
  const turn = messages.filter((m) => m.role === "customer").length;

  return {
    turn,
    axes,
    temperature,
    risk,
    band: bandFromRisk(risk),
    confidence,
    change: reading.change,
    trigger: reading.trigger,
    nextAction: reading.nextAction,
  };
}

/** deterministic keyword-based reading so the demo runs without an API key */
function mockReading(messages: Message[], previousRisk?: number): Reading {
  const customer = messages.filter((m) => m.role === "customer");
  const text = customer.map((m) => m.text).join(" ");
  const count = (re: RegExp) => (text.match(re) ?? []).length;

  const priceHits = count(/얼마|가격|저렴|비싸/g);
  const intentHits = count(/보내주세요|가입|절차|달라요|같이 되|보장되는|중요해서/g);
  const resistHits = count(/생각해|나중에|됐어요|좀 그런데|입력은/g);

  const scores: Record<AxisKey, number> = {
    engagement: clamp(30 + customer.length * 5 + intentHits * 8 - resistHits * 10),
    trust: clamp(42 + intentHits * 8 - resistHits * 14 - (priceHits > 2 ? 8 : 0)),
    intent: clamp(28 + intentHits * 14 - priceHits * 4 - resistHits * 14),
    resistance: clamp(18 + resistHits * 22 + priceHits * 8 - intentHits * 12),
  };

  const pick = (re: RegExp) =>
    customer
      .filter((m) => re.test(m.text))
      .slice(-2)
      .map((m) => m.text);
  const last = customer[customer.length - 1]?.text ?? "";

  const risk = riskFromTemperature(computeTemperature(scores));
  const change =
    previousRisk === undefined || Math.abs(risk - previousRisk) < 3
      ? "flat"
      : risk < previousRisk
        ? "rising"
        : "falling";

  const nextAction =
    risk >= 70
      ? "정보 요구를 멈추고 가설계표를 먼저 보내 가격 불안을 해소하세요."
      : risk >= 50
        ? "가격 안내와 함께 보장 차이를 한 줄로 요약해 주도권을 되찾으세요."
        : risk >= 30
          ? "고객이 물어본 보장 조건을 구체적으로 확인해 주세요."
          : "가입 절차를 안내하고 마무리 단계로 진행하세요.";

  return {
    engagement: { score: scores.engagement, quotes: pick(/달라요|보장|중요/), note: "질문 구체성 기준 추정치(mock)" },
    trust: { score: scores.trust, quotes: pick(/입력은|출퇴근|남편/), note: "정보 공개 여부 기준 추정치(mock)" },
    intent: { score: scores.intent, quotes: pick(/보내주세요|가입|얼마/), note: "구매 신호 키워드 기준 추정치(mock)" },
    resistance: { score: scores.resistance, quotes: pick(/생각해|나중에|좀 그런데/), note: "회피 표현 기준 추정치(mock)" },
    confidence: customer.length >= 4 ? "medium" : "low",
    change,
    trigger: last,
    nextAction,
  };
}

export async function POST(req: Request) {
  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
  const messages = parsed.data.messages as Message[];
  const previousSnapshot = parsed.data.previousSnapshot as
    | TemperatureSnapshot
    | undefined;

  if (process.env.TEMPERATURE_MOCK === "1" || !process.env.ANTHROPIC_API_KEY) {
    const reading = mockReading(messages, previousSnapshot?.risk);
    return Response.json(toSnapshot(reading, messages));
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: buildUserMessage(messages, previousSnapshot) },
    ],
    output_config: {
      format: zodOutputFormat(ReadingSchema),
      effort: "low",
    },
  });

  const reading = response.parsed_output;
  if (!reading) {
    return Response.json(
      { error: "analysis output could not be parsed" },
      { status: 502 },
    );
  }

  return Response.json(toSnapshot(reading, messages));
}
