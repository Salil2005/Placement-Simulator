import { useState } from "react";
import { useParams } from "react-router-dom";
import { useInterview } from "../../hooks/useInterview.js";
import Conversation from "../../components/interview/Conversation.jsx";
import PromptInput from "../../components/interview/PromptInput.jsx";
import Timer from "../../components/interview/Timer.jsx";
import CodeEditor from "../../components/coding/CodeEditor.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Loader from "../../components/common/Loader.jsx";

export default function Interview() {
  const { id } = useParams();
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const {
    interview,
    currentQuestion,
    messages,
    pending,
    error,
    submitAnswer,
    endInterviewEarly,
    autoSpeak,
    setAutoSpeak,
    speech,
  } = useInterview(id);

  if (!interview && pending) return <Loader fullScreen label="Preparing your interview..." />;

  const isCoding = interview?.category === "dsa";

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-6xl flex-col px-4 py-4 md:px-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge color="brand">{interview?.category}</Badge>
          <Badge color="neutral">{interview?.difficulty}</Badge>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{interview?.role}</span>
        </div>
        <div className="flex items-center gap-2">
          <Timer
            startedAt={interview?.startedAt}
            durationMinutes={interview?.durationMinutes || 15}
            graceMinutes={5}
            onGracePeriodStart={() => setInGracePeriod(true)}
            onGracePeriodEnd={endInterviewEarly}
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
            Auto-speak
          </label>
          <button onClick={endInterviewEarly} className="btn-secondary !py-1 !px-3 text-xs">
            End Interview
          </button>
        </div>
      </div>

      {(inGracePeriod || interview?.status === "grace_period") && (
        <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs sm:text-sm text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <span>
              <strong>Your interview time is over. You have 5 minutes to finish answering your current question. No new questions will be provided.</strong>
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className={`grid flex-1 gap-4 overflow-hidden ${isCoding ? "md:grid-cols-2" : "grid-cols-1"}`}>
        <div className="card flex flex-1 flex-col overflow-hidden">
          <Conversation messages={messages} pending={pending} />
          <PromptInput
            onSubmit={(text) => submitAnswer({ answerText: text })}
            disabled={pending}
            speech={speech}
            questionCreatedAt={currentQuestion?.createdAt}
          />
        </div>

        {isCoding && (
          <div className="hidden md:block">
            <CodeEditor
              defaultLanguage={interview?.programmingLanguage}
              onSubmit={({ code, language }) => submitAnswer({ code, language })}
              disabled={pending}
              questionCreatedAt={currentQuestion?.createdAt}
            />
          </div>
        )}
      </div>
    </div>
  );
}
