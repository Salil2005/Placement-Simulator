// import { useCallback, useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { interviewService } from "../services/interviewService.js";
// import { getSocket } from "../services/socket.js";
// import { useSpeech } from "./useSpeech.js";

// const SOCKET_ACK_TIMEOUT_MS = 6000;

// /** Submits an answer over the live socket connection, racing against a timeout/disconnect. */
// function submitAnswerViaSocket(payload) {
//   return new Promise((resolve, reject) => {
//     const socket = getSocket();
//     if (!socket.connected) {
//       reject(new Error("Realtime connection unavailable"));
//       return;
//     }

//     const timer = setTimeout(() => reject(new Error("Realtime request timed out")), SOCKET_ACK_TIMEOUT_MS);

//     socket.emit("interview:answer", payload, (ack) => {
//       clearTimeout(timer);
//       if (ack?.ok) resolve(ack);
//       else reject(new Error(ack?.error || "Realtime request failed"));
//     });
//   });
// }

// /**
//  * Owns interview chat/coding state end to end: loads or starts the interview,
//  * tracks the running transcript, submits answers, and advances to the next
//  * adaptive question (or routes to the report once the interview is complete).
//  */
// export function useInterview(interviewId) {
//   const navigate = useNavigate();
//   const [interview, setInterview] = useState(null);
//   const [currentQuestion, setCurrentQuestion] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [pending, setPending] = useState(true);
//   const [error, setError] = useState(null);
//   const [autoSpeak, setAutoSpeak] = useState(false);
//   const initialized = useRef(false);
//   const { speak, listening, startListening, stopListening, supported } = useSpeech();

//   // Join this interview's realtime room so the server can push updates (and
//   // so answer submissions below can go out over the socket, not just REST).
//   useEffect(() => {
//     if (!interviewId) return;
//     const socket = getSocket();
//     socket.emit("interview:join", { interviewId });
//   }, [interviewId]);

//   useEffect(() => {
//     if (initialized.current) return;
//     initialized.current = true;

//     (async () => {
//       try {
//         const { interview: iv, session, currentQuestion } = await interviewService.get(interviewId);
//         setInterview(iv);

//         if (iv.status === "not_started") {
//           const { question } = await interviewService.start(interviewId);
//           setCurrentQuestion(question);
//           setMessages([{ role: "ai", content: question.text }]);
//         } else if (iv.status === "in_progress") {
//           const transcriptMsgs = (session?.transcript || []).map((t) => ({
//             role: t.role,
//             content: t.content,
//           }));
//           setMessages(transcriptMsgs);
//           // Use the real pending question (with its true _id) resolved by the
//           // server, rather than guessing from transcript text - guessing left
//           // _id unset/null and broke answer submission after a page refresh.
//           setCurrentQuestion(currentQuestion);
//         } else {
//           navigate(`/report/${interviewId}`);
//         }
//       } catch (err) {
//         setError(err.message);
//       } finally {
//         setPending(false);
//       }
//     })();
//   }, [interviewId, navigate]);

//   const submitAnswer = useCallback(
//     async ({ answerText, code, language }) => {
//       if (pending) return;
//       if (!currentQuestion?._id) {
//         setError("The current question is unavailable. Please refresh the page and try again.");
//         return;
//       }
//       setError(null);
//       const optimisticMessage = { id: crypto.randomUUID(), role: "user", content: answerText || code };
//       setMessages((prev) => [...prev, optimisticMessage]);
//       setPending(true);
//       try {
//         const payload = { interviewId, questionId: currentQuestion?._id, answerText, code, language };

//         // Realtime path first (instant delivery, no HTTP round trip setup);
//         // transparently falls back to REST if the socket is down or times
//         // out, so answering never depends on the live connection staying up.
//         let result;
//         try {
//           result = await submitAnswerViaSocket(payload);
//         } catch {
//           result = await interviewService.respond(interviewId, {
//             questionId: currentQuestion?._id,
//             answerText,
//             code,
//             language,
//           });
//         }

//         const { nextQuestion, isFinalQuestion, response } = result;

//         if (isFinalQuestion) {
//           setMessages((prev) => [
//             ...prev,
//             { role: "ai", content: "That's a wrap on the questions - generating your report now." },
//           ]);
//           await interviewService.finish(interviewId);
//           navigate(`/report/${interviewId}`);
//           return;
//         }

//         setCurrentQuestion(nextQuestion);
//         setMessages((prev) => [...prev, { role: "ai", content: nextQuestion.text, flagged: response?.evaluation }]);
//         if (autoSpeak) speak(nextQuestion.text);
//       } catch (err) {
//         setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
//         setError(err.message);
//       } finally {
//         setPending(false);
//       }
//     },
//     [interviewId, currentQuestion, pending, autoSpeak, speak, navigate]
//   );

//   const endInterviewEarly = useCallback(async () => {
//     setPending(true);
//     try {
//       await interviewService.finish(interviewId);
//       navigate(`/report/${interviewId}`);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setPending(false);
//     }
//   }, [interviewId, navigate]);

//   return {
//     interview,
//     currentQuestion,
//     messages,
//     pending,
//     error,
//     submitAnswer,
//     endInterviewEarly,
//     autoSpeak,
//     setAutoSpeak,
//     speech: { listening, startListening, stopListening, supported },
//   };
// }
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
 */
export function useInterview(interviewId) {
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  
  // Refs to prevent concurrent initialization or duplicate submissions across re-renders
  const initialized = useRef(false);
  const isSubmitting = useRef(false);

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
        const { interview: iv, session, currentQuestion } = await interviewService.get(interviewId);
        setInterview(iv);

        if (iv.status === "not_started") {
          // Guard: Only start if status is strictly not_started to avoid duplicate calls
          const { question } = await interviewService.start(interviewId);
          setCurrentQuestion(question);
          setMessages([{ role: "ai", content: question.text }]);
        } else if (iv.status === "in_progress") {
          const transcriptMsgs = (session?.transcript || []).map((t) => ({
            role: t.role,
            content: t.content,
          }));
          setMessages(transcriptMsgs);
          setCurrentQuestion(currentQuestion);
        } else {
          navigate(`/report/${interviewId}`);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setPending(false);
      }
    })();
  }, [interviewId, navigate]);

  const submitAnswer = useCallback(
    async ({ answerText, code, language }) => {
      // Prevent overlapping submissions while one is already processing
      if (pending || isSubmitting.current) return;
      if (!currentQuestion?._id) {
        setError("The current question is unavailable. Please refresh the page and try again.");
        return;
      }

      isSubmitting.current = true;
      setError(null);
      
      const optimisticMessage = { id: crypto.randomUUID(), role: "user", content: answerText || code };
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

        const { nextQuestion, isFinalQuestion, response } = result;

        if (isFinalQuestion) {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: "That's a wrap on the questions - generating your report now." },
          ]);
          await interviewService.finish(interviewId);
          navigate(`/report/${interviewId}`);
          return;
        }

        setCurrentQuestion(nextQuestion);
        setMessages((prev) => [...prev, { role: "ai", content: nextQuestion.text, flagged: response?.evaluation }]);
        if (autoSpeak) speak(nextQuestion.text);
      } catch (err) {
        // If it failed with a duplicate key/conflict error (409), treat the question as already answered and fetch state
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
    [interviewId, currentQuestion, pending, autoSpeak, speak, navigate]
  );

  const endInterviewEarly = useCallback(async () => {
    setPending(true);
    try {
      await interviewService.finish(interviewId);
      navigate(`/report/${interviewId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }, [interviewId, navigate]);

  return {
    interview,
    currentQuestion,
    messages,
    pending,
    error,
    submitAnswer,
    endInterviewEarly,
    autoSpeak,
    setAutoSpeak,
    speech: { listening, startListening, stopListening, supported },
  };
}