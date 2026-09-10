"use client";

import { customers } from "@/lib/mock/customers";
import { useSessionStore } from "@/store/session";
import { SearchIcon } from "@/components/icons";
import { riskFromTemperature } from "@/lib/score";

const AVATAR_COLORS: Record<string, string> = {
  park: "bg-amber-400",
  kim: "bg-indigo-200",
  lee: "bg-emerald-200",
  choi: "bg-rose-200",
};

const STATUS_TABS = ["접수", "문의", "응대", "종료"] as const;

export default function CustomerList() {
  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const selectCustomer = useSessionStore((s) => s.selectCustomer);
  const sessions = useSessionStore((s) => s.sessions);

  return (
    <aside className="flex h-full flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-4 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">채팅상담</h1>
          <span className="flex h-5 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
            {customers.length + 2}
          </span>
        </div>
        <div className="mt-4 flex justify-between text-[13px]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              className={
                tab === "문의"
                  ? "border-b-2 border-brand pb-1 font-semibold text-brand"
                  : "pb-1 text-ink-faint"
              }
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2">
          <SearchIcon className="h-3.5 w-3.5 text-ink-faint" />
          <span className="text-[13px] text-ink-faint">상담내용 · 고객명 검색</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {customers.map((c) => {
          const active = c.id === activeCustomerId;
          const latestSnapshot = sessions[c.id]?.snapshots.at(-1);
          const risk = latestSnapshot
            ? riskFromTemperature(latestSnapshot.temperature)
            : null;
          return (
            <button
              key={c.id}
              onClick={() => selectCustomer(c.id)}
              className={`flex w-full items-start gap-3 border-b border-line px-4 py-4 text-left transition-colors ${
                active
                  ? "border-l-[3px] border-l-brand bg-brand-soft"
                  : "border-l-[3px] border-l-transparent hover:bg-canvas"
              }`}
            >
              <span
                className={`h-9 w-9 shrink-0 rounded-full ${AVATAR_COLORS[c.id] ?? "bg-gray-200"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between">
                  <span className="text-[15px] font-semibold">{c.name}</span>
                  <span className="text-[11px] text-ink-faint">{c.lastMessageAgo}</span>
                </span>
                <span className="mt-1 block truncate text-[13px] text-ink-soft">
                  {c.lastMessage}
                </span>
                {c.riskLabel && (
                  <span className="mt-1.5 block text-[11px] font-semibold text-band-urgent">
                    {c.riskLabel}
                    {risk !== null ? ` ${risk}%` : ""}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
