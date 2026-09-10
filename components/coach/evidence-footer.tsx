"use client";

import { AXIS_KEYS, type ResolvedQuote, type TemperatureSnapshot } from "@/lib/types";
import { useSessionStore } from "@/store/session";

const AXIS_LABEL: Record<(typeof AXIS_KEYS)[number], string> = {
  engagement: "관심",
  trust: "신뢰",
  intent: "의향",
  resistance: "저항",
};

export default function EvidenceFooter({
  snapshot,
}: {
  snapshot: TemperatureSnapshot;
}) {
  const setHighlight = useSessionStore((s) => s.setHighlight);

  // hallucination-validated quotes only, deduped by source message
  const seen = new Set<string>();
  const quotes: (ResolvedQuote & { axis: string })[] = [];
  for (const key of AXIS_KEYS) {
    for (const q of snapshot.axes[key].quotes) {
      if (seen.has(q.messageId)) continue;
      seen.add(q.messageId);
      quotes.push({ ...q, axis: AXIS_LABEL[key] });
    }
  }

  return (
    <div className="px-1">
      <p className="text-[11px] leading-relaxed text-ink-faint">
        분석 근거 · 트리거 발화 “{snapshot.trigger}” · 최근 {snapshot.turn}턴 기준
      </p>
      {quotes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quotes.slice(0, 4).map((q) => (
            <button
              key={q.messageId}
              onClick={() => setHighlight(q.messageId)}
              title="클릭하면 해당 발화로 이동합니다"
              className="max-w-full truncate rounded-md border border-line bg-surface px-2 py-1 text-left text-[11px] text-ink-soft hover:border-brand/40 hover:text-brand"
            >
              <span className="mr-1 font-semibold text-ink-faint">{q.axis}</span>
              “{q.quote}”
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
