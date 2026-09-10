"use client";

import { useState } from "react";
import { customers } from "@/lib/mock/customers";
import { useSessionStore } from "@/store/session";
import { useTemperature } from "@/hooks/useTemperature";
import CustomerList from "@/components/customer-list";
import ChatPanel from "@/components/chat/chat-panel";
import CustomerInfo from "@/components/customer-info";
import CoachPanel from "@/components/coach/coach-panel";
import { ChatThermometerIcon } from "@/components/icons";

export default function Workspace() {
  const [coachOpen, setCoachOpen] = useState(false);

  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const temperature = useTemperature();
  const customer =
    customers.find((c) => c.id === activeCustomerId) ?? customers[0];

  return (
    <main className="grid h-screen min-w-[900px] grid-cols-[300px_minmax(480px,1fr)_300px] grid-rows-[minmax(0,1fr)] overflow-hidden">
      <CustomerList />
      <ChatPanel customer={customer} />
      <CustomerInfo customer={customer} />

      {coachOpen && (
        <div className="fixed right-6 bottom-24 z-40 flex max-h-[calc(100vh-8rem)] w-[340px] flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl">
          <CoachPanel
            isAnalyzing={temperature.isAnalyzing}
            isError={temperature.isError}
            onReanalyze={temperature.reanalyze}
          />
        </div>
      )}

      <button
        onClick={() => setCoachOpen((open) => !open)}
        aria-label={coachOpen ? "대화 온도계 닫기" : "대화 온도계 열기"}
        className="fixed right-6 bottom-6 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-brand text-[15px] font-bold text-white shadow-lg transition-transform hover:scale-105"
      >
        {coachOpen ? "✕" : <ChatThermometerIcon className="h-6 w-6" />}
      </button>
    </main>
  );
}
