"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  BranchOption,
  Message,
  TemperatureSnapshot,
} from "@/lib/types";
import { initialMessages, scripts } from "@/lib/mock/scripts";
import { customers } from "@/lib/mock/customers";

const TURN_GAP = 60_000; // 1 scripted minute per exchange

export type CustomerSession = {
  messages: Message[];
  scriptCursor: number;
  customerTyping: boolean;
  pendingBranch: BranchOption[] | null;
  snapshots: TemperatureSnapshot[];
  liveSeq: number;
};

type SessionStore = {
  activeCustomerId: string;
  sessions: Record<string, CustomerSession>;
  demoHints: boolean;
  draft: string;
  /** message to flash-highlight when an evidence quote is clicked (transient) */
  highlightId: string | null;
  selectCustomer: (id: string) => void;
  setDraft: (text: string) => void;
  setHighlight: (id: string | null) => void;
  toggleDemoHints: () => void;
  sendCounselorMessage: (text: string) => void;
  chooseBranch: (option: BranchOption) => void;
  addSnapshot: (customerId: string, snapshot: TemperatureSnapshot) => void;
  resetSession: (id: string) => void;
};

function freshSession(customerId: string): CustomerSession {
  return {
    messages: initialMessages[customerId] ?? [],
    scriptCursor: 0,
    customerTyping: false,
    pendingBranch: null,
    snapshots: [],
    liveSeq: 0,
  };
}

function initialSessions(): Record<string, CustomerSession> {
  return Object.fromEntries(customers.map((c) => [c.id, freshSession(c.id)]));
}

function replyDelay(text: string): number {
  return Math.min(2500, 600 + text.length * 25);
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => {
      /** append the customer reply after a typing delay */
      const scheduleCustomerReply = (customerId: string, text: string) => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [customerId]: { ...s.sessions[customerId], customerTyping: true },
          },
        }));
        setTimeout(() => {
          set((s) => {
            const session = s.sessions[customerId];
            if (!session) return s;
            const last = session.messages[session.messages.length - 1];
            const msg: Message = {
              id: `${customerId}-live-${session.liveSeq + 1}`,
              role: "customer",
              text,
              at: (last?.at ?? 0) + TURN_GAP,
            };
            return {
              sessions: {
                ...s.sessions,
                [customerId]: {
                  ...session,
                  customerTyping: false,
                  messages: [...session.messages, msg],
                  liveSeq: session.liveSeq + 1,
                },
              },
            };
          });
        }, replyDelay(text));
      };

      return {
        activeCustomerId: "park",
        sessions: initialSessions(),
        demoHints: true,
        draft: "",
        highlightId: null,

        selectCustomer: (id) =>
          set({ activeCustomerId: id, draft: "", highlightId: null }),
        setDraft: (text) => set({ draft: text }),
        setHighlight: (id) => set({ highlightId: id }),
        toggleDemoHints: () => set((s) => ({ demoHints: !s.demoHints })),

        sendCounselorMessage: (text) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          const { activeCustomerId } = get();
          const session = get().sessions[activeCustomerId];
          if (!session || session.customerTyping || session.pendingBranch) return;

          const last = session.messages[session.messages.length - 1];
          const msg: Message = {
            id: `${activeCustomerId}-live-${session.liveSeq + 1}`,
            role: "counselor",
            text: trimmed,
            at: (last?.at ?? 0) + TURN_GAP,
          };
          const step = scripts[activeCustomerId]?.[session.scriptCursor];

          set((s) => ({
            draft: "",
            sessions: {
              ...s.sessions,
              [activeCustomerId]: {
                ...s.sessions[activeCustomerId],
                messages: [...s.sessions[activeCustomerId].messages, msg],
                liveSeq: s.sessions[activeCustomerId].liveSeq + 1,
                scriptCursor: step
                  ? s.sessions[activeCustomerId].scriptCursor + 1
                  : s.sessions[activeCustomerId].scriptCursor,
                pendingBranch: step?.branch ?? null,
              },
            },
          }));

          if (step?.customer) {
            scheduleCustomerReply(activeCustomerId, step.customer);
          }
          // branch steps wait for chooseBranch; no step left → customer stays silent
        },

        chooseBranch: (option) => {
          const { activeCustomerId } = get();
          const session = get().sessions[activeCustomerId];
          if (!session?.pendingBranch) return;
          set((s) => ({
            sessions: {
              ...s.sessions,
              [activeCustomerId]: {
                ...s.sessions[activeCustomerId],
                pendingBranch: null,
              },
            },
          }));
          scheduleCustomerReply(activeCustomerId, option.customer);
        },

        addSnapshot: (customerId, snapshot) =>
          set((s) => {
            const session = s.sessions[customerId];
            if (!session) return s;
            // dedupe: keep one snapshot per turn (latest wins)
            const kept = session.snapshots.filter((x) => x.turn !== snapshot.turn);
            return {
              sessions: {
                ...s.sessions,
                [customerId]: {
                  ...session,
                  snapshots: [...kept, snapshot].sort((a, b) => a.turn - b.turn),
                },
              },
            };
          }),

        resetSession: (id) =>
          set((s) => ({
            sessions: { ...s.sessions, [id]: freshSession(id) },
          })),
      };
    },
    {
      name: "counsel-temperature-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        activeCustomerId: s.activeCustomerId,
        sessions: s.sessions,
        demoHints: s.demoHints,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<
          Pick<SessionStore, "activeCustomerId" | "sessions" | "demoHints">
        > | null;
        if (!p) return current;
        // timers don't survive a refresh — clear transient typing flags
        const sessions = { ...current.sessions };
        for (const [id, session] of Object.entries(p.sessions ?? {})) {
          sessions[id] = { ...session, customerTyping: false };
        }
        return {
          ...current,
          activeCustomerId: p.activeCustomerId ?? current.activeCustomerId,
          demoHints: p.demoHints ?? current.demoHints,
          sessions,
        };
      },
    },
  ),
);

export function useActiveSession(): CustomerSession {
  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const session = useSessionStore((s) => s.sessions[activeCustomerId]);
  return session ?? freshSession(activeCustomerId);
}
