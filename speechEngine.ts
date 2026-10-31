// FinSight AI — Multilingual Speech Recognition & Text-to-Speech Engine
// Supports Web Speech API with dynamic language selection, 8 Indian languages, and granular error recovery.

import { getLanguageSettings } from "../multilingual/languageConfig";

interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export type SpeechErrorCode =
  | "not-allowed"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "audio-capture"
  | "timeout"
  | "unsupported"
  | "unknown";

export interface SpeechErrorInfo {
  code: SpeechErrorCode;
  message: string;
  suggestion: string;
}

export interface SpeechEngineCallbacks {
  onInterim?: (transcript: string) => void;
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onErrorDetailed?: (errorInfo: SpeechErrorInfo) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

class SpeechEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private isMuted = false;
  private recognitionLang: string = "te-IN";
  private defaultRate: number = 1.0;

  constructor() {
    if (typeof window !== "undefined") {
      this.isMuted = localStorage.getItem("finsight_voice_muted") === "true";
      const settings = getLanguageSettings();
      this.recognitionLang = settings.voiceInputLanguage || "te-IN";
      this.defaultRate = settings.speechSpeed || 1.0;

      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          this.recognition = new SpeechRecognitionClass();
          this.recognition.continuous = false;
          this.recognition.interimResults = true;
          this.recognition.lang = this.recognitionLang;
          this.recognition.maxAlternatives = 1;
        } catch (e) {
          console.warn("[FinSight Speech] Recognition init failed:", e);
        }
      }
    }
  }

  public isSpeechRecognitionSupported(): boolean {
    return !!this.recognition;
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("finsight_voice_muted", String(muted));
      if (muted && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }

  public setRecognitionLanguage(lang: string) {
    this.recognitionLang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public getRecognitionLanguage(): string {
    return this.recognitionLang;
  }

  public setSpeechSpeed(speed: number) {
    this.defaultRate = Math.max(0.5, Math.min(2.0, speed));
  }

  public getSpeechSpeed(): number {
    return this.defaultRate;
  }

  public startListening(callbacks: SpeechEngineCallbacks): boolean {
    if (!this.recognition) {
      const errInfo: SpeechErrorInfo = {
        code: "unsupported",
        message: "Speech recognition is not supported in this browser.",
        suggestion: "Use Google Chrome or Edge, or type your command directly.",
      };
      callbacks.onErrorDetailed?.(errInfo);
      callbacks.onError?.(errInfo.message);
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    // Refresh language from current configuration before starting
    const settings = getLanguageSettings();
    const currentLang = settings.voiceInputLanguage || this.recognitionLang || "te-IN";
    this.recognition.lang = currentLang;

    let finalTranscript = "";

    this.recognition.onstart = () => {
      this.isListening = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (interim && callbacks.onInterim) {
        callbacks.onInterim(interim);
      }

      if (finalTranscript) {
        callbacks.onResult(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      this.isListening = false;
      let code: SpeechErrorCode = "unknown";
      let errorMsg = "Voice recognition error.";
      let suggestion = "Try typing your command below.";

      if (event.error === "not-allowed" || event.error === "permission-denied") {
        code = "not-allowed";
        errorMsg = "Microphone access blocked. Please allow microphone permissions in your browser.";
        suggestion = "Click the lock icon in your browser address bar and enable microphone access.";
      } else if (event.error === "language-not-supported") {
        code = "language-not-supported";
        errorMsg = `Voice recognition for language '${currentLang}' is not supported in this browser.`;
        suggestion = "Switch voice language to English or Telugu, or type instead.";
      } else if (event.error === "no-speech") {
        code = "no-speech";
        errorMsg = "No speech detected. Please tap the microphone and speak again.";
        suggestion = "Speak clearly into your microphone or try typing below.";
      } else if (event.error === "network") {
        code = "network";
        errorMsg = "Network error during speech recognition.";
        suggestion = "Check your internet connection or use typing mode.";
      } else if (event.error === "audio-capture") {
        code = "audio-capture";
        errorMsg = "No microphone found on this device.";
        suggestion = "Ensure a microphone is plugged in and recognized by your system.";
      }

      callbacks.onErrorDetailed?.({ code, message: errorMsg, suggestion });
      callbacks.onError?.(errorMsg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      this.isListening = false;
      const msg = "Could not start microphone: " + (err instanceof Error ? err.message : String(err));
      callbacks.onErrorDetailed?.({
        code: "unknown",
        message: msg,
        suggestion: "Please refresh the page and try again.",
      });
      callbacks.onError?.(msg);
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore if already stopped
      }
      this.isListening = false;
    }
  }

  public speak(
    text: string,
    options?: { lang?: string; rate?: number; pitch?: number; onEnd?: () => void }
  ) {
    if (this.isMuted || !this.isSpeechSynthesisSupported()) {
      options?.onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      const settings = getLanguageSettings();
      utterance.rate = options?.rate ?? settings.speechSpeed ?? this.defaultRate;
      utterance.pitch = options?.pitch ?? 1.0;

      const targetLang = options?.lang || settings.voiceOutputLanguage || "te-IN";
      utterance.lang = targetLang;

      const voices = window.speechSynthesis.getVoices();
      const targetPrefix = targetLang.split("-")[0].toLowerCase();
      // Match exact code e.g. "te-IN" or "te_IN"
      const exactVoice = voices.find(
        (v) => v.lang.replace("_", "-").toLowerCase() === targetLang.toLowerCase()
      );
      // Match prefix e.g. "te"
      const prefixVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith(targetPrefix)
      );
      // Indian English fallback
      const inVoice = voices.find(
        (v) => v.lang.includes("en-IN") || v.lang.includes("en_IN")
      );
      // Generic English fallback
      const enVoice = voices.find((v) => v.lang.startsWith("en"));

      const chosenVoice = exactVoice || prefixVoice || inVoice || enVoice || (voices.length > 0 ? voices[0] : null);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      if (options?.onEnd) {
        utterance.onend = () => options.onEnd?.();
        utterance.onerror = () => options.onEnd?.();
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("[FinSight Speech] Synthesis failed:", e);
      options?.onEnd?.();
    }
  }

  public stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechEngine = new SpeechEngine();
