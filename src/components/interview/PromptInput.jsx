import { useState } from "react";

export default function PromptInput({ onSubmit, disabled, speech }) {
  const [value, setValue] = useState("");

  const submit = (e) => {
    e?.preventDefault();
    if (!value.trim()) return;
    onSubmit(value);
    setValue("");
  };

  const handleMic = () => {
    if (speech.listening) {
      speech.stopListening();
      return;
    }
    speech.startListening((text) => setValue((v) => (v ? `${v} ${text}` : text)));
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
      <textarea
        className="input min-h-[48px] flex-1 resize-none"
        rows={2}
        placeholder="Type your answer..."
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
          onClick={handleMic}
          className={`btn-secondary !px-3 ${speech.listening ? "!bg-red-100 dark:!bg-red-900/40" : ""}`}
          title="Voice input"
        >
          🎤
        </button>
      )}
      <button type="submit" disabled={disabled} className="btn-primary">
        Send
      </button>
    </form>
  );
}
