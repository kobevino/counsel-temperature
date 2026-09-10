"use client";

import { useEffect, useState } from "react";
import { customers } from "@/lib/mock/customers";
import { useSessionStore } from "@/store/session";
import { useTemperature } from "@/hooks/useTemperature";
import CustomerList from "@/components/customer-list";
import ChatPanel from "@/components/chat/chat-panel";
import CustomerInfo from "@/components/customer-info";
import CoachPanel from "@/components/coach/coach-panel";

export default function Workspace() {
  // sessionStorage rehydration happens client-side only — gate to avoid
  // hydration mismatch between server HTML and persisted state
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const temperature = useTemperature();
  const customer =
    customers.find((c) => c.id === activeCustomerId) ?? customers[0];

  if (!mounted) {
    return <div className="h-screen bg-canvas" />;
  }

  return (
    <main className="grid h-screen min-w-[1200px] grid-cols-[300px_minmax(480px,1fr)_280px_300px] overflow-hidden">
      <CustomerList />
      <ChatPanel customer={customer} />
      <CustomerInfo customer={customer} />
      <CoachPanel
        isAnalyzing={temperature.isAnalyzing}
        isError={temperature.isError}
        onReanalyze={temperature.reanalyze}
      />
    </main>
  );
}
