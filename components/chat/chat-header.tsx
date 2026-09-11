"use client";

import type { Customer } from "@/lib/types";
import { useSessionStore } from "@/store/session";

export default function ChatHeader({
  customer,
  elapsed,
}: {
  customer: Customer;
  /** preformatted consultation span, e.g. "16분" / "19시간 32분" */
  elapsed: string;
}) {
  const resetSession = useSessionStore((s) => s.resetSession);

  return (
    <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-3.5">
      <div>
        <h2 className="text-[17px] font-bold">{customer.name} 고객님</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          상담 진행 중 · {elapsed}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-ink-faint">
          담당 상담사 {customer.counselor}
        </span>
        {/* 시연을 처음부터 다시 돌릴 때 (대화·분석 모두 초기화) */}
        <button
          onClick={() => resetSession(customer.id)}
          className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-faint transition-colors hover:border-brand/40 hover:text-brand"
        >
          처음부터
        </button>
      </div>
    </div>
  );
}
