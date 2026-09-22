import { useEffect, useRef } from "react";
import ChatBubble from "./ChatBubble.jsx";

function Shimmer() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Conversation({ messages, pending }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {messages.map((m, i) => (
        <ChatBubble key={i} role={m.role} content={m.content} flagged={m.flagged} />
      ))}
      {pending && <Shimmer />}
      <div ref={bottomRef} />
    </div>
  );
}
