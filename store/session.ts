"use client";

import axios from "axios";
import { create } from "zustand";
import type { Message, TemperatureSnapshot } from "@/lib/types";
import { initialMessages } from "@/lib/mock/scripts";
import { customers } from "@/lib/mock/customers";
import { mockCustomerReply } from "@/lib/mock/replies";

const TURN_GAP = 60_000; // 1 scripted minute per exchange

export type CustomerSession = {
  messages: Message[];
  customerTyping: boolean;
  snapshots: TemperatureSnapshot[];
  liveSeq: number;
};

type SessionStore = {
  activeCustomerId: string;
  sessions: Record<string, CustomerSession>;
  draft: string;
  /** message to flash-highlight when an evidence quote is clicked (transient) */
  highlightId: string | null;
  selectCustomer: (id: string) => void;
  setDraft: (text: string) => void;
  setHighlight: (id: string | null) => void;
  sendCounselorMessage: (text: string) => void;
  /** ask the reply engine for the customer's next message (idempotent per customer) */
  requestCustomerReply: (customerId: string) => void;
  addSnapshot: (customerId: string, snapshot: TemperatureSnapshot) => void;
  resetSession: (id: string) => void;
};

function freshSession(customerId: string): CustomerSession {
  return {
    messages: initialMessages[customerId] ?? [],
    customerTyping: false,
    snapshots: [],
    liveSeq: 0,
  };
}

function initialSessions(): Record<string, CustomerSession> {
  return Object.fromEntries(customers.map((c) => [c.id, freshSession(c.id)]));
}

/** minimum on-screen typing time so replies don't pop in instantly */
function typingDelay(text: string): number {
  return Math.min(2500, 600 + text.length * 25);
}

// reply requests in flight, keyed by customer
const inFlight = new Set<string>();

// state is intentionally NOT persisted — a refresh resets every conversation
export const useSessionStore = create<SessionStore>()((set, get) => {
      const appendCustomerMessage = (customerId: string, text: string) => {
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
      };

      return {
        activeCustomerId: "park",
        sessions: initialSessions(),
        draft: "",
        highlightId: null,

        selectCustomer: (id) =>
          set({ activeCustomerId: id, draft: "", highlightId: null }),
        setDraft: (text) => set({ draft: text }),
        setHighlight: (id) => set({ highlightId: id }),

        sendCounselorMessage: (text) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          const { activeCustomerId } = get();
          const session = get().sessions[activeCustomerId];
          if (!session || session.customerTyping) return;

          const last = session.messages[session.messages.length - 1];
          const msg: Message = {
            id: `${activeCustomerId}-live-${session.liveSeq + 1}`,
            role: "counselor",
            text: trimmed,
            at: (last?.at ?? 0) + TURN_GAP,
          };

          set((s) => ({
            draft: "",
            sessions: {
              ...s.sessions,
              [activeCustomerId]: {
                ...s.sessions[activeCustomerId],
                messages: [...s.sessions[activeCustomerId].messages, msg],
                liveSeq: s.sessions[activeCustomerId].liveSeq + 1,
              },
            },
          }));

          get().requestCustomerReply(activeCustomerId);
        },

        requestCustomerReply: (customerId) => {
          const session = get().sessions[customerId];
          if (!session || inFlight.has(customerId)) return;
          const last = session.messages[session.messages.length - 1];
          if (last?.role !== "counselor") return; // customer already answered

          inFlight.add(customerId);
          set((s) => ({
            sessions: {
              ...s.sessions,
              [customerId]: { ...s.sessions[customerId], customerTyping: true },
            },
          }));

          const startedAt = Date.now();
          axios
            .post<{ text: string }>("/api/customer-reply", {
              customerId,
              messages: session.messages,
            })
            .then(({ data }) => data.text)
            // network/server failure → local template so the customer never goes silent
            .catch(() => mockCustomerReply(customerId, session.messages))
            .then((text) => {
              const remaining = Math.max(
                0,
                typingDelay(text) - (Date.now() - startedAt),
              );
              setTimeout(() => {
                inFlight.delete(customerId);
                appendCustomerMessage(customerId, text);
              }, remaining);
            });
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
    });

export function useActiveSession(): CustomerSession {
  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const session = useSessionStore((s) => s.sessions[activeCustomerId]);
  return session ?? freshSession(activeCustomerId);
}
