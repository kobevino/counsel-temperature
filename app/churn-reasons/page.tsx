import type { Metadata } from "next";
import { CHURN_REASONS, type ChurnReason } from "@/lib/mock/churn-reasons";

export const metadata: Metadata = {
  title: "이탈사유 TOP 30 순위",
  description: "상담톡 이탈 위험 감지용 이탈사유 랭킹",
};

/** 순위 뱃지 색 — 상위(빨강)에서 하위(하늘색)로 내려가는 램프 */
function rankColor(rank: number): string {
  if (rank <= 3) return "#e5484d";
  if (rank <= 5) return "#f27a35";
  if (rank <= 7) return "#f5a623";
  if (rank <= 15) return "#f2c035";
  if (rank <= 19) return "#34b06f";
  if (rank <= 21) return "#2ab5b0";
  if (rank <= 24) return "#3d82f0";
  return "#47a7f0";
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path d="M10 1.7l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.6 7.8l5.8-.8L10 1.7z" />
    </svg>
  );
}

/** 0.5 단위 별점 — 채움 별을 비율만큼 가로로 잘라 반 개를 표현한다 */
function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-[2px]" aria-label={`5점 만점에 ${value}점`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative h-[15px] w-[15px]">
            <StarIcon className="absolute inset-0 h-[15px] w-[15px] fill-none stroke-[#c3cee0] stroke-[1.5px]" />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <StarIcon className="h-[15px] w-[15px] fill-[#ffb224]" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

const ROW_GRID = "grid grid-cols-[52px_192px_104px_1fr] items-center gap-x-2";

function ReasonTable({ rows }: { rows: ChurnReason[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(20,24,40,0.06)]">
      <div
        className={`${ROW_GRID} border-b border-line bg-[#eef3fb] px-4 py-2.5 text-[12px] font-bold text-[#5b6b8c]`}
      >
        <span>순위</span>
        <span>이탈사유</span>
        <span>빈도 추정</span>
        <span>핵심 신호 키워드</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.rank}
          className={`${ROW_GRID} border-b border-line px-4 py-3 last:border-b-0`}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: rankColor(row.rank) }}
          >
            {row.rank}
          </span>
          <span className="pr-2 text-[13px] font-semibold leading-snug text-[#2b3654]">
            {row.reason}
          </span>
          <Stars value={row.stars} />
          <span className="flex flex-wrap gap-1.5">
            {row.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-[#e9eefb] px-2.5 py-1 text-[11px] font-medium text-[#4c6096]"
              >
                {keyword}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChurnReasonsPage() {
  return (
    <main className="min-h-full bg-canvas px-8 py-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-alert-bg">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#e5484d]" aria-hidden>
              <path d="M12 2.5c.7 0 1.34.37 1.7.98l8.02 13.9c.36.62.36 1.38 0 2a1.96 1.96 0 0 1-1.7.99H3.98a1.96 1.96 0 0 1-1.7-.99 1.99 1.99 0 0 1 0-2l8.02-13.9c.36-.61 1-.98 1.7-.98Zm0 5.6c-.6 0-1.07.5-1.04 1.1l.24 4.6a.8.8 0 0 0 1.6 0l.24-4.6c.03-.6-.44-1.1-1.04-1.1Zm0 8.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z" />
            </svg>
          </span>
          <h1 className="text-[26px] font-bold text-[#1f2a44]">
            이탈사유 TOP 30 순위{" "}
            <span className="text-[17px] font-medium text-[#5b6b8c]">
              (상담톡 이탈 위험 감지용)
            </span>
          </h1>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ReasonTable rows={CHURN_REASONS.slice(0, 15)} />
          <ReasonTable rows={CHURN_REASONS.slice(15)} />
        </div>
      </div>
    </main>
  );
}
