"use client";

import axios from "axios";
import { create } from "zustand";
import type { Message, TemperatureSnapshot } from "@/lib/types";
import { initialMessages, openingCount } from "@/lib/mock/scripts";
import { customers } from "@/lib/mock/customers";
import { mockCustomerReply } from "@/lib/mock/replies";

const TURN_GAP = 60_000; // 1 scripted minute per off-script exchange

export type CustomerSession = {
  messages: Message[];
  customerTyping: boolean;
  snapshots: TemperatureSnapshot[];
  liveSeq: number;
  /** how many scripted messages have been played so far */
  scriptIndex: number;
  /** bumped on reset so the analyzer re-runs on a replayed conversation */
  epoch: number;
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

function scriptOf(customerId: string): Message[] {
  return initialMessages[customerId] ?? [];
}

function freshSession(customerId: string, epoch = 0): CustomerSession {
  const script = scriptOf(customerId);
  const opening = openingCount(script);
  return {
    messages: script.slice(0, opening),
    customerTyping: false,
    snapshots: [],
    liveSeq: 0,
    scriptIndex: opening,
    epoch,
  };
}

function initialSessions(): Record<string, CustomerSession> {
  return Object.fromEntries(customers.map((c) => [c.id, freshSession(c.id)]));
}

/** minimum on-screen typing time so replies don't pop in instantly */
function typingDelay(text: string): number {
  return Math.min(2500, 600 + text.length * 25);
}

/** the counselor line the script expects next, "" when it's not their turn */
function nextCounselorLine(session: CustomerSession, customerId: string): string {
  const next = scriptOf(customerId)[session.scriptIndex];
  return next?.role === "counselor" ? next.text : "";
}

// reply requests in flight, keyed by customer
const inFlight = new Set<string>();
// pending scripted deliveries, so a reset can cancel them
const timers = new Map<string, ReturnType<typeof setTimeout>>();

// state is intentionally NOT persisted — a refresh resets every conversation
export const useSessionStore = create<SessionStore>()((set, get) => {
  const appendCustomerMessage = (
    customerId: string,
    text: string,
    scripted?: Message,
  ) => {
    set((s) => {
      const session = s.sessions[customerId];
      if (!session) return s;
      const last = session.messages[session.messages.length - 1];
      const msg: Message = scripted ?? {
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
            liveSeq: scripted ? session.liveSeq : session.liveSeq + 1,
            scriptIndex: scripted ? session.scriptIndex + 1 : session.scriptIndex,
          },
        },
      };
    });
  };

  /** keep the composer loaded with the next scripted counselor line */
  const syncDraft = (customerId: string) => {
    if (get().activeCustomerId !== customerId) return;
    const session = get().sessions[customerId];
    if (!session) return;
    set({ draft: nextCounselorLine(session, customerId) });
  };

  /**
   * Play every customer message the script has queued up after the current
   * position, one typing beat at a time. Stops when the script hands the turn
   * back to the counselor (or runs out) — that's when 무응답 케이스 goes quiet.
   */
  const playCustomerRun = (customerId: string) => {
    const session = get().sessions[customerId];
    if (!session) return;
    const next = scriptOf(customerId)[session.scriptIndex];
    if (next?.role !== "customer") {
      syncDraft(customerId);
      return;
    }

    set((s) => ({
      sessions: {
        ...s.sessions,
        [customerId]: { ...s.sessions[customerId], customerTyping: true },
      },
    }));

    const timer = setTimeout(() => {
      timers.delete(customerId);
      appendCustomerMessage(customerId, next.text, next);
      playCustomerRun(customerId);
    }, typingDelay(next.text));
    timers.set(customerId, timer);
  };

  const sessions = initialSessions();
  const firstCustomerId = customers[0].id;

  return {
    activeCustomerId: firstCustomerId,
    sessions,
    draft: nextCounselorLine(sessions[firstCustomerId], firstCustomerId),
    highlightId: null,

    selectCustomer: (id) => {
      const session = get().sessions[id];
      set({
        activeCustomerId: id,
        draft: session ? nextCounselorLine(session, id) : "",
        highlightId: null,
      });
    },
    setDraft: (text) => set({ draft: text }),
    setHighlight: (id) => set({ highlightId: id }),

    sendCounselorMessage: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const { activeCustomerId } = get();
      const session = get().sessions[activeCustomerId];
      if (!session || session.customerTyping) return;

      const scripted = scriptOf(activeCustomerId)[session.scriptIndex];
      const onScript = scripted?.role === "counselor";
      const last = session.messages[session.messages.length - 1];

      // on-script sends keep the scripted id and timestamp even if the
      // presenter rewrote the line, so the clock stays true to the 대본
      const msg: Message = onScript
        ? { ...scripted, text: trimmed }
        : {
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
            liveSeq: onScript
              ? s.sessions[activeCustomerId].liveSeq
              : s.sessions[activeCustomerId].liveSeq + 1,
            scriptIndex: onScript
              ? s.sessions[activeCustomerId].scriptIndex + 1
              : s.sessions[activeCustomerId].scriptIndex,
          },
        },
      }));

      if (onScript) playCustomerRun(activeCustomerId);
      else get().requestCustomerReply(activeCustomerId);
    },

    // off-script continuation: the persona reply engine takes over once the
    // 대본 is exhausted (or when the counselor improvises past it)
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
          const timer = setTimeout(() => {
            timers.delete(customerId);
            inFlight.delete(customerId);
            appendCustomerMessage(customerId, text);
          }, remaining);
          timers.set(customerId, timer);
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

    // replay from the top — cancels anything mid-flight so a re-run is clean
    resetSession: (id) => {
      const timer = timers.get(id);
      if (timer) clearTimeout(timer);
      timers.delete(id);
      inFlight.delete(id);
      const session = freshSession(id, (get().sessions[id]?.epoch ?? 0) + 1);
      set((s) => ({
        sessions: { ...s.sessions, [id]: session },
        draft:
          s.activeCustomerId === id ? nextCounselorLine(session, id) : s.draft,
      }));
    },
  };
});

export function useActiveSession(): CustomerSession {
  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const session = useSessionStore((s) => s.sessions[activeCustomerId]);
  return session ?? freshSession(activeCustomerId);
}
