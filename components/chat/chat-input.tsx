"use client";

import { useEffect, useRef } from "react";
import { useSessionStore, useActiveSession } from "@/store/session";
import { SendIcon } from "@/components/icons";

const QUICK_ACTIONS = [
  { label: "가설계표", text: "요청하신 가설계표 보내드립니다. 확인 부탁드려요." },
  { label: "보장 비교", text: "기본형과 안심형 보장 차이를 비교해 드릴게요." },
  { label: "상담 종료", text: "오늘 상담은 여기까지 진행할게요. 감사합니다!" },
];

export default function ChatInput() {
  const session = useActiveSession();
  const draft = useSessionStore((s) => s.draft);
  const setDraft = useSessionStore((s) => s.setDraft);
  const send = useSessionStore((s) => s.sendCounselorMessage);
  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);

  const blocked = session.customerTyping;

  // the composer is disabled while the customer types — take focus back as soon
  // as the turn returns so a demo can run on Enter alone
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!blocked) inputRef.current?.focus();
  }, [blocked, activeCustomerId]);

  return (
    <div className="border-t border-line bg-surface px-4 pb-4 pt-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-brand/50"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={blocked ? "고객 응답을 기다리는 중…" : "메시지를 입력하세요"}
          disabled={blocked}
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-faint disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={blocked || !draft.trim()}
          className="text-brand disabled:opacity-30"
          aria-label="전송"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-3 flex gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => setDraft(action.text)}
            className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink-soft hover:border-brand/40 hover:text-brand"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
