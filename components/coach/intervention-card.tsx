"use client";

import type { AxisKey, TemperatureSnapshot } from "@/lib/types";
import type { Intervention } from "@/lib/intervention";
import { useSessionStore } from "@/store/session";
import { ArrowRightIcon, SparklesIcon } from "@/components/icons";

const AXIS_LABEL: Record<AxisKey, string> = {
  intent: "의향",
  engagement: "관심",
  trust: "신뢰",
  resistance: "저항",
};

const CLOSING_DRAFT =
  "결정 기한은 없으니 편하게 보셔도 됩니다. 필요하실 때 언제든 다시 말씀해주세요.";

export default function InterventionCard({
  snapshot,
  intervention,
}: {
  snapshot: TemperatureSnapshot;
  intervention: Intervention;
}) {
  const setDraft = useSessionStore((s) => s.setDraft);
  const { mode, dominant, prescription, reason } = intervention;

  const urgent =
    mode === "card" &&
    (snapshot.band === "imminent" || snapshot.band === "cold");
  const active = mode === "card";

  const status =
    mode === "card"
      ? `L2 · ${intervention.triggers.join("+")} · ${reason}`
      : mode === "hint"
        ? `L1 힌트 · ${reason}`
        : mode === "hold"
          ? `관망 ${intervention.blockedBy}`
          : mode === "ops"
            ? "운영 알림 (B5)"
            : mode === "closing"
              ? "개입 불가 (B2)"
              : "트리거 미달 · 관찰 중";

  const accent = urgent
    ? "text-band-imminent-text"
    : active
      ? "text-brand"
      : "text-ink-soft";

  return (
    <div
      className={`flex shrink-0 flex-col gap-3 rounded-[10px] border-l-[3px] p-4 ${
        urgent
          ? "border-band-imminent bg-alert-bg"
          : active
            ? "border-brand bg-brand-soft"
            : mode === "ops" || mode === "closing"
              ? "border-ink-faint bg-ops-bg"
              : "border-line bg-surface"
      }`}
    >
      <p className="flex items-center justify-between gap-2">
        <span
          className={`flex items-center gap-1.5 text-[11px] font-extrabold ${accent}`}
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          AI 개입 제안
        </span>
        <span className="text-right text-[10px] font-semibold tabular-nums text-ink-faint">
          {status}
        </span>
      </p>

      {mode === "none" && (
        <p className="text-[12px] leading-[1.5] text-ink-soft">
          아직 개입 기준(카드: 온도 ≤{" "}
          <span className="tabular-nums">39</span> / 한 턴 −8 / 3턴 −12 · 힌트:
          한 턴 −4 / 3턴 −6)에 걸리지 않았습니다.
          {snapshot.nextAction && (
            <>
              {" "}
              <span className="text-ink">{snapshot.nextAction}</span>
            </>
          )}
        </p>
      )}

      {mode === "hint" && prescription && (
        <p className="text-[12px] leading-[1.5] text-ink-soft">
          💡 <span className="font-bold text-ink">{prescription.phrase}</span>
          {dominant && (
            <span className="ml-1.5 text-[11px] tabular-nums text-ink-faint">
              {AXIS_LABEL[dominant.axis]}{" "}
              {dominant.axis === "resistance" ? "+" : "−"}
              {dominant.delta}
            </span>
          )}
        </p>
      )}

      {mode === "hold" && (
        <p className="text-[12px] leading-[1.5] text-ink-soft">{reason}</p>
      )}

      {mode === "ops" && (
        <p className="text-[12px] leading-[1.5] text-ink">
          {reason} 고객 카드는 억제합니다 — 지연된 답변부터 정리해 보내세요.
          운영 채널에는 재배정 요청과 사과 템플릿이 전달됩니다.
        </p>
      )}

      {mode === "closing" && (
        <>
          <p className="text-[12px] leading-[1.5] text-ink">
            {reason} 재촉하면 컴플레인이 됩니다.
          </p>
          <button
            onClick={() => setDraft(CLOSING_DRAFT)}
            className="flex w-full items-center justify-between rounded-[6px] border border-line bg-surface px-3 py-2 text-[12px] font-bold text-ink-soft"
          >
            정중 종료 안내
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        </>
      )}

      {mode === "card" && (
        <>
          <p className="text-[12px] leading-[1.5] text-ink">
            {dominant && prescription ? (
              <>
                <span className="font-bold">
                  {AXIS_LABEL[dominant.axis]}{" "}
                  {dominant.axis === "resistance" ? "+" : "−"}
                  {dominant.delta}
                </span>{" "}
                · {prescription.reason}
              </>
            ) : (
              snapshot.nextAction
            )}
          </p>

          {prescription && (
            <p
              className={`text-[11px] leading-[1.5] ${urgent ? "text-band-imminent-text" : "text-ink-soft"}`}
            >
              ✕ {prescription.forbid}
            </p>
          )}

          {snapshot.band === "imminent" && (
            <p className="text-[10px] font-semibold text-band-imminent-text">
              이탈 임박 — 팀 알림이 함께 발송됩니다.
            </p>
          )}

          <button
            onClick={() => setDraft(prescription?.draft ?? snapshot.nextAction)}
            className={`flex w-full items-center justify-between rounded-[6px] px-3 py-[9px] text-[12px] font-bold text-white ${
              urgent ? "bg-band-imminent" : "bg-brand"
            }`}
          >
            {prescription?.phrase ?? "추천 답변 넣기"}
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
