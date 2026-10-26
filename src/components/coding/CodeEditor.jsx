import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "../../context/ThemeContext.jsx";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "typescript", label: "TypeScript" },
];

const STARTER = {
  javascript: "function solve() {\n  // your code here\n}\n",
  python: "def solve():\n    # your code here\n    pass\n",
  java: "class Solution {\n    void solve() {\n        // your code here\n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    // your code here\n}\n",
  typescript: "function solve(): void {\n  // your code here\n}\n",
};

export default function CodeEditor({
  defaultLanguage = "javascript",
  onSubmit,
  disabled,
  questionCreatedAt,
  minWaitSeconds = 120,
  code: externalCode,
  onCodeChange: externalOnCodeChange,
  language: externalLanguage,
  onLanguageChange: externalOnLanguageChange,
}) {
  const { theme } = useTheme();
  const [internalLanguage, setInternalLanguage] = useState(defaultLanguage);
  const [internalCode, setInternalCode] = useState(STARTER[defaultLanguage]);
  const [lockRemaining, setLockRemaining] = useState(0);

  const language = externalLanguage !== undefined ? externalLanguage : internalLanguage;
  const code = externalCode !== undefined ? externalCode : internalCode;

  // Reset starter code whenever a new question starts
  useEffect(() => {
    const starter = STARTER[language] || "";
    if (externalOnCodeChange) externalOnCodeChange(starter);
    else setInternalCode(starter);
  }, [questionCreatedAt]);

  useEffect(() => {
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

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    const starter = STARTER[lang] || "";
    if (externalOnLanguageChange) externalOnLanguageChange(lang);
    else setInternalLanguage(lang);

    if (externalOnCodeChange) externalOnCodeChange(starter);
    else setInternalCode(starter);
  };

  const isLocked = lockRemaining > 0;
  const lockMins = String(Math.floor(lockRemaining / 60)).padStart(2, "0");
  const lockSecs = String(lockRemaining % 60).padStart(2, "0");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <select value={language} onChange={handleLanguageChange} className="input !w-auto !py-1 text-xs">
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          {isLocked && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>⏳ Unlocks in {lockMins}:{lockSecs}</span>
            </span>
          )}
          <button
            className={`btn-primary !py-1 !px-3 text-xs flex items-center gap-1 ${
              isLocked ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={disabled || isLocked}
            onClick={() => onSubmit({ code, language })}
            title={isLocked ? `Submit unlocks in ${lockMins}:${lockSecs}` : "Submit Code"}
          >
            {isLocked ? `Wait ${lockMins}:${lockSecs}` : "Submit Code"}
          </button>
        </div>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(v) => {
            if (externalOnCodeChange) externalOnCodeChange(v ?? "");
            else setInternalCode(v ?? "");
          }}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
