"use client";

import type { Customer } from "@/lib/types";
import { useActiveSession } from "@/store/session";
import ChatHeader from "./chat-header";
import MessageList from "./message-list";
import ChatInput from "./chat-input";

export default function ChatPanel({ customer }: { customer: Customer }) {
  const session = useActiveSession();
  const lastAt = session.messages[session.messages.length - 1]?.at ?? 0;
  const elapsedMin = Math.max(1, Math.floor(lastAt / 60_000) + 4);

  return (
    <section className="flex h-full min-w-0 flex-col border-r border-line bg-[#f2f3f8]">
      <ChatHeader customer={customer} elapsedMin={elapsedMin} />
      <MessageList
        customer={customer}
        messages={session.messages}
        customerTyping={session.customerTyping}
        lastCustomerAt={session.lastCustomerAt}
      />
      <ChatInput />
    </section>
  );
}
