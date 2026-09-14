"use client";

import Link from "next/link";
import type { TemperatureSnapshot } from "@/lib/types";
import { isPositiveSignal } from "@/lib/signals";

/**
 * 대화 전체에서 누적 감지된 신호 목록. 번호는 감지 순서이며
 * 말풍선의 "위험 신호 N" 뱃지와 같은 체계를 쓴다.
 * 카드를 클릭하면 이탈사유 TOP 30 참조 페이지가 새 탭으로 열린다.
 */
export default function DetectedSignals({
  snapshot,
}: {
  snapshot: TemperatureSnapshot | undefined;
}) {
  const signals = snapshot?.signals ?? [];

  return (
    <Link
      href="/churn-reasons"
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(20,24,40,0.06)] transition-colors hover:border-brand/40"
    >
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold">감지된 신호 {signals.length}개</p>
        <span className="text-[11px] text-ink-faint transition-colors group-hover:text-brand">
          이탈사유 TOP 30 ↗
        </span>
      </div>

      {signals.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-faint">
          아직 감지된 신호가 없습니다.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {signals.map((signal, i) => {
            const positive = isPositiveSignal(signal.code);
            return (
              <li
                key={`${signal.code}-${i}`}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${
                  positive ? "bg-emerald-50" : "bg-alert-bg"
                }`}
              >
                <span
                  className={`flex h-[19px] min-w-[21px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${
                    positive ? "bg-emerald-500" : "bg-[#e5484d]"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-[12px] font-medium leading-snug">
                  {signal.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Link>
  );
}
