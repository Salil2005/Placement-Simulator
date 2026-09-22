export default function ChatBubble({ role, content, flagged }) {
  const isAi = role === "ai";
  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isAi
            ? "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            : "bg-brand-600 text-white"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {flagged && (flagged.correctness < 50 || flagged.clarity < 50) && (
          <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            ⚠ {flagged.notes}
          </p>
        )}
      </div>
    </div>
  );
}
