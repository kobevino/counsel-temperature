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
      ? `${intervention.triggers.join(" + ")} · ${reason}`
      : mode === "hold"
        ? `관망 ${intervention.blockedBy}`
        : mode === "ops"
          ? "운영 알림 (B5)"
          : mode === "closing"
            ? "개입 불가 (B2)"
            : "트리거 미달 · 관찰 중";

  return (
    <div
      className={`shrink-0 rounded-2xl border-l-4 p-3.5 ${
        urgent
          ? "border-band-imminent bg-alert-bg"
          : active
            ? "border-brand bg-brand-soft"
            : mode === "ops" || mode === "closing"
              ? "border-ink-faint bg-ops-bg"
              : "border-line bg-surface"
      }`}
    >
      <p
        className={`flex items-center justify-between gap-2 text-[13px] font-bold ${
          urgent ? "text-band-imminent-text" : active ? "text-brand" : "text-ink"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <SparklesIcon className="h-3.5 w-3.5" />
          AI 개입 제안
        </span>
        <span className="text-right text-[11px] font-semibold tabular-nums">
          {status}
        </span>
      </p>

      {mode === "none" && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          아직 개입 기준(온도 ≤{" "}
          <span className="tabular-nums">39</span> / 한 턴 −8 / 3턴 −12)에 걸리지
          않았습니다.
          {snapshot.nextAction && (
            <>
              {" "}
              <span className="text-ink">{snapshot.nextAction}</span>
            </>
          )}
        </p>
      )}

      {mode === "hold" && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{reason}</p>
      )}

      {mode === "ops" && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {reason} 고객에게 보낼 처방이 아니라 응대 품질 문제입니다 — 지연된
          답변부터 정리해 보내세요.
        </p>
      )}

      {mode === "closing" && (
        <>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            {reason} 재촉하면 컴플레인이 됩니다.
          </p>
          <button
            onClick={() => setDraft(CLOSING_DRAFT)}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-bold text-ink-soft"
          >
            정중 종료 안내
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {mode === "card" && (
        <>
          {dominant && prescription && (
            <p className="mt-2 text-[12px] text-ink-soft">
              주도 축{" "}
              <span className="font-bold text-ink">
                {AXIS_LABEL[dominant.axis]}{" "}
                {dominant.axis === "resistance" ? "+" : "−"}
                {dominant.delta}
              </span>{" "}
              · {prescription.diagnosis}
            </p>
          )}

          <p className="mt-2 text-[13px] leading-relaxed text-ink">
            {prescription?.action ?? snapshot.nextAction}
          </p>

          {prescription && snapshot.nextAction && (
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              {snapshot.nextAction}
            </p>
          )}

          {snapshot.band === "imminent" && (
            <p className="mt-2 text-[11px] font-semibold text-band-imminent-text">
              이탈 임박 — 팀 알림이 함께 발송됩니다.
            </p>
          )}

          <button
            onClick={() => setDraft(prescription?.draft ?? snapshot.nextAction)}
            className={`mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-bold text-white ${
              urgent ? "bg-band-imminent" : "bg-brand"
            }`}
          >
            {prescription?.label ?? "추천 답변 넣기"}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
