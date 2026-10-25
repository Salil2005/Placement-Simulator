import { useState, useRef, useEffect } from "react";

export default function PromptInput({
  onSubmit,
  disabled,
  speech,
  questionCreatedAt,
  minWaitSeconds = 120,
}) {
  const [value, setValue] = useState("");
  const [lockRemaining, setLockRemaining] = useState(0);
  const initialValueOnPressRef = useRef("");

  // Lock countdown: 2 minutes (120s) minimum wait per question
  useEffect(() => {
    // If no created timestamp provided, start a 120s countdown from the moment this question mounted
    const start = questionCreatedAt ? new Date(questionCreatedAt).getTime() : Date.now();

    const updateWait = () => {
      const elapsedSec = Math.floor((Date.now() - start) / 1000);
      const remainingSec = Math.max(0, minWaitSeconds - elapsedSec);
      setLockRemaining(remainingSec);
    };

    updateWait();
    const interval = setInterval(updateWait, 1000);
    return () => clearInterval(interval);
  }, [questionCreatedAt, minWaitSeconds]);

  const submit = (e) => {
    e?.preventDefault();
    if (!value.trim() || lockRemaining > 0 || disabled) return;
    onSubmit(value);
    setValue("");
  };

  const handleHoldStart = (e) => {
    e.preventDefault();
    if (disabled || !speech.supported) return;

    initialValueOnPressRef.current = value;
    speech.startListening((spokenChunk) => {
      setValue(() => {
        const base = initialValueOnPressRef.current.trim();
        return base ? `${base} ${spokenChunk}` : spokenChunk;
      });
    });
  };

  const handleHoldEnd = (e) => {
    e.preventDefault();
    if (speech.listening) {
      speech.stopListening();
    }
  };

  const isLocked = lockRemaining > 0;
  const lockMins = String(Math.floor(lockRemaining / 60)).padStart(2, "0");
  const lockSecs = String(lockRemaining % 60).padStart(2, "0");

  return (
    <div className="border-t border-slate-200 p-3 dark:border-slate-800">
      {speech.listening && (
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-red-500 animate-pulse">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
          </span>
          Listening... (Release to stop speaking)
        </div>
      )}

      {isLocked && !speech.listening && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
          <span>⏳</span>
          <span>
            Thinking time: Please reflect on your answer. Submission unlocks in{" "}
            <strong>{lockMins}:{lockSecs}</strong>.
          </span>
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          className="input min-h-[48px] flex-1 resize-none"
          rows={2}
          placeholder={
            isLocked
              ? `You can type or prepare your answer now... (Submits unlock in ${lockMins}:${lockSecs})`
              : "Type your answer, or hold the mic button to speak..."
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          disabled={disabled}
        />

        {speech.supported && (
          <button
            type="button"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            disabled={disabled}
            className={`btn-secondary select-none transition-all duration-150 !px-3.5 !py-2.5 font-medium flex items-center gap-1.5 ${
              speech.listening
                ? "!bg-red-500 !text-white ring-2 ring-red-300 dark:ring-red-900 shadow-md scale-105"
                : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title="Hold to speak, release to stop"
          >
            <span>🎤</span>
            <span className="text-xs hidden sm:inline">
              {speech.listening ? "Release" : "Hold"}
            </span>
          </button>
        )}

        <button
          type="submit"
          disabled={disabled || !value.trim() || isLocked}
          className={`btn-primary flex items-center gap-1.5 ${
            isLocked ? "opacity-60 cursor-not-allowed" : ""
          }`}
          title={isLocked ? `Submission unlocks in ${lockMins}:${lockSecs}` : "Send Answer"}
        >
          {isLocked ? (
            <>
              <span>⏳</span>
              <span>{lockMins}:{lockSecs}</span>
            </>
          ) : (
            <span>Send</span>
          )}
        </button>
      </form>
    </div>
  );
}
