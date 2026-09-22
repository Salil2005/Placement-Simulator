import { useEffect, useState } from "react";

export default function Timer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      ⏱ {mins}:{secs}
    </span>
  );
}
