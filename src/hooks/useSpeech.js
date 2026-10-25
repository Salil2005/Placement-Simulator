import { useCallback, useRef, useState } from "react";

export function useSpeech() {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const activeSessionRef = useRef(0);

  const SpeechRecognition =
    typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = Boolean(SpeechRecognition) && typeof window !== "undefined" && Boolean(window.speechSynthesis);

  const startListening = useCallback(
    (onResult) => {
      if (!SpeechRecognition) return;

      // Clean up any existing active recognition instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const sessionId = ++activeSessionRef.current;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      recognition.onresult = (event) => {
        if (activeSessionRef.current !== sessionId) return;

        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript + " ";
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const combined = `${finalTranscript}${interimTranscript}`.trim();
        if (combined) {
          onResult?.(combined, false);
        }
      };

      recognition.onerror = (event) => {
        // "aborted" is expected when user releases the button
        if (event.error !== "aborted" && event.error !== "no-speech") {
          console.warn("[speech] recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        if (activeSessionRef.current === sessionId) {
          setListening(false);
          recognitionRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setListening(true);
      } catch (err) {
        console.error("[speech] failed to start recognition:", err);
        setListening(false);
      }
    },
    [SpeechRecognition]
  );

  const stopListening = useCallback(() => {
    activeSessionRef.current++;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const speak = useCallback((text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  return { listening, startListening, stopListening, speak, supported };
}
