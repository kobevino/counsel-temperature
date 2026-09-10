"use client";

import { useSessionStore, useActiveSession } from "@/store/session";
import { scripts } from "@/lib/mock/scripts";
import { SendIcon } from "@/components/icons";

const QUICK_ACTIONS = [
  { label: "가설계표", text: "요청하신 가설계표 보내드립니다. 확인 부탁드려요." },
  { label: "보장 비교", text: "기본형과 안심형 보장 차이를 비교해 드릴게요." },
  { label: "상담 종료", text: "오늘 상담은 여기까지 진행할게요. 감사합니다!" },
];

export default function ChatInput() {
  const activeCustomerId = useSessionStore((s) => s.activeCustomerId);
  const session = useActiveSession();
  const draft = useSessionStore((s) => s.draft);
  const setDraft = useSessionStore((s) => s.setDraft);
  const send = useSessionStore((s) => s.sendCounselorMessage);
  const chooseBranch = useSessionStore((s) => s.chooseBranch);
  const demoHints = useSessionStore((s) => s.demoHints);
  const toggleDemoHints = useSessionStore((s) => s.toggleDemoHints);

  const nextStep = scripts[activeCustomerId]?.[session.scriptCursor];
  const blocked = session.customerTyping || !!session.pendingBranch;

  return (
    <div className="border-t border-line bg-surface px-4 pb-4 pt-3">
      {session.pendingBranch ? (
        <div className="mb-3 rounded-xl border border-brand/30 bg-brand-soft px-3.5 py-3">
          <p className="text-[12px] font-semibold text-brand">
            고객 반응 선택 <span className="font-normal text-ink-faint">(데모 분기)</span>
          </p>
          <div className="mt-2 flex gap-2">
            {session.pendingBranch.map((option) => (
              <button
                key={option.label}
                onClick={() => chooseBranch(option)}
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-left text-[13px] hover:border-brand"
              >
                <span className="font-semibold text-brand">{option.label}</span>
                <span className="mt-0.5 block truncate text-ink-soft">
                  {option.customer}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        demoHints &&
        nextStep && (
          <p className="mb-2 truncate px-1 text-[12px] text-ink-faint">
            <button
              onClick={toggleDemoHints}
              className="mr-1.5 rounded bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint"
              title="대본 힌트 끄기"
            >
              힌트
            </button>
            다음 대본: {nextStep.expect}
          </p>
        )
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-brand/50"
      >
        <input
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
