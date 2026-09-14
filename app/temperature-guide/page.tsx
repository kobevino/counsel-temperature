import type { Metadata } from "next";
import type { AxisKey } from "@/lib/types";
import {
  AXIS_WEIGHTS,
  BAND_META,
  BAND_ORDER,
  INITIAL_AXES,
  WARY_AXES,
  computeTemperature,
  type Surfacing,
} from "@/lib/score";
import SignalEffects from "@/components/temperature-guide/signal-effects";

export const metadata: Metadata = {
  title: "대화 온도 계산 기준",
  description: "상담톡 대화 온도(0-100) 산출 공식과 신호별 증감 기준",
};

const AXIS_NAMES: Record<AxisKey, string> = {
  intent: "가입 의향",
  engagement: "참여도",
  trust: "신뢰도",
  resistance: "저항감 (역방향)",
};

const AXIS_DESCRIPTIONS: Record<AxisKey, string> = {
  intent: "가입 결정·시점·절차 문의처럼 전환에 가까워지는 발화",
  engagement: "스스로 화제를 이어가는지, 단답으로 짧아지는지",
  trust: "개인 사정 공개, 상담사 응대 품질에 대한 반응",
  resistance: "가격 부담·조건 불만 — 높을수록 온도를 깎는다",
};

const SURFACING_LABELS: Record<Surfacing, string> = {
  none: "개입 없음",
  counselor: "상담사 주의",
  card: "개입 카드",
  team: "팀 알림",
};

const AXIS_ORDER: AxisKey[] = ["intent", "engagement", "trust", "resistance"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-bold tracking-wide text-[#5b6b8c]">
      {children}
    </h2>
  );
}

export default function TemperatureGuidePage() {
  const initialTemperature = computeTemperature(INITIAL_AXES);
  const waryTemperature = computeTemperature(WARY_AXES);

  return (
    <main className="min-h-full bg-canvas px-6 py-10">
      <div className="mx-auto flex max-w-[720px] flex-col gap-8">
        <header className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-[22px]">
            🌡️
          </span>
          <div>
            <h1 className="text-[22px] font-bold text-[#1f2a44]">
              대화 온도 계산 기준
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              고객 이탈 위험도를 0–100 사이의 온도로 실시간 추적합니다
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-brand/20 bg-brand-soft/60 p-5">
          <SectionTitle>온도 계산 공식</SectionTitle>
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-[#2b3654]">
            온도 ={" "}
            <span className="text-brand">{AXIS_WEIGHTS.intent.toFixed(2)}</span>
            ×가입의향 +{" "}
            <span className="text-brand">
              {AXIS_WEIGHTS.engagement.toFixed(2)}
            </span>
            ×참여도 +{" "}
            <span className="text-brand">{AXIS_WEIGHTS.trust.toFixed(2)}</span>
            ×신뢰도 +{" "}
            <span className="text-brand">
              {AXIS_WEIGHTS.resistance.toFixed(2)}
            </span>
            ×(100 − 저항감)
          </p>
          <p className="mt-3 text-[12px] text-ink-soft">
            초기값 — 가입의향 {INITIAL_AXES.intent} · 참여도{" "}
            {INITIAL_AXES.engagement} · 신뢰도 {INITIAL_AXES.trust} · 저항감{" "}
            {INITIAL_AXES.resistance} → 시작 온도 {initialTemperature}°
          </p>
          <p className="mt-1 text-[12px] text-ink-faint">
            첫 발화부터 짜증·의심 톤이면 신뢰도 {WARY_AXES.trust} · 저항감{" "}
            {WARY_AXES.resistance}로 시작 → {waryTemperature}°
          </p>
        </section>

        <section>
          <SectionTitle>4가지 측정 축</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {AXIS_ORDER.map((axis) => (
              <div
                key={axis}
                className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(20,24,40,0.06)]"
              >
                <p className="text-[14px] font-bold text-[#2b3654]">
                  {AXIS_NAMES[axis]}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-brand">
                  비중 {Math.round(AXIS_WEIGHTS[axis] * 100)}% · 초기값{" "}
                  {INITIAL_AXES[axis]}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">
                  {AXIS_DESCRIPTIONS[axis]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>온도 구간</SectionTitle>
          <div className="mt-3 flex flex-col gap-2">
            {[...BAND_ORDER].reverse().map((band) => {
              const meta = BAND_META[band];
              return (
                <div
                  key={band}
                  className="flex items-center gap-4 rounded-xl border border-line px-4 py-3"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${meta.color} 7%, white)`,
                  }}
                >
                  <span
                    className="w-[68px] shrink-0 text-[15px] font-bold tabular-nums"
                    style={{ color: meta.textColor }}
                  >
                    {meta.range}°
                  </span>
                  <span className="text-[14px] font-bold text-[#2b3654]">
                    {meta.label}
                  </span>
                  <span className="ml-auto text-[11px] font-medium text-ink-faint">
                    {SURFACING_LABELS[meta.surfacing]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle>신호별 온도 변화</SectionTitle>
          <p className="mt-1 text-[12px] text-ink-faint">
            LLM은 신호의 유무만 감지하고, 축 점수는 초기값에 아래 증감을
            순서대로 누적해 시스템이 계산합니다. 각 축은 0~100으로 잘립니다.
          </p>
          <div className="mt-3">
            <SignalEffects />
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-line pt-4 text-[11px] text-ink-faint">
          <span>시그널 온도계 · Habitfactory</span>
          <span>lib/score.ts · lib/signals.ts 기준</span>
        </footer>
      </div>
    </main>
  );
}
