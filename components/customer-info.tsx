"use client";

import type { Customer } from "@/lib/types";

export default function CustomerInfo({ customer }: { customer: Customer }) {
  const rows: [string, string][] = [
    ["고객 ID", customer.displayId],
    ["연령", customer.ageGroup],
    ["관심 상품", customer.product],
    ["유입 경로", customer.channel],
    ["상담 시작", customer.startedAt],
  ];

  return (
    <aside className="flex h-full flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-4.5 py-6">
        <h2 className="text-[15px] font-bold">고객 정보</h2>
      </div>
      <div className="px-4.5 py-4">
        <h3 className="text-[12px] font-semibold text-ink-faint">기본 정보</h3>
        <dl className="mt-3 space-y-3.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between">
              <dt className="text-[13px] text-ink-soft">{label}</dt>
              <dd className="text-[13px] font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <hr className="my-4 border-line" />
        <h3 className="text-[12px] font-semibold text-ink-faint">상담 태그</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {customer.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-brand-soft px-2 py-1 text-[12px] text-brand"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
