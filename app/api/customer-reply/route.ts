import { z } from "zod";
import type { Message } from "@/lib/types";
import { customers } from "@/lib/mock/customers";
import { personas } from "@/lib/personas";
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

  return Response.json({ text: mockCustomerReply(customerId, messages) });
}
