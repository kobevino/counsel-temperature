"use client";

import { useState } from "react";
import Link from "next/link";
import type { ResolvedSignal, TemperatureSnapshot } from "@/lib/types";
import { isPositiveSignal } from "@/lib/signals";
import { formatClock } from "@/lib/time";
import { useActiveSession, useSessionStore } from "@/store/session";

/** 접힌 상태에서 보여주는 최근 신호 개수 */
const RECENT_COUNT = 3;

/**
 * 대화 전체에서 누적 감지된 신호 목록. 번호는 감지 순서이며
 * 말풍선의 "위험 신호 N" 뱃지와 같은 체계를 쓴다.
 * 같은 신호가 반복 감지될 수 있어 발생 시각으로 구분한다.
 * 신호를 클릭하면 대화에서 해당 발화로 이동하고,
 * 나머지 카드 영역을 클릭하면 이탈사유 TOP 30 참조 페이지가 새 탭으로 열린다.
 */
export default function DetectedSignals({
  snapshot,
  startedAt,
}: {
  snapshot: TemperatureSnapshot | undefined;
  startedAt: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const setHighlight = useSessionStore((s) => s.setHighlight);
  const { messages } = useActiveSession();

  // 신호를 클릭하면 근거 발화로 스크롤. 무응답처럼 근거 발화가 없는 신호는
  // 판정 시점(at) 직전의 마지막 메시지(침묵이 시작된 지점)로 이동한다.
  const jumpToSignal = (signal: ResolvedSignal) => {
    const fallback = [...messages]
      .reverse()
      .find((m) => m.at <= signal.at)?.id;
    const target = signal.messageId ?? fallback ?? null;
    if (target) setHighlight(target);
  };

  const signals = snapshot?.signals ?? [];
  // 최근 감지된 신호가 위로 오도록 정렬. 번호(order)는 감지 순서를 유지하며,
  // 같은 시각에 감지된 신호끼리도 나중에 감지된 것이 위로 온다.
  const sorted = signals
    .map((signal, order) => ({ signal, order }))
    .sort(
      (a, b) => (b.signal.at ?? 0) - (a.signal.at ?? 0) || b.order - a.order,
    );
  // 기본으로는 최근 신호만 보여주고 나머지는 [더보기]로 펼친다.
  const visible = expanded ? sorted : sorted.slice(0, RECENT_COUNT);
  const hiddenCount = sorted.length - RECENT_COUNT;

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
          {visible.map(({ signal, order }) => {
            const positive = isPositiveSignal(signal.code);
            return (
              <li key={`${signal.code}-${order}`}>
                <button
                  type="button"
                  title="클릭하면 해당 발화로 이동합니다"
                  onClick={(e) => {
                    // 카드 전체가 링크라 클릭이 페이지 이동으로 이어지지 않게 막는다.
                    e.preventDefault();
                    e.stopPropagation();
                    jumpToSignal(signal);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-shadow hover:shadow-[inset_0_0_0_1px_rgba(20,24,40,0.12)] ${
                    positive ? "bg-emerald-50" : "bg-alert-bg"
                  }`}
                >
                  <span
                    className={`flex h-[19px] min-w-[21px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${
                      positive ? "bg-emerald-500" : "bg-[#e5484d]"
                    }`}
                  >
                    {order + 1}
                  </span>
                  <span className="text-[12px] font-medium leading-snug">
                    {signal.label}
                  </span>
                  {typeof signal.at === "number" && (
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums text-ink-faint">
                      {formatClock(startedAt, signal.at)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {hiddenCount > 0 && (
            <li>
              <button
                type="button"
                onClick={(e) => {
                  // 카드 전체가 링크라 버튼 클릭이 페이지 이동으로 이어지지 않게 막는다.
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                className="w-full rounded-lg border border-dashed border-line py-2 text-[12px] font-medium text-ink-faint transition-colors hover:border-brand/40 hover:text-brand"
              >
                {expanded ? "접기" : `이전 신호 ${hiddenCount}개 더보기`}
              </button>
            </li>
          )}
        </ul>
      )}
    </Link>
  );
}
