"use client";

import { useEffect, useRef, useState } from "react";
import type { Customer, Message } from "@/lib/types";
import { formatClock, formatDateLabel } from "@/lib/time";
import { isPositiveSignal } from "@/lib/signals";
import { useSessionStore } from "@/store/session";

const NEAR_BOTTOM_PX = 80;

export default function MessageList({
  customer,
  messages,
  customerTyping,
}: {
  customer: Customer;
  messages: Message[];
  customerTyping: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const [hasNew, setHasNew] = useState(false);
  const highlightId = useSessionStore((s) => s.highlightId);
  const setHighlight = useSessionStore((s) => s.setHighlight);
  const latestSnapshot = useSessionStore((s) => {
    const snapshots = s.sessions[customer.id]?.snapshots;
    return snapshots?.[snapshots.length - 1];
  });

  // 감지된 신호 카드와 같은 번호 체계 — 위험 신호가 나온 발화에 "위험 신호 N" 뱃지를 단다
  const riskBadges = new Map<string, number>();
  latestSnapshot?.signals.forEach((signal, i) => {
    if (
      signal.messageId &&
      !isPositiveSignal(signal.code) &&
      !riskBadges.has(signal.messageId)
    ) {
      riskBadges.set(signal.messageId, i + 1);
    }
  });

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottomRef.current) setHasNew(false);
  };

  // stick to bottom only when the user is already near it
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (nearBottomRef.current) scrollToBottom();
    else setHasNew(true);
  }, [lastId, customerTyping]);

  // reset to bottom on customer switch
  useEffect(() => {
    scrollToBottom();
    setHasNew(false);
    nearBottomRef.current = true;
  }, [customer.id]);

  // evidence quote clicked → scroll to source message and flash it
  useEffect(() => {
    if (!highlightId) return;
    const el = containerRef.current?.querySelector(
      `[data-message-id="${highlightId}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlight(null), 1600);
    return () => clearTimeout(timer);
  }, [highlightId, setHighlight]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-6 py-5"
      >
        <p className="pb-4 text-center text-[11px] text-ink-faint">
          {formatDateLabel(customer.startedAt)}
        </p>
        <div className="flex flex-col gap-4">
          {messages.map((m) => {
            const mine = m.role === "counselor";
            const riskBadge = mine ? undefined : riskBadges.get(m.id);
            return (
              <div
                key={m.id}
                data-message-id={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"} ${
                  highlightId === m.id ? "evidence-flash" : ""
                }`}
              >
                {riskBadge !== undefined && (
                  <span className="mb-1 rounded-full bg-alert-bg px-2 py-0.5 text-[10px] font-bold text-[#e5484d]">
                    위험 신호 {riskBadge}
                  </span>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-[0_1px_2px_rgba(20,24,40,0.05)] ${
                    mine
                      ? "rounded-br-md bg-bubble-counselor"
                      : "rounded-bl-md bg-bubble-customer"
                  } ${riskBadge !== undefined ? "border border-[#e5484d]" : ""}`}
                >
                  {m.text}
                </div>
                <span className="mt-1 text-[11px] text-ink-faint">
                  {formatClock(customer.startedAt, m.at)}
                </span>
              </div>
            );
          })}
          {customerTyping && (
            <div className="flex items-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-bubble-customer px-4 py-3.5 shadow-[0_1px_2px_rgba(20,24,40,0.05)]">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-faint" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-faint" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-faint" />
              </div>
            </div>
          )}
        </div>
      </div>

      {hasNew && (
        <button
          onClick={() => {
            scrollToBottom();
            setHasNew(false);
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
        >
          새 메시지 ↓
        </button>
      )}
    </div>
  );
}
