"use client";

import { useEffect, useState } from "react";
import type { Message } from "@/lib/types";
import { formatDuration } from "@/lib/time";
import { ClockIcon } from "@/components/icons";

/** silence shorter than this is normal thinking time, not a churn signal */
const SHOW_AFTER_MS = 30_000;

/** average scripted gap between a counselor message and the customer's reply */
function averageReplyGap(messages: Message[]): number | null {
  const gaps: number[] = [];
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const cur = messages[i];
    if (prev.role === "counselor" && cur.role === "customer") {
      gaps.push(cur.at - prev.at);
    }
  }
  if (gaps.length === 0) return null;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

export default function SilenceIndicator({
  messages,
  customerTyping,
  lastCustomerAt,
}: {
  messages: Message[];
  customerTyping: boolean;
  lastCustomerAt: number | null;
}) {
  // ticks client-side only, so SSR never renders a wall-clock-dependent value
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const last = messages[messages.length - 1];
  if (
    now === null ||
    customerTyping ||
    lastCustomerAt === null ||
    last?.role !== "customer"
  ) {
    return null;
  }

  const silence = now - lastCustomerAt;
  if (silence < SHOW_AFTER_MS) return null;

  const avgGap = averageReplyGap(messages);

  return (
    <div className="flex items-center gap-1.5 pl-1 text-[12px] font-medium text-band-risk-text">
      <ClockIcon className="h-3.5 w-3.5 shrink-0" />
      <span>
        고객 무응답 {formatDuration(silence)}
        {avgGap !== null && ` · 직전 평균 응답 간격 ${formatDuration(avgGap)}`}
      </span>
    </div>
  );
}
