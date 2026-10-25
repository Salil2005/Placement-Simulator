import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInterview } from "../../hooks/useInterview.js";
import CodeEditor from "../../components/coding/CodeEditor.jsx";
import Conversation from "../../components/interview/Conversation.jsx";
import Timer from "../../components/interview/Timer.jsx";
import Loader from "../../components/common/Loader.jsx";

/** Focused, full-screen variant of the coding round (question panel + full-height editor). */
export default function Coding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const { interview, currentQuestion, messages, pending, submitAnswer, endInterviewEarly } = useInterview(id);

  if (!interview && pending) return <Loader fullScreen label="Loading coding round..." />;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col px-4 py-4 md:px-8">
      {(inGracePeriod || interview?.status === "grace_period") && (
        <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs sm:text-sm text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <span>
              <strong>Your interview time is over. You have 5 minutes to finish answering your current question. No new questions will be provided.</strong>
            </span>
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-2">
        <div className="card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
            <span className="text-sm font-semibold">Question</span>
            <Timer
              startedAt={interview?.startedAt}
              durationMinutes={interview?.durationMinutes || 15}
              graceMinutes={5}
              onGracePeriodStart={() => setInGracePeriod(true)}
              onGracePeriodEnd={endInterviewEarly}
            />
          </div>
          <Conversation messages={messages} pending={pending} />
        </div>

        <div className="flex flex-col gap-3 overflow-hidden">
          <CodeEditor
            defaultLanguage={interview?.programmingLanguage}
            onSubmit={({ code, language }) => submitAnswer({ code, language })}
            disabled={pending}
            questionCreatedAt={currentQuestion?.createdAt}
          />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => navigate(`/interview/${id}`)}>Back to Chat</button>
            <button className="btn-primary" onClick={endInterviewEarly}>End Interview</button>
          </div>
        </div>
      </div>
    </div>
  );
}
