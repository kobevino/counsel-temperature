"use client";

import type { Customer } from "@/lib/types";

export default function ChatHeader({
  customer,
  elapsedMin,
}: {
  customer: Customer;
  elapsedMin: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-3.5">
      <div>
        <h2 className="text-[17px] font-bold">{customer.name} 고객님</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          상담 진행 중 · {elapsedMin}분
        </p>
      </div>
      <span className="text-[12px] text-ink-faint">
        담당 상담사 {customer.counselor}
      </span>
    </div>
  );
}
