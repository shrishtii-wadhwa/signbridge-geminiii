import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
  Hand,
  RotateCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

interface GestureMapping {
  name: string;
  possibleMeaning: string;
  emoji: string;
}

const SUPPORTED_GESTURE_MAP: Record<string, GestureMapping> = {
  Open_Palm: {
    name: 'Open palm detected',
    possibleMeaning: 'Possible meaning: stop or attention',
    emoji: '✋',
  },
  Closed_Fist: {
    name: 'Closed fist detected',
    possibleMeaning: 'Possible meaning: attention',
    emoji: '✊',
  },
  Thumb_Up: {
    name: 'Thumbs up detected',
    possibleMeaning: 'Possible meaning: yes or okay',
    emoji: '👍',
  },
  Thumb_Down: {
    name: 'Thumbs down detected',
    possibleMeaning: 'Possible meaning: no or not okay',
    emoji: '👎',
  },
  Victory: {
    name: 'Victory sign detected',
    possibleMeaning: 'Possible meaning: positive or success',
    emoji: '✌️',
  },
};

const SUPPORTED_LIST = [
  { key: 'Open_Palm', label: 'Open palm', emoji: '✋', meaning: 'stop or attention' },
  { key: 'Closed_Fist', label: 'Closed fist', emoji: '✊', meaning: 'attention' },
  { key: 'Thumb_Up', label: 'Thumbs up', emoji: '👍', meaning: 'yes or okay' },
  { key: 'Thumb_Down', label: 'Thumbs down', emoji: '👎', meaning: 'no or not okay' },
  { key: 'Victory', label: 'Victory sign', emoji: '✌️', meaning: 'positive or success' },
];

export const GestureRecognizerComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const timerRef = useRef<number | null>(null);
  const isCleaningUpRef = useRef<boolean>(false);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  // Current detection state
  const [detectedGestureName, setDetectedGestureName] = useState<string>(
    'Show a hand gesture to the camera'
  );
  const [detectedMeaning, setDetectedMeaning] = useState<string>(
    'Hold your hand steadily in front of the camera'
  );
  const [detectedConfidence, setDetectedConfidence] = useState<number | null>(null);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string>('None');
  const [activeDemoPreset, setActiveDemoPreset] = useState<string | null>(null);

  // Stop camera helper with complete track stopping
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
          console.warn('Error stopping video track:', err);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  }, []);

  // Cleanup on unmount or page change
  useEffect(() => {
    return () => {
      isCleaningUpRef.current = true;
      stopCamera();
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
      setModelReady(true);
      return recognizer;
    } catch (gpuErr) {
      console.warn('GPU delegate failed or unavailable, trying CPU fallback:', gpuErr);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

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
        setModelReady(true);
        return recognizer;
      } catch (cpuErr: any) {
        throw new Error(
          'Failed to load browser gesture model: ' + (cpuErr?.message || 'Network error.')
        );
      }
    } finally {
      setIsModelLoading(false);
    }
  };

  // Process video frame at conservative rate (~8 fps, ~125ms interval)
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

        if (SUPPORTED_GESTURE_MAP[categoryKey] && scorePct >= 50) {
          const mapping = SUPPORTED_GESTURE_MAP[categoryKey];
          setDetectedGestureName(mapping.name);
          setDetectedMeaning(mapping.possibleMeaning);
          setDetectedConfidence(scorePct);
          setActiveCategoryKey(categoryKey);
        } else {
          setDetectedGestureName('No supported gesture detected');
          setDetectedMeaning('Hold an open palm, fist, thumbs up/down, or victory sign');
          setDetectedConfidence(scorePct > 20 ? scorePct : null);
          setActiveCategoryKey('None');
        }
      } else {
        setDetectedGestureName('No supported gesture detected');
        setDetectedMeaning('Show a hand gesture clearly within the camera box');
        setDetectedConfidence(null);
        setActiveCategoryKey('None');
      }
    } catch (frameErr) {
      // frame timing or busy recognizer
      console.debug('Recognition frame skipped:', frameErr);
    }
  }, []);

  // Start Camera handler
  const handleStartCamera = async () => {
    setCameraError(null);
    setActiveDemoPreset(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API is not supported in this browser environment. You can test gestures below using the interactive demo.'
      );
      return;
    }

    try {
      // 1. Ensure gesture model is initialized
      await ensureModelLoaded();

      // 2. Request user media only after button press
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

      // 3. Start conservative frame polling: ~8 fps (every 125ms)
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      timerRef.current = window.setInterval(() => {
        processFrame();
      }, 125);
    } catch (err: any) {
      console.error('Camera access failed:', err);
      stopCamera();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera access was denied. Please allow camera permissions in your browser or address bar to test gesture recognition, or use the interactive presets below.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError(
          'No camera device found on this system. You can test gestures using the interactive presets below.'
        );
      } else {
        setCameraError(
          `Unable to access camera: ${err.message || 'Check camera permissions or connection.'}`
        );
      }
    }
  };

  // Fallback demo preset test
  const handleSelectDemoPreset = (key: string) => {
    setActiveDemoPreset(key);
    const mapping = SUPPORTED_GESTURE_MAP[key];
    if (mapping) {
      setDetectedGestureName(mapping.name);
      setDetectedMeaning(mapping.possibleMeaning);
      setDetectedConfidence(92);
      setActiveCategoryKey(key);
    } else {
      setDetectedGestureName('No supported gesture detected');
      setDetectedMeaning('Show a hand gesture to the camera');
      setDetectedConfidence(null);
      setActiveCategoryKey('None');
    }
  };

  return (
    <section
      aria-labelledby="gesture-mode-heading"
      className="w-full space-y-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl text-left"
    >
      {/* Header & Experimental Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Hand className="w-4 h-4" />
          </div>
          <div>
            <h3 id="gesture-mode-heading" className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Basic Gesture Mode</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
                Experimental
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Client-side on-device recognition demo powered by MediaPipe
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Prominent Disclaimer */}
      <div
        id="gesture-disclaimer-box"
        className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm"
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-100">
            Recognizes a few common hand gestures only. This is not a full sign-language translator.
          </p>
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            Outputs indicate general conversational cues only and do not assert personal intent or translate formal sign languages.
          </p>
        </div>
      </div>

      {/* Camera Preview and Controls */}
      <div className="space-y-3">
        <div className="relative w-full aspect-video sm:max-h-[340px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
          {/* Video Stream Element */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isCameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            } ${isMirrored ? 'scale-x-[-1]' : ''}`}
          />

          {/* Inactive or Loading State */}
          {!isCameraActive && (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Camera className="w-7 h-7 text-indigo-400/80" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">Camera is currently stopped</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Press "Start Camera" to enable browser hand gesture detection, or select any sample gesture below.
                </p>
              </div>
            </div>
          )}

          {/* Top Camera Controls Overlay */}
          {isCameraActive && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
              <button
                type="button"
                onClick={() => setIsMirrored(!isMirrored)}
                className="px-2 py-1 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700/60 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                title="Toggle mirror orientation"
              >
                <RotateCw className="w-3 h-3" />
                <span>{isMirrored ? 'Mirrored (Selfie)' : 'Standard'}</span>
              </button>
            </div>
          )}

          {/* Active Live Indicator Badge */}
          {isCameraActive && (
            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur border border-emerald-500/30 flex items-center gap-1.5 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono text-emerald-300 font-semibold">
                Live (~8 fps)
              </span>
            </div>
          )}
        </div>

        {/* Start / Stop Camera Action Buttons */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          {!isCameraActive ? (
            <button
              type="button"
              id="btn-start-gesture-camera"
              onClick={handleStartCamera}
              disabled={isModelLoading}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>{isModelLoading ? 'Initializing MediaPipe…' : 'Start Camera'}</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-stop-gesture-camera"
              onClick={stopCamera}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}
        </div>

        {/* Camera Permission or Initialization Error Box */}
        {cameraError && (
          <div
            id="gesture-camera-error"
            className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-rose-200">Camera Access Notice</p>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">{cameraError}</p>
            </div>
            <button
              type="button"
              onClick={() => setCameraError(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Large Current Result Card */}
      <div
        id="gesture-current-result-card"
        className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border-2 border-indigo-500/50 shadow-lg relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-indigo-300 mb-2">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="uppercase tracking-wider">Current Detection</span>
          </span>
          {detectedConfidence !== null && (
            <span
              id="gesture-confidence-label"
              className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200"
            >
              Confidence: <strong>{detectedConfidence}%</strong>
            </span>
          )}
        </div>

        <div className="space-y-1.5 pt-1">
          <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            {SUPPORTED_GESTURE_MAP[activeCategoryKey] ? (
              <span className="text-2xl sm:text-3xl">
                {SUPPORTED_GESTURE_MAP[activeCategoryKey].emoji}
              </span>
            ) : (
              <Hand className="w-6 h-6 text-indigo-400" />
            )}
            <span>{detectedGestureName}</span>
          </h4>
          <p className="text-sm font-medium text-indigo-200/90">
            {detectedMeaning}
          </p>
        </div>
      </div>

      {/* Short Supported Gestures List & Fallback Demo Picker */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Supported Gestures (5 Common Cues):</span>
          </span>
          <span className="text-[10px] text-slate-500">Tap to test preset demo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SUPPORTED_LIST.map((item) => {
            const isSelected = activeCategoryKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectDemoPreset(item.key)}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-400/30 text-white'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100'
                }`}
              >
                <span className="text-xl shrink-0">{item.emoji}</span>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-bold flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    Possible meaning: {item.meaning}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy Guarantee Line */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Camera frames are processed locally in your browser and are not saved.</span>
      </div>
    </section>
  );
};
