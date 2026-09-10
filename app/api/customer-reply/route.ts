import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Message } from "@/lib/types";
import { customers } from "@/lib/mock/customers";
import { personas, buildCustomerSystemPrompt } from "@/lib/personas";
import { mockCustomerReply } from "@/lib/mock/replies";

const RequestSchema = z.object({
  customerId: z.string(),
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
});

function buildTranscript(messages: Message[]): string {
  const lines = messages.map(
    (m) => `${m.role === "counselor" ? "상담사" : "고객"}: ${m.text}`,
  );
  return `지금까지의 상담 채팅이다.

<transcript>
${lines.join("\n")}
</transcript>

이 흐름에 이어지는 고객의 다음 메시지 한 개를 출력하라.`;
}

export async function POST(req: Request) {
  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
  const { customerId } = parsed.data;
  const messages = parsed.data.messages as Message[];

  const customer = customers.find((c) => c.id === customerId);
  const persona = personas[customerId];
  if (!customer || !persona) {
    return Response.json({ error: "unknown customer" }, { status: 400 });
  }

  if (process.env.CUSTOMER_REPLY_MOCK === "1" || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ text: mockCustomerReply(customerId, messages) });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      output_config: { effort: "low" },
      system: [
        {
          type: "text",
          text: buildCustomerSystemPrompt(customer, persona),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildTranscript(messages) }],
    });

    // 안전 분류기 거절 등 텍스트가 없는 응답 → mock으로 폴백 (고객이 침묵하지 않도록)
    const text =
      response.stop_reason === "refusal"
        ? null
        : response.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("")
            .trim() || null;

    return Response.json({
      text: text ?? mockCustomerReply(customerId, messages),
    });
  } catch {
    return Response.json({ text: mockCustomerReply(customerId, messages) });
  }
}
