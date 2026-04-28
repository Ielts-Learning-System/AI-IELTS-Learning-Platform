import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  /** BCP-47 language tag used to select the preferred voice. @default 'en-GB' */
  lang?: string;
  /** Speech rate. @default 0.95 */
  rate?: number;
  /** Speech pitch. @default 1 */
  pitch?: number;
}

interface UseTextToSpeech {
  /** Speak the given text. Cancels any in-progress speech first. */
  speak: (text: string) => void;
  /** Cancel any in-progress speech immediately. */
  cancel: () => void;
  /** True while the browser is actively reading text aloud. */
  isPlaying: boolean;
}

/**
 * Encapsulates window.speechSynthesis so UI components stay free of TTS logic.
 *
 * Handles:
 *  - Graceful no-op when the Web Speech API is unavailable.
 *  - Deferred voice selection: waits for `voiceschanged` if the list is empty.
 *  - Automatic cleanup on component unmount.
 *  - `isPlaying` state driven by utterance lifecycle events.
 */
export function useTextToSpeech({
  lang = 'en-GB',
  rate = 0.95,
  pitch = 1,
}: Options = {}): UseTextToSpeech {
  const [isPlaying, setIsPlaying] = useState(false);
  // Keep a stable ref to the active utterance so we can cancel it reliably.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  /** Picks the best matching voice for the requested language. */
  const resolveVoice = (utterance: SpeechSynthesisUtterance) => {
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(lang));
    if (match) utterance.voice = match;
  };

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel any in-progress speech before starting new.
      window.speechSynthesis.cancel();

      /** Build utterance, assign best voice, and call speak(). */
      const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        resolveVoice(utterance); // voices are guaranteed loaded here
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      // Voices may be empty on the very first call in some browsers.
      // Defer the entire speak operation until the list is populated so
      // the utterance is built and spoken with the correct voice assigned.
      if (window.speechSynthesis.getVoices().length > 0) {
        doSpeak();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSupported, lang, rate, pitch],
  );

  // Cancel on unmount to prevent speech continuing after the component is gone.
  useEffect(() => () => { if (isSupported) window.speechSynthesis.cancel(); }, [isSupported]);

  return { speak, cancel, isPlaying };
}
