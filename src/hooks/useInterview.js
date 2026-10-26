import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { interviewService } from "../services/interviewService.js";
import { getSocket } from "../services/socket.js";
import { useSpeech } from "./useSpeech.js";

const SOCKET_ACK_TIMEOUT_MS = 6000;

/** Submits an answer over the live socket connection, racing against a timeout/disconnect. */
function submitAnswerViaSocket(payload) {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    if (!socket.connected) {
      reject(new Error("Realtime connection unavailable"));
      return;
    }

    const timer = setTimeout(() => reject(new Error("Realtime request timed out")), SOCKET_ACK_TIMEOUT_MS);

    socket.emit("interview:answer", payload, (ack) => {
      clearTimeout(timer);
      if (ack?.ok) resolve(ack);
      else reject(new Error(ack?.error || "Realtime request failed"));
    });
  });
}

/**
 * Owns interview chat/coding state end to end: loads or starts the interview,
 * tracks the running transcript, submits answers, and advances to the next
 * adaptive question (or routes to the report once the interview is complete).
 *
 * New in this version:
 * - warningMessage: shown after the first invalid answer (retry scenario)
 * - terminationMessage: shown after two consecutive invalid answers
 * - isTerminated: true when interview was ended due to invalid answers
 * - activeProjectId: tracks the current project being discussed
 * - projectTransitionMessage: shown when the interviewer switches projects
 * - isFinalizingReport: true while the report is being generated
 */
export function useInterview(interviewId) {
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState(null);
  const [adaptiveScore, setAdaptiveScore] = useState(0.5);
  const [competencyLevel, setCompetencyLevel] = useState("Intermediate");
  const [autoSpeak, setAutoSpeak] = useState(false);

  // New state for the upgraded interview flow
  const [warningMessage, setWarningMessage] = useState(null);
  const [terminationMessage, setTerminationMessage] = useState(null);
  const [isTerminated, setIsTerminated] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [isFinalizingReport, setIsFinalizingReport] = useState(false);

  // Refs to prevent concurrent initialization or duplicate submissions across re-renders
  const initialized = useRef(false);
  const isSubmitting = useRef(false);
  const isFinalizing = useRef(false);

  const { speak, listening, startListening, stopListening, supported } = useSpeech();

  // Join this interview's realtime room so the server can push updates
  useEffect(() => {
    if (!interviewId) return;
    const socket = getSocket();
    socket.emit("interview:join", { interviewId });
  }, [interviewId]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const data = await interviewService.get(interviewId);
        const {
          interview: iv,
          session,
          currentQuestion,
          adaptiveScore: aScore,
          competencyLevel: cLevel,
          terminationReason,
          activeProjectId: projId,
        } = data;
        setInterview(iv);
        if (typeof aScore === "number") setAdaptiveScore(aScore);
        if (cLevel) setCompetencyLevel(cLevel);
        if (projId) setActiveProjectId(projId);

        // Handle terminated interviews
        if (iv.status === "TERMINATED_INVALID_ANSWERS" || terminationReason) {
          setIsTerminated(true);
          const transcriptMsgs = (session?.transcript || []).map((t) => ({
            role: t.role,
            content: t.content,
          }));
          setMessages(transcriptMsgs);
          setPending(false);
          return;
        }

        if (iv.status === "SKILL_REVIEW" || iv.status === "RESUME_PROCESSING") {
          setPending(false);
          return;
        }

        if (iv.status === "not_started" || iv.status === "READY_TO_START") {
          const { question, interview: startedIv } = await interviewService.start(interviewId);
          if (startedIv) setInterview(startedIv);
          setCurrentQuestion(question);
          setMessages([{ role: "ai", content: question.text }]);
        } else if (iv.status === "in_progress" || iv.status === "grace_period") {
          const transcriptMsgs = (session?.transcript || []).map((t) => ({
            role: t.role,
            content: t.content,
          }));
          setMessages(transcriptMsgs);
          setCurrentQuestion(currentQuestion);
        } else if (iv.status === "FINALIZING") {
          setIsFinalizingReport(true);
        } else if (iv.status === "completed") {
          navigate(`/report/${interviewId}`);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setPending(false);
      }
    })();
  }, [interviewId, navigate]);

  const startAdaptiveEarly = useCallback(async () => {
    setPending(true);
    try {
      const { question, interview: startedIv } = await interviewService.start(interviewId);
      if (startedIv) setInterview(startedIv);
      setCurrentQuestion(question);
      setMessages([{ role: "ai", content: question.text }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }, [interviewId]);

  const updateReviewContext = useCallback(
    async (corrections) => {
      try {
        const { interview: updated } = await interviewService.updateReview(interviewId, corrections);
        setInterview(updated);
        return updated;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [interviewId]
  );

  const submitAnswer = useCallback(
    async ({ answerText, code, language }) => {
      // Block submission during an in-flight request, after termination, or during finalization
      if (pending || isSubmitting.current || isTerminated || isFinalizingReport) return;
      if (!currentQuestion?._id) {
        setError("The current question is unavailable. Please refresh the page and try again.");
        return;
      }

      setWarningMessage(null); // Clear previous warning before new submission

      const optimisticContent = answerText && code
        ? `${answerText}\n\n[Code submitted]`
        : (answerText || (code ? `[Code submitted]\n${code}` : ""));

      const optimisticMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: optimisticContent,
        code: code || "",
        approach: answerText || "",
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setPending(true);

      try {
        const payload = { interviewId, questionId: currentQuestion?._id, answerText, code, language };

        let result;
        try {
          result = await submitAnswerViaSocket(payload);
        } catch {
          result = await interviewService.respond(interviewId, {
            questionId: currentQuestion?._id,
            answerText,
            code,
            language,
          });
        }

        const {
          nextQuestion,
          isFinalQuestion,
          response,
          adaptiveScore: newScore,
          warningMessage: warn,
          terminationMessage: termMsg,
          terminationReason: termReason,
          projectTransitionMessage,
        } = result;

        if (typeof newScore === "number") {
          setAdaptiveScore(newScore);
        }

        if (response?.adaptive_scoring?.score_after) {
          setInterview((prev) => prev ? { ...prev, currentAdaptiveScore: response.adaptive_scoring.score_after } : prev);
        }

        // ── Case 1: Interview terminated (two consecutive invalid answers) ──
        if (termMsg || termReason === "CONSECUTIVE_INVALID_ANSWERS") {
          setIsTerminated(true);
          setTerminationMessage(termMsg);
          setCurrentQuestion(null);
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: termMsg, isTermination: true },
          ]);
          // Trigger finalization flow
          setIsFinalizingReport(true);
          try {
            await interviewService.finish(interviewId);
          } catch (finErr) {
            console.error("Finalization request failed:", finErr.message);
          }
          setIsFinalizingReport(false);
          navigate(`/report/${interviewId}`);
          return;
        }

        // ── Case 2: Warning (first invalid answer — retry question) ──────────
        if (warn) {
          setWarningMessage(warn);
          setCurrentQuestion(nextQuestion);
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: warn, isWarning: true },
            { role: "ai", content: nextQuestion.text },
          ]);
          if (autoSpeak) speak(nextQuestion.text);
          return;
        }

        // ── Case 3: Normal final question → generate report ───────────────────
        if (isFinalQuestion) {
          setCurrentQuestion(null);
          const closingMsg = "That's a wrap on the questions — generating your comprehensive report now. Please wait...";
          setMessages((prev) => [...prev, { role: "ai", content: closingMsg, isSystem: true }]);
          setIsFinalizingReport(true);
          try {
            await interviewService.finish(interviewId);
          } catch (finErr) {
            console.error("Finalization request failed:", finErr.message);
          }
          setIsFinalizingReport(false);
          navigate(`/report/${interviewId}`);
          return;
        }

        // ── Case 4: Normal next question (with optional project transition) ────
        setCurrentQuestion(nextQuestion);

        if (projectTransitionMessage && projectTransitionMessage !== nextQuestion.text) {
          // Show the transition message as a system message before the question
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: projectTransitionMessage, isProjectTransition: true },
          ]);
          setActiveProjectId(nextQuestion.projectReference || "");
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: nextQuestion.text, flagged: response?.evaluation },
          ]);
        }

        if (autoSpeak) speak(nextQuestion.text);
      } catch (err) {
        if (err.message?.includes("409") || err.message?.includes("duplicate")) {
          setError("This question was already submitted. Moving forward...");
          const freshData = await interviewService.get(interviewId);
          if (freshData.currentQuestion) {
            setCurrentQuestion(freshData.currentQuestion);
          }
        } else {
          setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
          setError(err.message);
        }
      } finally {
        isSubmitting.current = false;
        setPending(false);
      }
    },
    [interviewId, currentQuestion, pending, autoSpeak, speak, navigate, isTerminated, isFinalizingReport]
  );

  const endInterviewEarly = useCallback(async () => {
    if (isFinalizing.current || isTerminated) return;
    isFinalizing.current = true;
    setPending(true);
    setIsFinalizingReport(true);
    try {
      await interviewService.finish(interviewId);
      navigate(`/report/${interviewId}`);
    } catch (err) {
      isFinalizing.current = false;
      setIsFinalizingReport(false);
      setError(err.message);
    } finally {
      setPending(false);
    }
  }, [interviewId, navigate, isTerminated]);

  return {
    interview,
    currentQuestion,
    messages,
    pending,
    error,
    adaptiveScore,
    competencyLevel,
    warningMessage,
    terminationMessage,
    isTerminated,
    activeProjectId,
    isFinalizingReport,
    submitAnswer,
    startAdaptiveEarly,
    updateReviewContext,
    endInterviewEarly,
    autoSpeak,
    setAutoSpeak,
    speech: { listening, startListening, stopListening, supported },
  };
}