"use client";

import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useActiveSession, useSessionStore } from "@/store/session";
import { customers } from "@/lib/mock/customers";
import { silenceMinutes } from "@/lib/clock";
import type { Message, TemperatureSnapshot } from "@/lib/types";

/** below this many customer utterances there is nothing to judge */
export const MIN_CUSTOMER_MESSAGES = 1;

/** 이 시간을 넘긴 무응답부터는 고객 발화가 없어도 온도를 다시 읽는다 */
const SILENCE_RECHECK_MIN = 10;

type AnalyzeVars = {
  customerId: string;
  messages: Message[];
  startedAt: string;
  previousSnapshot?: TemperatureSnapshot;
};

export function customerTurn(messages: Message[]): number {
  return messages.filter((m) => m.role === "customer").length;
}

/**
 * Runs the temperature analysis. Auto-triggers whenever a new customer
 * message lands (per Figma's "실시간 분석"), and also when the counselor
 * speaks into a silence past 10분 — engagement 축은 발화 없이도 식는다.
 * If a request is in flight the newest state waits and exactly one follow-up
 * runs after it settles (latest-wins dedupe).
 */
export function useTemperature() {
  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const session = useActiveSession();
  const addSnapshot = useSessionStore((s) => s.addSnapshot);
  const startedAt =
    customers.find((c) => c.id === activeCustomerId)?.startedAt ?? "00:00";

  const mutation = useMutation({
    mutationFn: async (vars: AnalyzeVars) => {
      const { data } = await axios.post<TemperatureSnapshot>(
        "/api/temperature",
        {
          messages: vars.messages,
          startedAt: vars.startedAt,
          previousSnapshot: vars.previousSnapshot,
        },
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

  // 재분석이 필요한 마지막 메시지 — 고객 발화이거나, 길어진 침묵 속 상담사 발화
  const last = session.messages[session.messages.length - 1];
  const silent =
    silenceMinutes(session.messages, startedAt) >= SILENCE_RECHECK_MIN;
  const triggerId =
    last && (last.role === "customer" || silent) ? last.id : undefined;
  const analyzedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!triggerId) return;
    if (customerTurn(session.messages) < MIN_CUSTOMER_MESSAGES) return;
    const key = `${activeCustomerId}:${session.epoch}:${triggerId}`;
    if (analyzedKeyRef.current === key) return;
    // skip if this exact point in the conversation already has a snapshot
    if (session.snapshots.some((s) => s.seq === session.messages.length)) {
      analyzedKeyRef.current = key;
      return;
    }
    analyzedKeyRef.current = key;
    run({
      customerId: activeCustomerId,
      messages: session.messages,
      startedAt,
      previousSnapshot: session.snapshots[session.snapshots.length - 1],
    });
  }, [
    activeCustomerId,
    startedAt,
    triggerId,
    session.epoch,
    session.messages,
    session.snapshots,
    run,
  ]);

  const reanalyze = useCallback(() => {
    if (customerTurn(session.messages) < MIN_CUSTOMER_MESSAGES) return;
    run({
      customerId: activeCustomerId,
      messages: session.messages,
      startedAt,
      previousSnapshot: session.snapshots[session.snapshots.length - 1],
    });
  }, [activeCustomerId, startedAt, session.messages, session.snapshots, run]);

  return {
    isAnalyzing: mutation.isPending,
    isError: mutation.isError,
    reanalyze,
  };
}
