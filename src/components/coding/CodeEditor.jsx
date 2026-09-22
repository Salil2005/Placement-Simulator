import { useState } from "react";
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

export default function CodeEditor({ defaultLanguage = "javascript", onSubmit, disabled }) {
  const { theme } = useTheme();
  const [language, setLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(STARTER[defaultLanguage]);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(STARTER[lang] || "");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <select value={language} onChange={handleLanguageChange} className="input !w-auto !py-1 text-xs">
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <button
          className="btn-primary !py-1 !px-3 text-xs"
          disabled={disabled}
          onClick={() => onSubmit({ code, language })}
        >
          Submit Code
        </button>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(v) => setCode(v ?? "")}
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
