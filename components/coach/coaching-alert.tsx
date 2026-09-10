"use client";

import type { TemperatureSnapshot } from "@/lib/types";
import { useSessionStore } from "@/store/session";
import { ArrowRightIcon, SparklesIcon } from "@/components/icons";

/** map the recommended action to a message the counselor can send as-is */
function actionDraft(snapshot: TemperatureSnapshot): string {
  const a = snapshot.nextAction;
  if (a.includes("가설계표"))
    return "기다리시게 해서 죄송해요. 기본형·안심형 가설계표를 바로 보내드릴게요!";
  if (a.includes("보장"))
    return "말씀하신 보장 조건을 기준으로 차이를 정리해 드릴게요.";
  if (a.includes("절차"))
    return "가입 절차를 안내해 드릴게요. 모바일로 5분이면 완료됩니다.";
  return a;
}

function actionLabel(snapshot: TemperatureSnapshot): string {
  const a = snapshot.nextAction;
  if (a.includes("가설계표")) return "가설계표 보내기";
  if (a.includes("보장")) return "보장 차이 안내";
  if (a.includes("절차")) return "가입 절차 안내";
  return "추천 답변 넣기";
}

export default function CoachingAlert({
  snapshot,
}: {
  snapshot: TemperatureSnapshot;
}) {
  const setDraft = useSessionStore((s) => s.setDraft);
  const urgent = snapshot.band === "urgent" || snapshot.band === "risk";

  return (
    <div
      className={`rounded-2xl border-l-4 p-4 ${
        urgent
          ? "border-band-urgent bg-alert-bg"
          : "border-brand bg-brand-soft"
      }`}
    >
      <p
        className={`flex items-center gap-1.5 text-[13px] font-bold ${
          urgent ? "text-band-urgent-text" : "text-brand"
        }`}
      >
        <SparklesIcon className="h-3.5 w-3.5" />
        AI 코칭 알림
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink">
        {snapshot.nextAction}
      </p>
      <button
        onClick={() => setDraft(actionDraft(snapshot))}
        className={`mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-bold text-white ${
          urgent ? "bg-band-urgent" : "bg-brand"
        }`}
      >
        {actionLabel(snapshot)}
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
