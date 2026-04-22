import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onFinal?: (text: string) => void;
}

export function useSpeechRecognition({ lang = "ar-SA", onFinal }: UseSpeechRecognitionOptions = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SR | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setInterim("");
        onFinalRef.current?.(finalText.trim());
      }
    };
    rec.onerror = (e: any) => {
      setError(e.error || "speech_error");
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    setError(null);
    setInterim("");
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch (e) {
      // already started
    }
  }, []);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, error, start, stop, toggle };
}
