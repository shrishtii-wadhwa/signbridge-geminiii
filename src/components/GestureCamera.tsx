"use client";

import React, { useRef, useState, useEffect } from "react";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import {
  Camera,
  CameraOff,
  Activity,
  Hand,
  Sparkles,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Terminal,
} from "lucide-react";

// Exact friendly label mapping required
const LABEL_MAP: Record<string, string> = {
  Closed_Fist: "Closed fist",
  Open_Palm: "Open palm",
  Pointing_Up: "Pointing up",
  Thumb_Up: "Thumbs up",
  Thumb_Down: "Thumbs down",
  Victory: "Victory sign",
  ILoveYou: "I love you",
  None: "No supported gesture detected",
};

const EMOJI_MAP: Record<string, string> = {
  Closed_Fist: "✊",
  Open_Palm: "✋",
  Pointing_Up: "☝️",
  Thumb_Up: "👍",
  Thumb_Down: "👎",
  Victory: "✌️",
  ILoveYou: "🤟",
  None: "✋",
};

const getReadyStateName = (state: number): string => {
  switch (state) {
    case 0:
      return "0 (HAVE_NOTHING)";
    case 1:
      return "1 (HAVE_METADATA)";
    case 2:
      return "2 (HAVE_CURRENT_DATA)";
    case 3:
      return "3 (HAVE_FUTURE_DATA)";
    case 4:
      return "4 (HAVE_ENOUGH_DATA)";
    default:
      return `${state} (UNKNOWN)`;
  }
};

export const GestureCamera: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const isStartingRef = useRef<boolean>(false);
  const isCleaningUpRef = useRef<boolean>(false);

  // Core camera & detection state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<string>("idle");
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [videoReadyState, setVideoReadyState] = useState<string>("0 (HAVE_NOTHING)");
  const [handCount, setHandCount] = useState<number>(0);
  const [rawLabel, setRawLabel] = useState<string>("None");
  const [confidence, setConfidence] = useState<number>(0);
  const [latestError, setLatestError] = useState<string>("None");
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  // Cleanup on unmount or stop
  const stopCamera = () => {
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Track stop error:", e);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    isStartingRef.current = false;
    setIsCameraActive(false);
    setCameraStatus("idle");
    setVideoReadyState("0 (HAVE_NOTHING)");
    setHandCount(0);
    setRawLabel("None");
    setConfidence(0);
    setLatestError("None");
  };

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
  }, []);

  // Frame loop throttled to at most once per 125ms
  const runDetectionLoop = () => {
    if (isCleaningUpRef.current) return;

    const video = videoRef.current;
    const recognizer = recognizerRef.current;

    if (video && recognizer) {
      // Do not start inference until video.readyState >= 2
      if (video.readyState < 2) {
        setVideoReadyState(getReadyStateName(video.readyState));
        animationFrameIdRef.current = requestAnimationFrame(runDetectionLoop);
        return;
      }

      setVideoReadyState(getReadyStateName(video.readyState));

      const now = performance.now();
      if (now - lastInferenceTimeRef.current >= 125) {
        lastInferenceTimeRef.current = now;

        // Ensure strictly monotonically increasing timestamp for MediaPipe recognizeForVideo
        const videoTimestamp = now > lastTimestampRef.current ? now : lastTimestampRef.current + 1;
        lastTimestampRef.current = videoTimestamp;

        try {
          const result = recognizer.recognizeForVideo(video, videoTimestamp);

          // Read exactly:
          const detectedHands = result.landmarks?.length ?? 0;
          const topGesture = result.gestures?.[0]?.[0];
          const detectedRawLabel = topGesture?.categoryName ?? "None";
          const detectedConfidence = topGesture?.score ?? 0;

          setHandCount(detectedHands);

          if (detectedHands === 0) {
            setRawLabel("None");
            setConfidence(0);
          } else if (detectedRawLabel === "None" || detectedConfidence < 0.35) {
            setRawLabel("None");
            setConfidence(detectedConfidence);
          } else {
            // Valid gesture score >= 0.35, show raw label immediately
            setRawLabel(detectedRawLabel);
            setConfidence(detectedConfidence);
          }
        } catch (inferErr: any) {
          console.warn("recognizeForVideo error:", inferErr);
          setLatestError(inferErr?.message || "Inference error");
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(runDetectionLoop);
  };

  // Start Camera handler
  const handleStartCamera = async () => {
    // Prevent multiple camera loops
    if (isStartingRef.current || isCameraActive) return;
    isStartingRef.current = true;
    setLatestError("None");

    try {
      // Step 1 & 2: Loading model...
      setCameraStatus("Loading model...");
      if (!recognizerRef.current) {
        let vision;
        try {
          vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
          );
        } catch (wasmErr) {
          console.warn("Fallback to local WASM fileset:", wasmErr);
          vision = await FilesetResolver.forVisionTasks("/wasm");
        }

        let recognizer: GestureRecognizer;
        try {
          recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35,
            cannedGesturesClassifierOptions: {
              scoreThreshold: 0.35,
            },
          });
        } catch (createErr) {
          console.warn("Fallback to local model task asset:", createErr);
          recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "/models/gesture_recognizer.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35,
            cannedGesturesClassifierOptions: {
              scoreThreshold: 0.35,
            },
          });
        }

        recognizerRef.current = recognizer;
        setModelLoaded(true);
      }

      // Step 3 & 4: Requesting camera...
      setCameraStatus("Requesting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Step 5, 6, 7, 8: Setup video element
      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not found in DOM.");
      }

      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();

      // Step 9: Wait for readyState >= 2
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          const onReady = () => {
            if (video.readyState >= 2) {
              video.removeEventListener("loadeddata", onReady);
              video.removeEventListener("canplay", onReady);
              resolve();
            }
          };
          video.addEventListener("loadeddata", onReady);
          video.addEventListener("canplay", onReady);
          setTimeout(resolve, 800);
        });
      }

      setVideoReadyState(getReadyStateName(video.readyState));

      // Step 10 & 11: Set status "Detecting" and start loop
      setCameraStatus("Detecting");
      setIsCameraActive(true);

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(runDetectionLoop);
    } catch (err: any) {
      console.error("Camera startup failure:", err);
      stopCamera();
      const msg = err?.name === "NotAllowedError"
        ? "Camera permission denied by user or browser"
        : err?.message || "Failed to start camera";
      setLatestError(msg);
      setCameraStatus("idle");
    } finally {
      isStartingRef.current = false;
    }
  };

  // Friendly text resolution
  const friendlyLabel = LABEL_MAP[rawLabel] || rawLabel;
  const emoji = EMOJI_MAP[rawLabel] || "✋";

  // Guidance message
  let statusBannerText = "";
  if (handCount === 0) {
    statusBannerText = "No hand detected — show one hand clearly in the frame.";
  } else if (handCount > 0 && rawLabel === "None") {
    statusBannerText = "Hand detected, but no built-in gesture recognized.";
  } else {
    statusBannerText = `Gesture recognized: ${friendlyLabel} (${rawLabel})`;
  }

  return (
    <div className="w-full space-y-4 rounded-2xl bg-slate-900/95 border border-slate-800 p-4 sm:p-6 shadow-xl text-left">
      {/* Header & Disclaimer */}
      <div className="border-b border-slate-800 pb-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Hand className="w-5 h-5 text-indigo-400" />
            <span>Basic Gesture Recognition — Experimental</span>
          </h3>
          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            MediaPipe
          </span>
        </div>
        <p className="text-xs text-amber-300/90 flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>
            Recognizes a small set of common hand gestures only. This is not a full sign-language translator.
          </span>
        </p>
      </div>

      {/* Video Container */}
      <div className="relative w-full aspect-video sm:max-h-[340px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isCameraActive ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          } ${isMirrored ? "scale-x-[-1]" : ""}`}
        />

        {!isCameraActive && (
          <div className="p-6 text-center space-y-3 max-w-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <Camera className="w-7 h-7 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">Camera is stopped</p>
              <p className="text-xs text-slate-400">
                Click <strong>Start Camera</strong> below to enable on-device MediaPipe detection.
              </p>
            </div>
          </div>
        )}

        {isCameraActive && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <button
              type="button"
              id="btn-toggle-mirror"
              onClick={() => setIsMirrored(!isMirrored)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700 text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 shadow"
            >
              <RotateCw className="w-3 h-3" />
              <span>{isMirrored ? "Mirrored" : "Standard"}</span>
            </button>
          </div>
        )}

        {isCameraActive && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700 flex items-center gap-2 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono font-semibold uppercase text-emerald-300">
                {cameraStatus}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur border border-slate-700 text-[10px] font-mono text-slate-300 pointer-events-auto">
              Hands: {handCount}
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="flex gap-2">
        {!isCameraActive ? (
          <button
            type="button"
            id="btn-start-camera"
            onClick={handleStartCamera}
            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Camera className="w-4 h-4" />
            <span>Start Camera</span>
          </button>
        ) : (
          <button
            type="button"
            id="btn-stop-camera"
            onClick={stopCamera}
            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <CameraOff className="w-4 h-4" />
            <span>Stop Camera</span>
          </button>
        )}
      </div>

      {/* Large Display Card: Detected Label, Confidence, Hand Count, Camera Status, Latest Error */}
      <div
        id="gesture-large-display"
        className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 border-2 border-indigo-500/40 shadow-lg space-y-3"
      >
        <div className="flex items-center justify-between text-xs font-bold text-indigo-300 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Live Detection</span>
          </span>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-700/60 text-indigo-200">
            Confidence: {(confidence * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <span className="text-4xl sm:text-5xl">{emoji}</span>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {rawLabel !== "None" ? friendlyLabel : "No Gesture"}
              </h4>
              <span className="text-xs font-mono font-bold text-indigo-300 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700">
                rawLabel: {rawLabel}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {statusBannerText}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">handCount</span>
            <span className="text-white font-bold">{handCount}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">cameraStatus</span>
            <span className="text-indigo-300 font-bold">{cameraStatus}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">latestError</span>
            <span
              className={`truncate block font-bold ${
                latestError !== "None" ? "text-rose-400" : "text-slate-400"
              }`}
              title={latestError}
            >
              {latestError}
            </span>
          </div>
        </div>
      </div>

      {/* Diagnostics Panel (Always Visible) */}
      <div id="gesture-diagnostics-panel" className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 border-b border-slate-800/80 pb-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>MediaPipe Diagnostics (Always Visible)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Model loaded</span>
            <span
              id="diag-model-loaded"
              className={`font-bold ${modelLoaded ? "text-emerald-400" : "text-amber-400"}`}
            >
              {modelLoaded ? "true" : "false"}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Camera status</span>
            <span id="diag-camera-status" className="text-slate-200 font-bold">
              {cameraStatus}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Video readyState</span>
            <span id="diag-video-readystate" className="text-slate-200 font-bold">
              {videoReadyState}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Hand count</span>
            <span
              id="diag-hand-count"
              className={`font-bold ${handCount > 0 ? "text-emerald-400" : "text-slate-400"}`}
            >
              {handCount}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Raw label</span>
            <span id="diag-raw-label" className="text-indigo-300 font-bold">
              {rawLabel}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Confidence</span>
            <span id="diag-confidence" className="text-indigo-300 font-bold">
              {confidence.toFixed(3)} ({(confidence * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="col-span-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Latest error</span>
            <span
              id="diag-latest-error"
              className={`truncate block font-bold ${
                latestError !== "None" ? "text-rose-400" : "text-slate-500"
              }`}
            >
              {latestError}
            </span>
          </div>
        </div>
      </div>

      {/* Built-in Supported Gestures Presets to verify mapping */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
        <p className="text-[11px] font-semibold text-slate-400">
          Supported Canned Gestures (Tap to simulate or test label mapping):
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(LABEL_MAP)
            .filter(([key]) => key !== "None")
            .map(([key, label]) => {
              const isSelected = rawLabel === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setRawLabel(key);
                    setConfidence(0.95);
                    setHandCount(1);
                  }}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    isSelected
                      ? "bg-indigo-950 border-indigo-500 text-white shadow-sm"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <span className="text-xl">{EMOJI_MAP[key] || "✋"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{label}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{key}</p>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
export default GestureCamera;
