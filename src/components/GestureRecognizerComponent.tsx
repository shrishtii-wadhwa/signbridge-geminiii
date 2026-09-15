import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Trash2,
  RotateCw,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Hand,
  AlertCircle,
  Check,
  Languages,
  Loader2,
} from 'lucide-react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { IslAssistResult } from '../types';

export interface VerifiedSignDefinition {
  key: string;
  label: string;
  emoji: string;
  islContextMeaning: string;
  defaultSpokenPhrase: {
    English: string;
    Hindi: string;
    Hinglish: string;
  };
}

export const VERIFIED_ISL_VOCABULARY: VerifiedSignDefinition[] = [
  {
    key: 'Open_Palm',
    label: 'Open Palm (Open_Palm)',
    emoji: '✋',
    islContextMeaning: 'Stop, wait a moment, or polite greeting / hello',
    defaultSpokenPhrase: {
      English: 'Please stop or wait a moment.',
      Hindi: 'कृपया रुकें या एक मिनट प्रतीक्षा करें।',
      Hinglish: 'Please rukiye ya ek minute wait kijiye.',
    },
  },
  {
    key: 'Closed_Fist',
    label: 'Closed Fist (Closed_Fist)',
    emoji: '✊',
    islContextMeaning: 'Attention, firm agreement, or hold ready',
    defaultSpokenPhrase: {
      English: 'Attention, I am ready.',
      Hindi: 'कृपया ध्यान दें, मैं तैयार हूँ।',
      Hinglish: 'Attention please, main ready hoon.',
    },
  },
  {
    key: 'Thumb_Up',
    label: 'Thumbs Up (Thumb_Up)',
    emoji: '👍',
    islContextMeaning: 'Yes, agree, okay, or positive acknowledgement',
    defaultSpokenPhrase: {
      English: 'Yes, I agree and understand.',
      Hindi: 'हाँ, मैं सहमत हूँ और समझ गया।',
      Hinglish: 'Haan, main agree karta hoon aur samajh gaya.',
    },
  },
  {
    key: 'Thumb_Down',
    label: 'Thumbs Down (Thumb_Down)',
    emoji: '👎',
    islContextMeaning: 'No, disagree, not okay, or assistance needed',
    defaultSpokenPhrase: {
      English: 'No, I disagree or need assistance.',
      Hindi: 'नहीं, मैं असहमत हूँ या मुझे सहायता चाहिए।',
      Hinglish: 'Nahi, main disagree karta hoon ya mujhe help chahiye.',
    },
  },
  {
    key: 'Victory',
    label: 'Victory / V-Sign (Victory)',
    emoji: '✌️',
    islContextMeaning: 'Peace, victory, two, or affirmative confirmation',
    defaultSpokenPhrase: {
      English: 'Peace, success, everything is good.',
      Hindi: 'शांति, सफलता, सब ठीक है।',
      Hinglish: 'Peace and victory, sab theek hai.',
    },
  },
  {
    key: 'Pointing_Up',
    label: 'Pointing Up (Pointing_Up)',
    emoji: '☝️',
    islContextMeaning: 'One, look up, excuse me, or wait one moment',
    defaultSpokenPhrase: {
      English: 'Excuse me, wait one moment.',
      Hindi: 'माफ़ कीजिए, एक पल प्रतीक्षा कीजिए।',
      Hinglish: 'Excuse me, bas ek minute rukiye.',
    },
  },
  {
    key: 'ILoveYou',
    label: 'I Love You Sign (ILoveYou)',
    emoji: '🤟',
    islContextMeaning: 'Warm regard, gratitude, or friendly appreciation',
    defaultSpokenPhrase: {
      English: 'With warm regards and gratitude.',
      Hindi: 'हार्दिक शुभकामनाओं और बहुत-बहुत धन्यवाद।',
      Hinglish: 'Warm regards aur bahut bahut shukriya.',
    },
  },
];

const SIGN_MAP = new Map(VERIFIED_ISL_VOCABULARY.map((item) => [item.key, item]));

// Thresholds for reliable recognition
const CONFIDENCE_THRESHOLD_PCT = 60; // Ignore low confidence below 60%
const CONSECUTIVE_STABLE_THRESHOLD = 3; // Require same label in 3 consecutive predictions

export const GestureRecognizerComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const timerRef = useRef<number | null>(null);
  const isCleaningUpRef = useRef<boolean>(false);

  // Consecutive prediction smoothing tracking
  const consecutiveTrackerRef = useRef<{ label: string; count: number; score: number }>({
    label: '',
    count: 0,
    score: 0,
  });

  // UI state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [isSupportedSignsOpen, setIsSupportedSignsOpen] = useState<boolean>(false);

  // Output Language selector: English, Hindi, Hinglish
  const [outputLanguage, setOutputLanguage] = useState<'Hinglish' | 'Hindi' | 'English'>('Hinglish');

  // Recognition outputs
  const [stableSignKey, setStableSignKey] = useState<string | null>(null);
  const [stableConfidence, setStableConfidence] = useState<number | null>(null);
  const [consecutiveCount, setConsecutiveCount] = useState<number>(0);

  // Sentence & Gemini assist state
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [lastConfirmedAssist, setLastConfirmedAssist] = useState<IslAssistResult | null>(null);
  const [isConfirmingWithGemini, setIsConfirmingWithGemini] = useState<boolean>(false);
  const [assistError, setAssistError] = useState<string | null>(null);

  // Speech synthesis state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean, complete camera stop
  const stopCamera = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.warn('Error stopping camera track:', err);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    consecutiveTrackerRef.current = { label: '', count: 0, score: 0 };
    setIsCameraActive(false);
    setIsPaused(false);
  }, []);

  // Cleanup on unmount or tab switch
  useEffect(() => {
    return () => {
      isCleaningUpRef.current = true;
      stopCamera();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognizerRef.current) {
        try {
          recognizerRef.current.close();
        } catch {
          // ignore
        }
        recognizerRef.current = null;
      }
    };
  }, [stopCamera]);

  // Handle visibilitychange to ensure camera turns off if user switches tab/window
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isCameraActive) {
        stopCamera();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCameraActive, stopCamera]);

  // Load MediaPipe Gesture Recognizer client-side
  const ensureModelLoaded = async (): Promise<GestureRecognizer> => {
    if (recognizerRef.current) {
      return recognizerRef.current;
    }

    setIsModelLoading(true);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      // Attempt GPU delegate first, fallback to CPU
      try {
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        recognizerRef.current = recognizer;
        return recognizer;
      } catch (gpuErr) {
        console.info('GPU delegate unavailable, using CPU delegate:', (gpuErr as any)?.message || gpuErr);
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        recognizerRef.current = recognizer;
        return recognizer;
      }
    } catch (loadErr: any) {
      throw new Error(
        'Failed to load client-side gesture recognition model: ' + (loadErr?.message || 'Check network connection.')
      );
    } finally {
      setIsModelLoading(false);
    }
  };

  // Process live camera frame with 3-consecutive prediction smoothing & threshold
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const recognizer = recognizerRef.current;

    if (!video || !recognizer || video.readyState < 2 || isCleaningUpRef.current) {
      return;
    }

    try {
      const now = performance.now();
      const results = recognizer.recognizeForVideo(video, now);

      if (
        results &&
        results.gestures &&
        results.gestures.length > 0 &&
        results.gestures[0].length > 0
      ) {
        const top = results.gestures[0][0];
        const categoryKey = top.categoryName;
        const scorePct = Math.round((top.score || 0) * 100);

        // Check if label is in exact verified vocabulary AND meets confidence threshold (>= 60%)
        if (SIGN_MAP.has(categoryKey) && scorePct >= CONFIDENCE_THRESHOLD_PCT) {
          const tracker = consecutiveTrackerRef.current;
          if (tracker.label === categoryKey) {
            tracker.count += 1;
            tracker.score = scorePct;
          } else {
            tracker.label = categoryKey;
            tracker.count = 1;
            tracker.score = scorePct;
          }

          setConsecutiveCount(Math.min(tracker.count, CONSECUTIVE_STABLE_THRESHOLD));

          // Require the same label in 3 consecutive predictions before showing as final
          if (tracker.count >= CONSECUTIVE_STABLE_THRESHOLD) {
            setStableSignKey(categoryKey);
            setStableConfidence(scorePct);
          }
        } else {
          // Non-matching, low confidence, or 'None' -> reset consecutive count
          consecutiveTrackerRef.current = { label: '', count: 0, score: 0 };
          setConsecutiveCount(0);
          // If no supported sign or uncertain
          if (scorePct < CONFIDENCE_THRESHOLD_PCT || !SIGN_MAP.has(categoryKey)) {
            setStableSignKey(null);
            setStableConfidence(null);
          }
        }
      } else {
        // No hands or gestures found
        consecutiveTrackerRef.current = { label: '', count: 0, score: 0 };
        setConsecutiveCount(0);
        setStableSignKey(null);
        setStableConfidence(null);
      }
    } catch {
      // Frame skipped due to busy loop
    }
  }, []);

  // Start Camera
  const handleStartCamera = async () => {
    setCameraError(null);
    setAssistError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API is not supported in this browser. Please use an updated modern browser.'
      );
      return;
    }

    try {
      await ensureModelLoaded();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setIsPaused(false);

      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      // Safe inference rate (~8 fps = 125ms interval)
      timerRef.current = window.setInterval(() => {
        processFrame();
      }, 125);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      stopCamera();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera access was denied. Please allow camera permissions in your browser or site settings.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device was detected on this computer/phone.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to access camera.'}`);
      }
    }
  };

  // Pause and Confirm Button
  const handlePauseAndConfirm = async (overrideSignKey?: string) => {
    const keyToConfirm = overrideSignKey || stableSignKey;

    if (!keyToConfirm || !SIGN_MAP.has(keyToConfirm)) {
      setAssistError(
        'No supported sign is currently stabilized. Hold a supported sign steadily until detected (3 consecutive predictions).'
      );
      return;
    }

    // Pause the video/stream processing
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (videoRef.current && !videoRef.current.paused) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
    }
    setIsPaused(true);
    setIsConfirmingWithGemini(true);
    setAssistError(null);

    try {
      // Send ONLY recognizedLabel, outputLanguage, and context: "communication_assist" to secure server-side route
      const res = await fetch('/api/isl-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recognizedLabel: keyToConfirm,
          outputLanguage,
          context: 'communication_assist',
          currentSentence: currentSentence.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Server assist failed');
      }

      const assistData: IslAssistResult = json.data;
      setLastConfirmedAssist(assistData);

      // Append to Current sentence
      const phrase = assistData.message;
      setCurrentSentence((prev) => {
        const trimmed = prev.trim();
        if (!trimmed) return phrase;
        return `${trimmed} ${phrase}`;
      });
    } catch (err: any) {
      console.error('Gemini ISL assist failed, falling back to verified dictionary:', err);
      // Fallback to local verified dictionary so user is never blocked
      const signDef = SIGN_MAP.get(keyToConfirm);
      if (signDef) {
        const fallbackText = signDef.defaultSpokenPhrase[outputLanguage];
        const fallbackAssist: IslAssistResult = {
          recognized_label: keyToConfirm,
          message: fallbackText,
          speakable_text: fallbackText,
          needs_confirmation: true,
        };
        setLastConfirmedAssist(fallbackAssist);
        setCurrentSentence((prev) => {
          const trimmed = prev.trim();
          if (!trimmed) return fallbackText;
          return `${trimmed} ${fallbackText}`;
        });
      } else {
        setAssistError('Could not process this sign. Please try again.');
      }
    } finally {
      setIsConfirmingWithGemini(false);
    }
  };

  // Resume camera after pause
  const handleResumeCamera = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    setIsPaused(false);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      processFrame();
    }, 125);
  };

  // Speak Message via browser SpeechSynthesis
  const handleSpeakMessage = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAssistError('Speech synthesis is not supported on this device/browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Text to speak: prioritizes latest confirmed speakable_text, or the accumulated sentence
    const textToSpeak =
      lastConfirmedAssist?.speakable_text || currentSentence.trim();

    if (!textToSpeak) {
      setAssistError('There is no confirmed message to speak yet. Detect and confirm a sign first.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    speechUtteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    if (outputLanguage === 'Hindi') {
      const hiVoice = voices.find(
        (v) => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
      );
      if (hiVoice) utterance.voice = hiVoice;
      utterance.lang = 'hi-IN';
    } else if (outputLanguage === 'Hinglish') {
      const inVoice = voices.find(
        (v) => v.lang === 'en-IN' || v.name.toLowerCase().includes('india')
      );
      if (inVoice) utterance.voice = inVoice;
      utterance.lang = 'en-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Clear current sentence and reset state
  const handleClear = () => {
    setCurrentSentence('');
    setLastConfirmedAssist(null);
    setAssistError(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Manual preset test helper
  const handleTestSignPreset = (key: string) => {
    setStableSignKey(key);
    setStableConfidence(95);
    setConsecutiveCount(3);
    setAssistError(null);
  };

  const detectedSignDefinition = stableSignKey ? SIGN_MAP.get(stableSignKey) : null;

  return (
    <section
      aria-labelledby="isl-translator-heading"
      className="w-full space-y-5 rounded-2xl bg-slate-900/95 border border-slate-800 p-4 sm:p-6 shadow-xl text-left"
    >
      {/* Header & Beta Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="isl-translator-heading"
              className="text-base sm:text-lg font-bold text-white flex items-center gap-2"
            >
              <span>ISL Camera Translator</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider">
                Beta
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Experimental on-device gesture assistant with Gemini communication synthesis
            </p>
          </div>
        </div>

        {/* Output Language Selector: English, Hindi, Hinglish */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <Languages className="w-3.5 h-3.5 text-slate-400 ml-1.5 shrink-0" />
          <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">Output:</span>
          {(['Hinglish', 'Hindi', 'English'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              id={`btn-isl-lang-${lang.toLowerCase()}`}
              onClick={() => setOutputLanguage(lang)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                outputLanguage === lang
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Mandatory Visible Disclosure */}
      <div
        id="isl-disclosure-box"
        className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm"
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-amber-100">
            Recognizes only a limited tested vocabulary. Confirm important messages.
          </p>
          <p className="text-[11px] text-amber-300/85 leading-relaxed">
            This experimental feature does not translate full Indian Sign Language syntax, regional signs, or complex sentences. Never use for emergency or medical decisions without direct verification.
          </p>
        </div>
      </div>

      {/* Camera Preview Area */}
      <div className="space-y-3">
        <div className="relative w-full aspect-video sm:max-h-[340px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isCameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            } ${isMirrored ? 'scale-x-[-1]' : ''}`}
          />

          {/* Inactive State */}
          {!isCameraActive && (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <Camera className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">Camera is stopped</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click <strong>Start Camera</strong> below to enable on-device recognition, or test with the supported sign presets below.
                </p>
              </div>
            </div>
          )}

          {/* Active Overlay: Mirror Toggle */}
          {isCameraActive && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
              <button
                type="button"
                id="btn-toggle-mirror"
                onClick={() => setIsMirrored(!isMirrored)}
                className="px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700/60 text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow"
                title="Toggle mirror orientation"
              >
                <RotateCw className="w-3 h-3" />
                <span>{isMirrored ? 'Mirrored (Selfie)' : 'Standard'}</span>
              </button>
            </div>
          )}

          {/* Active Overlay: Live/Paused Status & Smoothing indicator */}
          {isCameraActive && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 z-10">
              <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700/70 flex items-center gap-1.5 shadow">
                {isPaused ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[10px] font-mono text-amber-300 font-semibold uppercase">
                      Paused
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-mono text-emerald-300 font-semibold uppercase">
                      Live (~8 fps)
                    </span>
                  </>
                )}
              </div>

              {/* Smoothing Status */}
              {!isPaused && (
                <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700/70 text-[10px] font-mono text-slate-300">
                  Smoothing: {consecutiveCount}/{CONSECUTIVE_STABLE_THRESHOLD} frames
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera Error Box */}
        {cameraError && (
          <div
            id="isl-camera-error"
            className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 shadow-md"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-rose-200">Camera Notice</p>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">{cameraError}</p>
            </div>
            <button
              type="button"
              onClick={() => setCameraError(null)}
              className="text-rose-400 hover:text-rose-200 p-1"
            >
              &times;
            </button>
          </div>
        )}

        {/* Action Buttons: Start Camera, Stop Camera, Pause and Confirm, Speak Message, Clear */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {/* Button 1: Start Camera */}
          {!isCameraActive ? (
            <button
              type="button"
              id="btn-start-camera"
              onClick={handleStartCamera}
              disabled={isModelLoading}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950 transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>{isModelLoading ? 'Loading Model…' : 'Start Camera'}</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-stop-camera"
              onClick={stopCamera}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}

          {/* Button 2: Pause and Confirm */}
          <button
            type="button"
            id="btn-pause-confirm"
            onClick={() => {
              if (isPaused) {
                handleResumeCamera();
              } else {
                handlePauseAndConfirm();
              }
            }}
            disabled={(!stableSignKey && !isPaused) || isConfirmingWithGemini}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-md ${
              isPaused
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : stableSignKey && !isConfirmingWithGemini
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {isConfirmingWithGemini ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Confirming…</span>
              </>
            ) : isPaused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Live</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause & Confirm</span>
              </>
            )}
          </button>

          {/* Button 3: Speak Message */}
          <button
            type="button"
            id="btn-speak-message"
            onClick={handleSpeakMessage}
            disabled={!lastConfirmedAssist && !currentSentence.trim()}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-md ${
              isSpeaking
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : lastConfirmedAssist || currentSentence.trim()
                ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop Speaking</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Speak Message</span>
              </>
            )}
          </button>

          {/* Button 4: Clear */}
          <button
            type="button"
            id="btn-clear-sentence"
            onClick={handleClear}
            disabled={!currentSentence.trim() && !lastConfirmedAssist}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              currentSentence.trim() || lastConfirmedAssist
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Assist Error Notification */}
        {assistError && (
          <div
            id="isl-assist-error"
            className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-200 text-xs flex items-center justify-between"
          >
            <span>{assistError}</span>
            <button
              type="button"
              onClick={() => setAssistError(null)}
              className="text-amber-400 hover:text-amber-100 ml-2"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Detection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Card 1: Detected Sign & Confidence */}
        <div
          id="isl-detected-sign-card"
          className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border-2 border-indigo-500/50 shadow-lg space-y-2"
        >
          <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Detected Sign</span>
            </span>
            <span
              id="isl-confidence-badge"
              className={`font-mono text-[11px] px-2.5 py-0.5 rounded-full border ${
                stableConfidence !== null && stableConfidence >= CONFIDENCE_THRESHOLD_PCT
                  ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {stableConfidence !== null
                ? `Confidence: ${stableConfidence}%`
                : 'Confidence: —'}
            </span>
          </div>

          <div className="pt-1">
            {detectedSignDefinition ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl">{detectedSignDefinition.emoji}</span>
                  <div>
                    <h4 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      {detectedSignDefinition.label}
                    </h4>
                    <p className="text-xs font-medium text-indigo-200">
                      Meaning: {detectedSignDefinition.islContextMeaning}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-slate-400 text-sm flex items-center gap-2">
                <Hand className="w-5 h-5 text-slate-500 shrink-0" />
                <span id="label-no-sign" className="italic">
                  No supported sign detected
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Current Sentence (Accumulated Message) */}
        <div
          id="isl-current-sentence-card"
          className="p-4 rounded-2xl bg-slate-950 border-2 border-slate-800 shadow-lg space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="uppercase tracking-wider text-slate-300">Current Sentence</span>
            <span className="text-[11px] text-slate-500">Language: {outputLanguage}</span>
          </div>

          <div className="flex-1 py-1">
            {currentSentence.trim() ? (
              <p
                id="isl-sentence-text"
                className="text-base sm:text-lg font-bold text-white leading-relaxed break-words"
              >
                "{currentSentence}"
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                Your sentence will appear here as you confirm recognized signs.
              </p>
            )}
          </div>

          {lastConfirmedAssist && (
            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Last confirmed: {lastConfirmedAssist.recognized_label}</span>
              </span>
              <span className="text-slate-400 text-[10px]">Ready to speak</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Section: Supported Signs */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          id="btn-toggle-supported-signs"
          onClick={() => setIsSupportedSignsOpen(!isSupportedSignsOpen)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-900/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Hand className="w-4 h-4 text-amber-400" />
            <span>Supported signs ({VERIFIED_ISL_VOCABULARY.length} verified model gestures)</span>
          </span>
          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <span>{isSupportedSignsOpen ? 'Hide' : 'Show list & test presets'}</span>
            {isSupportedSignsOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {isSupportedSignsOpen && (
          <div className="p-3.5 border-t border-slate-800 space-y-3 bg-slate-950">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              These are the exact verified gestures recognized by the client-side MediaPipe gesture model. Tap any sign below to test its recognition and assist generation without requiring a camera:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {VERIFIED_ISL_VOCABULARY.map((item) => {
                const isSelected = stableSignKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      handleTestSignPreset(item.key);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-400/40 text-white'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{item.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        {item.islContextMeaning}
                      </p>
                      <span className="inline-block mt-1 text-[9px] font-mono text-indigo-300/90">
                        Default: "{item.defaultSpokenPhrase[outputLanguage]}"
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Privacy Text */}
      <div
        id="isl-privacy-text"
        className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Camera frames are processed only for live recognition and are not stored.</span>
      </div>
    </section>
  );
};
