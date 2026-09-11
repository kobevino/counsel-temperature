"use client";

import { useActiveSession } from "@/store/session";
import { customerTurn, MIN_CUSTOMER_MESSAGES } from "@/hooks/useTemperature";
import { evaluateInterventions } from "@/lib/intervention";
import TemperatureGauge from "./temperature-gauge";
import TrendChart from "./trend-chart";
import InterventionCard from "./intervention-card";
import EvidenceFooter from "./evidence-footer";

export default function CoachPanel({
  isAnalyzing,
  isError,
  onReanalyze,
}: {
  isAnalyzing: boolean;
  isError: boolean;
  onReanalyze: () => void;
}) {
  const session = useActiveSession();
  const latest = session.snapshots[session.snapshots.length - 1];
  const turns = customerTurn(session.messages);
  const showDetails = !!latest && turns >= MIN_CUSTOMER_MESSAGES;

  // T1·T2·T3 트리거와 B1~B5 차단은 스냅샷 이력 전체에서 판단한다
  const interventions = evaluateInterventions(session.snapshots);
  const intervention = interventions[interventions.length - 1];

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3.5 overflow-y-auto bg-canvas p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
            AI
          </span>
          <h2 className="text-[15px] font-bold">대화 온도계</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* 고객이 답이 없어 자동 트리거가 돌지 않을 때 수동으로 다시 읽힌다 */}
          <button
            onClick={onReanalyze}
            disabled={isAnalyzing || turns < MIN_CUSTOMER_MESSAGES}
            className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-faint transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
          >
            다시 분석
          </button>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-600">
            <span
              className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${
                isAnalyzing ? "animate-ping" : ""
              }`}
            />
            {isAnalyzing ? "분석 중" : "실시간 분석"}
          </span>
        </div>
      </div>

      <TemperatureGauge snapshot={latest} customerTurns={turns} />

      <TrendChart snapshots={session.snapshots} interventions={interventions} />

      {showDetails && intervention && (
        <InterventionCard snapshot={latest} intervention={intervention} />
      )}

      {isError && (
        <button
          onClick={onReanalyze}
          className="rounded-lg border border-band-imminent/40 bg-alert-bg px-3 py-2 text-[12px] font-semibold text-band-imminent-text"
        >
          분석에 실패했습니다 — 다시 분석
        </button>
      )}

      {showDetails && <EvidenceFooter snapshot={latest} />}
    </aside>
  );
}
