"use client";

import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useActiveSession, useSessionStore } from "@/store/session";
import type { Message, TemperatureSnapshot } from "@/lib/types";

/** below this many customer utterances there is nothing to judge */
export const MIN_CUSTOMER_MESSAGES = 1;

type AnalyzeVars = {
  customerId: string;
  messages: Message[];
  previousSnapshot?: TemperatureSnapshot;
};

export function customerTurn(messages: Message[]): number {
  return messages.filter((m) => m.role === "customer").length;
}

/**
 * Runs the temperature analysis. Auto-triggers whenever a new customer
 * message lands (per Figma's "실시간 분석"); if a request is in flight the
 * newest state waits and exactly one follow-up runs after it settles
 * (latest-wins dedupe).
 */
export function useTemperature() {
  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const session = useActiveSession();
  const addSnapshot = useSessionStore((s) => s.addSnapshot);

  const mutation = useMutation({
    mutationFn: async (vars: AnalyzeVars) => {
      const { data } = await axios.post<TemperatureSnapshot>(
        "/api/temperature",
        { messages: vars.messages, previousSnapshot: vars.previousSnapshot },
      );
      return data;
    },
    onSuccess: (snapshot, vars) => addSnapshot(vars.customerId, snapshot),
  });

  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;
  const busyRef = useRef(false);
  const queuedRef = useRef<AnalyzeVars | null>(null);

  const run = useCallback((vars: AnalyzeVars) => {
    if (busyRef.current) {
      queuedRef.current = vars; // latest wins
      return;
    }
    busyRef.current = true;
    mutateRef.current(vars, {
      onSettled: () => {
        busyRef.current = false;
        const next = queuedRef.current;
        queuedRef.current = null;
        if (next) run(next);
      },
    });
  }, []);

  // auto-trigger keyed by the last customer message of the active session
  const lastCustomerMsgId = [...session.messages]
    .reverse()
    .find((m) => m.role === "customer")?.id;
  const analyzedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastCustomerMsgId) return;
    if (customerTurn(session.messages) < MIN_CUSTOMER_MESSAGES) return;
    const key = `${activeCustomerId}:${lastCustomerMsgId}`;
    if (analyzedKeyRef.current === key) return;
    // skip if this turn is already covered by a persisted snapshot
    const turn = customerTurn(session.messages);
    if (session.snapshots.some((s) => s.turn === turn)) {
      analyzedKeyRef.current = key;
      return;
    }
    analyzedKeyRef.current = key;
    run({
      customerId: activeCustomerId,
      messages: session.messages,
      previousSnapshot: session.snapshots[session.snapshots.length - 1],
    });
  }, [activeCustomerId, lastCustomerMsgId, session.messages, session.snapshots, run]);

  const reanalyze = useCallback(() => {
    if (customerTurn(session.messages) < MIN_CUSTOMER_MESSAGES) return;
    run({
      customerId: activeCustomerId,
      messages: session.messages,
      previousSnapshot: session.snapshots[session.snapshots.length - 1],
    });
  }, [activeCustomerId, session.messages, session.snapshots, run]);

  return {
    isAnalyzing: mutation.isPending,
    isError: mutation.isError,
    reanalyze,
  };
}
