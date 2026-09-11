import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  AXIS_KEYS,
  ReadingSchema,
  type AxisKey,
  type AxisReading,
  type Message,
  type Reading,
  type ResolvedSignal,
  type TemperatureSnapshot,
} from "@/lib/types";
import {
  bandFromTemperature,
  computeTemperature,
  INITIAL_AXES,
  WARY_AXES,
} from "@/lib/score";
import {
  applyDetections,
  isPositiveSignal,
  SIGNALS,
  type Detection,
} from "@/lib/signals";
import { clockDetections, silenceMinutes } from "@/lib/clock";
import { resolveQuote } from "@/lib/quotes";
import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/prompt";
import { mockReading } from "@/lib/mock/detect";

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
  startedAt: z.string().regex(/^\d{1,2}:\d{2}$/),
  previousSnapshot: z.looseObject({ turn: z.number() }).optional(),
});

const key = (d: { code: string; quote: string }) => `${d.code}::${d.quote}`;

/**
 * 환각 가드 — 근거 발화가 대화에 없는 신호는 점수에 넣기 전에 버린다.
 * 시간 신호(quote 없음)는 시스템이 만든 것이므로 통과시킨다.
 */
function validate(
  detections: Detection[],
  messages: Message[],
): { kept: Detection[]; quoteIds: Map<string, string>; dropped: number } {
  const kept: Detection[] = [];
  const quoteIds = new Map<string, string>();
  let dropped = 0;

  for (const detection of detections) {
    if (!SIGNALS[detection.code]) continue;
    if (!detection.quote) {
      kept.push(detection);
      continue;
    }
    const hit = resolveQuote(detection.quote, messages);
    if (!hit) {
      dropped += 1;
      continue;
    }
    quoteIds.set(detection.quote, hit.messageId);
    kept.push(detection);
  }
  return { kept, quoteIds, dropped };
}

/** 축별 근거 — 그 축을 움직인 신호의 라벨과 발화 */
function axisReading(
  score: number,
  signals: ResolvedSignal[],
  axis: AxisKey,
): AxisReading {
  const relevant = signals.filter((s) => s.effects[axis] !== undefined);
  const strongest = [...relevant].sort(
    (a, b) => Math.abs(b.effects[axis]!) - Math.abs(a.effects[axis]!),
  );

  const seen = new Set<string>();
  const quotes = [];
  for (const signal of strongest) {
    if (!signal.messageId || seen.has(signal.messageId)) continue;
    seen.add(signal.messageId);
    quotes.push({ messageId: signal.messageId, quote: signal.quote });
    if (quotes.length === 3) break;
  }

  const note =
    strongest
      .slice(0, 3)
      .map((s) => `${s.label} ${s.effects[axis]! > 0 ? "+" : "−"}${Math.abs(s.effects[axis]!)}`)
      .join(" · ") || "감지된 신호 없음 (초기값 유지)";

  return { score, quotes, note };
}

function toSnapshot(
  reading: Reading,
  messages: Message[],
  startedAt: string,
  previous?: TemperatureSnapshot,
): TemperatureSnapshot {
  const silence = silenceMinutes(messages, startedAt);

  // "넵 바로 할게요"처럼 짧아도 긍정 신호가 실린 발화는 이탈 신호가 아니다 —
  // 길이 감소 페널티에서 뺀다
  const positiveQuotes = new Set(
    reading.signals.filter((s) => isPositiveSignal(s.code)).map((s) => s.quote),
  );
  const clock = clockDetections(messages, startedAt).filter(
    (d) => !(d.code === "engage.shorter_reply" && positiveQuotes.has(d.quote)),
  );

  // 발화 신호를 대화 순서대로 먼저, 시간 신호는 그 뒤에 얹는다
  const { kept, quoteIds, dropped } = validate(
    [...reading.signals, ...clock],
    messages,
  );

  const baseline = reading.openingTone === "wary" ? WARY_AXES : INITIAL_AXES;
  const { axes: scores, contributions } = applyDetections(kept, baseline);

  const signals: ResolvedSignal[] = contributions.map((c) => ({
    code: c.code,
    label: c.label,
    quote: c.quote,
    messageId: c.quote ? (quoteIds.get(c.quote) ?? null) : null,
    effects: c.effects,
  }));

  // 직전 판정 이후 새로 잡힌 신호만 — B5 판정과 "이번 턴 근거"에 쓴다
  const before = new Set((previous?.signals ?? []).map(key));
  const turnSignals = signals.filter((s) => !before.has(key(s)));

  const axes = {} as Record<AxisKey, AxisReading>;
  for (const axis of AXIS_KEYS) {
    axes[axis] = axisReading(scores[axis], signals, axis);
  }

  const temperature = computeTemperature(scores);

  return {
    turn: messages.filter((m) => m.role === "customer").length,
    seq: messages.length,
    axes,
    temperature,
    band: bandFromTemperature(temperature),
    // 근거 발화가 통째로 환각이면 판정을 신뢰하지 않는다
    confidence: dropped > 0 && dropped >= reading.signals.length / 2 ? "low" : reading.confidence,
    trigger: reading.trigger,
    nextAction: reading.nextAction,
    signals,
    turnSignals,
    explicitRejection: signals.some((s) => s.code === "reject"),
    // B3은 "이미 대응 중"일 때만이다 — 마지막 고객 발화 뒤에 상담사 발화가
    // 실제로 있어야 한다. 없으면 상담사는 아직 아무것도 안 한 것이다.
    counselorAddressing:
      messages[messages.length - 1]?.role === "counselor"
        ? reading.counselorAddressing
        : "none",
    silenceMinutes: silence,
  };
}

export async function POST(req: Request) {
  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
  const { messages, startedAt } = parsed.data as {
    messages: Message[];
    startedAt: string;
  };
  const previousSnapshot = parsed.data.previousSnapshot as
    | TemperatureSnapshot
    | undefined;

  if (process.env.TEMPERATURE_MOCK === "1" || !process.env.OPENAI_API_KEY) {
    const reading = mockReading(messages);
    return Response.json(
      toSnapshot(reading, messages, startedAt, previousSnapshot),
    );
  }

  const client = new OpenAI();
  const response = await client.responses.parse({
    model: "gpt-5-mini",
    instructions: SYSTEM_PROMPT,
    input: buildUserMessage(
      messages,
      startedAt,
      silenceMinutes(messages, startedAt),
      previousSnapshot,
    ),
    reasoning: { effort: "low" },
    text: { format: zodTextFormat(ReadingSchema, "reading") },
  });

  const reading = response.output_parsed;
  if (!reading) {
    return Response.json(
      { error: "analysis output could not be parsed" },
      { status: 502 },
    );
  }

  return Response.json(
    toSnapshot(reading, messages, startedAt, previousSnapshot),
  );
}
