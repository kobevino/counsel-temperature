"use client";

import { useActiveSession } from "@/store/session";
import { customerTurn, MIN_CUSTOMER_MESSAGES } from "@/hooks/useTemperature";
import RiskGauge from "./risk-gauge";
import TrendChart from "./trend-chart";
import CoachingAlert from "./coaching-alert";
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
  const showDetails =
    latest && turns >= MIN_CUSTOMER_MESSAGES && latest.confidence !== "low";

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3.5 overflow-y-auto bg-canvas p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
            AI
          </span>
          <h2 className="text-[15px] font-bold">대화 온도계</h2>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-600">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${
              isAnalyzing ? "animate-ping" : ""
            }`}
          />
          {isAnalyzing ? "분석 중" : "실시간 분석"}
        </span>
      </div>

      <RiskGauge snapshot={latest} customerTurns={turns} />

      <TrendChart snapshots={session.snapshots} />

      {showDetails && <CoachingAlert snapshot={latest} />}

      {isError && (
        <button
          onClick={onReanalyze}
          className="rounded-lg border border-band-urgent/40 bg-alert-bg px-3 py-2 text-[12px] font-semibold text-band-urgent-text"
        >
          분석에 실패했습니다 — 다시 분석
        </button>
      )}

      {showDetails && <EvidenceFooter snapshot={latest} />}
    </aside>
  );
}
