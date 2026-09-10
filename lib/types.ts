import { z } from "zod";

// ---------- Chat ----------

export type Role = "counselor" | "customer";

export type Message = {
  id: string;
  role: Role;
  text: string;
  /** offset in ms from session start — keeps demo replays deterministic */
  at: number;
};

export type BranchOption = {
  label: string;
  customer: string;
};

export type ScriptStep = {
  /** what the script expects the counselor to say next (shown as a hint) */
  expect: string;
  customer?: string;
  branch?: BranchOption[];
};

// ---------- Customer ----------

export type CustomerStatus = "접수" | "문의" | "응대" | "종료";

export type Customer = {
  id: string;
  name: string;
  displayId: string;
  ageGroup: string;
  product: string;
  channel: string;
  /** session start as wall-clock label, e.g. "14:18" */
  startedAt: string;
  tags: string[];
  lastMessage: string;
  lastMessageAgo: string;
  status: CustomerStatus;
  counselor: string;
  riskLabel?: string;
};

// ---------- Temperature analysis ----------

export const AXIS_KEYS = ["engagement", "trust", "intent", "resistance"] as const;
export type AxisKey = (typeof AXIS_KEYS)[number];

export const AxisSchema = z.object({
  score: z.number(),
  quotes: z.array(z.string()),
  note: z.string(),
});

/** raw LLM output shape — quotes are plain strings, validated server-side */
export const ReadingSchema = z.object({
  engagement: AxisSchema,
  trust: AxisSchema,
  intent: AxisSchema,
  resistance: AxisSchema,
  confidence: z.enum(["low", "medium", "high"]),
  change: z.enum(["rising", "flat", "falling"]),
  trigger: z.string(),
  nextAction: z.string(),
});

export type Reading = z.infer<typeof ReadingSchema>;

export type ResolvedQuote = {
  messageId: string;
  quote: string;
};

export type AxisReading = {
  score: number;
  quotes: ResolvedQuote[];
  note: string;
};

export type Band = "safe" | "caution" | "risk" | "urgent";

export type TemperatureSnapshot = {
  turn: number;
  axes: Record<AxisKey, AxisReading>;
  temperature: number;
  risk: number;
  band: Band;
  confidence: "low" | "medium" | "high";
  change: "rising" | "flat" | "falling";
  trigger: string;
  nextAction: string;
};

// ---------- API ----------

export type TemperatureRequest = {
  messages: Message[];
  previousSnapshot?: TemperatureSnapshot;
};

export type TemperatureResponse = TemperatureSnapshot;
