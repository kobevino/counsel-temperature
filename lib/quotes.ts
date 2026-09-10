import type { Message, ResolvedQuote } from "@/lib/types";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Hallucination guard: a quote survives only if it appears verbatim
 * (whitespace-normalized) in the transcript — usually a customer message,
 * but counselor messages count too (service-failure evidence). Returns the
 * source message id so the UI can scroll-and-highlight.
 */
export function resolveQuote(
  quote: string,
  messages: Message[],
): ResolvedQuote | null {
  const q = norm(quote);
  if (!q) return null;
  const hit = messages.find((m) => norm(m.text).includes(q));
  return hit ? { messageId: hit.id, quote } : null;
}

export function resolveQuotes(
  quotes: string[],
  messages: Message[],
): { resolved: ResolvedQuote[]; dropped: number } {
  const resolved: ResolvedQuote[] = [];
  let dropped = 0;
  for (const quote of quotes) {
    const hit = resolveQuote(quote, messages);
    if (hit) resolved.push(hit);
    else dropped += 1;
  }
  return { resolved, dropped };
}
