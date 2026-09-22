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
  const { interview, messages, pending, submitAnswer, endInterviewEarly } = useInterview(id);

  if (!interview && pending) return <Loader fullScreen label="Loading coding round..." />;

  return (
    <div className="grid h-[calc(100vh-64px)] grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2 md:px-8">
      <div className="card flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <span className="text-sm font-semibold">Question</span>
          <Timer startedAt={interview?.startedAt} />
        </div>
        <Conversation messages={messages} pending={pending} />
      </div>

      <div className="flex flex-col gap-3">
        <CodeEditor
          defaultLanguage={interview?.programmingLanguage}
          onSubmit={({ code, language }) => submitAnswer({ code, language })}
          disabled={pending}
        />
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => navigate(`/interview/${id}`)}>Back to Chat</button>
          <button className="btn-primary" onClick={endInterviewEarly}>End Interview</button>
        </div>
      </div>
    </div>
  );
}
