"use client";

import type { AxisKey, TemperatureSnapshot } from "@/lib/types";
import type { Intervention } from "@/lib/intervention";
import { BAND_META } from "@/lib/score";
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

  // 트리거 미달 — "식는 중" 구간만 상담사 화면에 조용히 표시한다
  if (mode === "none") {
    if (BAND_META[snapshot.band].surfacing !== "counselor") return null;
    return (
      <p className="rounded-xl border border-line bg-surface px-3 py-2 text-[12px] text-ink-soft">
        온도가 식는 중입니다 · 아직 개입 기준(한 턴 −8 / 3턴 −12)에는 못 미칩니다.
      </p>
    );
  }

  if (mode === "hold") {
    return (
      <p className="rounded-xl border border-line bg-surface px-3 py-2 text-[12px] text-ink-soft">
        <span className="font-semibold text-ink">관망 {intervention.blockedBy}</span>{" "}
        · {reason}
      </p>
    );
  }

  if (mode === "ops") {
    return (
      <div className="rounded-2xl border-l-4 border-ink-faint bg-ops-bg p-4">
        <p className="text-[13px] font-bold text-ink">운영 알림 (B5)</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {reason} 고객에게 보낼 처방이 아니라 응대 품질 문제입니다 — 지연된 답변부터
          정리해 보내세요.
        </p>
      </div>
    );
  }

  if (mode === "closing") {
    return (
      <div className="rounded-2xl border-l-4 border-ink-faint bg-ops-bg p-4">
        <p className="text-[13px] font-bold text-ink">개입 불가 (B2)</p>
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
      </div>
    );
  }

  const urgent = snapshot.band === "imminent" || snapshot.band === "cold";

  return (
    <div
      className={`rounded-2xl border-l-4 p-4 ${
        urgent ? "border-band-imminent bg-alert-bg" : "border-brand bg-brand-soft"
      }`}
    >
      <p
        className={`flex items-center justify-between text-[13px] font-bold ${
          urgent ? "text-band-imminent-text" : "text-brand"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <SparklesIcon className="h-3.5 w-3.5" />
          AI 개입 제안
        </span>
        <span className="text-[11px] font-semibold tabular-nums">
          {intervention.triggers.join(" + ")} · {reason}
        </span>
      </p>

      {dominant && prescription && (
        <p className="mt-2 text-[12px] text-ink-soft">
          주도 축{" "}
          <span className="font-bold text-ink">
            {AXIS_LABEL[dominant.axis]} {dominant.axis === "resistance" ? "+" : "−"}
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
    </div>
  );
}
