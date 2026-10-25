import { useEffect, useState, useRef } from "react";

export default function Timer({
  startedAt,
  durationMinutes = 15,
  graceMinutes = 5,
  onGracePeriodStart,
  onGracePeriodEnd,
}) {
  const [mainRemaining, setMainRemaining] = useState(null);
  const [graceRemaining, setGraceRemaining] = useState(null);
  const graceStartedRef = useRef(false);
  const graceEndedRef = useRef(false);

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const mainSeconds = (Number(durationMinutes) || 15) * 60;
    const graceSeconds = (Number(graceMinutes) || 5) * 60;
    const totalAllowedSeconds = mainSeconds + graceSeconds;

    graceStartedRef.current = false;
    graceEndedRef.current = false;

    const tick = () => {
      const elapsedSec = Math.floor((Date.now() - start) / 1000);
      const mainLeft = Math.max(0, mainSeconds - elapsedSec);
      setMainRemaining(mainLeft);

      if (mainLeft <= 0) {
        if (!graceStartedRef.current && onGracePeriodStart) {
          graceStartedRef.current = true;
          onGracePeriodStart();
        }

        const graceLeft = Math.max(0, totalAllowedSeconds - elapsedSec);
        setGraceRemaining(graceLeft);

        if (graceLeft <= 0 && !graceEndedRef.current && onGracePeriodEnd) {
          graceEndedRef.current = true;
          onGracePeriodEnd();
        }
      } else {
        setGraceRemaining(graceSeconds);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, graceMinutes, onGracePeriodStart, onGracePeriodEnd]);

  if (mainRemaining === null) {
    const defaultMins = String(Math.floor(Number(durationMinutes) || 15)).padStart(2, "0");
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        ⏱ {defaultMins}:00
      </span>
    );
  }

  // Grace Period Mode: Main time is 0, counting down 5 minutes grace
  if (mainRemaining <= 0) {
    const gMins = String(Math.floor((graceRemaining || 0) / 60)).padStart(2, "0");
    const gSecs = String((graceRemaining || 0) % 60).padStart(2, "0");
    const isGraceExpired = graceRemaining === 0;

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shadow-sm ${
          isGraceExpired
            ? "bg-red-600 text-white animate-pulse"
            : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 ring-2 ring-red-400 animate-pulse"
        }`}
        title="Interview time is over. 5-minute grace period active to answer your final question."
      >
        <span className="text-sm">⚠️</span>
        <span>Grace: {gMins}:{gSecs}</span>
      </span>
    );
  }

  // Normal Countdown Mode
  const mins = String(Math.floor(mainRemaining / 60)).padStart(2, "0");
  const secs = String(mainRemaining % 60).padStart(2, "0");
  const isUrgent = mainRemaining <= 120; // 2 minutes left

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-mono font-semibold transition-colors flex items-center gap-1 ${
        isUrgent
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse ring-1 ring-amber-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
      title={`${mins}:${secs} remaining`}
    >
      <span className="animate-spin text-xs" style={{ animationDuration: "3s" }}>⏱</span>
      <span>{mins}:{secs}</span>
      {isUrgent && <span className="text-xs">⚠️</span>}
    </span>
  );
}
