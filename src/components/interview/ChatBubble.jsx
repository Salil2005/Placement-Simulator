/**
 * ChatBubble renders a single message in the interview conversation.
 * Supports special message types:
 * - isWarning: amber banner shown after first invalid answer
 * - isTermination: red banner shown when interview is terminated
 * - isProjectTransition: blue banner shown when switching projects
 * - isSystem: neutral gray system message
 * - code & approach: rendered for coding / DSA questions
 */
export default function ChatBubble({
  role,
  content,
  code,
  approach,
  flagged,
  isWarning,
  isTermination,
  isProjectTransition,
  isSystem,
}) {
  const isAi = role === "ai";

  // Warning message (first invalid answer)
  if (isWarning) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed shadow-sm dark:border-amber-700 dark:bg-amber-950/40">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-base">⚠️</span>
            <p className="whitespace-pre-wrap text-amber-800 dark:text-amber-300">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Termination message (two consecutive invalid answers)
  if (isTermination) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm leading-relaxed shadow-sm dark:border-red-700 dark:bg-red-950/40">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-base">🚫</span>
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Interview Ended</p>
              <p className="mt-1 whitespace-pre-wrap text-red-700 dark:text-red-400">{content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Project transition notice
  if (isProjectTransition) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm leading-relaxed shadow-sm dark:border-indigo-700 dark:bg-indigo-950/40">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-base">🔄</span>
            <div>
              <p className="font-medium text-indigo-800 dark:text-indigo-300">Moving to Next Project</p>
              <p className="mt-1 whitespace-pre-wrap text-indigo-700 dark:text-indigo-400">{content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // System/closing message
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
          <p className="whitespace-pre-wrap text-center">{content}</p>
        </div>
      </div>
    );
  }

  // Standard AI or user message
  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isAi
            ? "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            : "bg-brand-600 text-white"
        }`}
      >
        {code && (
          <div className="mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80 block mb-1">
              Submitted Code
            </span>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 text-slate-100 p-2.5 text-xs font-mono">
              <code>{code}</code>
            </pre>
          </div>
        )}
        {(approach || content) && (
          <div>
            {code && (
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80 block mb-1">
                Approach & Complexity
              </span>
            )}
            <p className="whitespace-pre-wrap">{approach || content}</p>
          </div>
        )}
        {flagged && (flagged.correctness < 50 || flagged.clarity < 50) && (
          <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            ⚠ {flagged.notes}
          </p>
        )}
      </div>
    </div>
  );
}
