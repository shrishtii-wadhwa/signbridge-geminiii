import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  AlertTriangle,
  FileText,
  Languages,
  HelpCircle,
  CheckCircle2,
  Info,
  ShieldAlert,
  ArrowLeft,
  Copy,
  Check,
  Tag,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { SignAnalysisResult, LanguageOption, UserContextOption } from '../types';

interface ResultDashboardProps {
  result: SignAnalysisResult;
  userLanguage: LanguageOption;
  userContext: UserContextOption;
  onReset: () => void;
  imageUrl: string | null;
  sourceText?: string | null;
  userQuestion?: string | null;
}

export const ResultDashboard: React.FC<ResultDashboardProps> = ({
  result,
  userLanguage,
  userContext,
  onReset,
  imageUrl,
  sourceText,
  userQuestion,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = () => {
    if (!speechSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Prepare speech text: translation + action to take
    const speechText = `${result.translation}. Action to take: ${result.action_to_take}.`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utteranceRef.current = utterance;

    // Pick suitable voice if available
    const voices = window.speechSynthesis.getVoices();
    if (userLanguage === 'Hindi') {
      const hiVoice = voices.find(
        (v) => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
      );
      if (hiVoice) utterance.voice = hiVoice;
      utterance.lang = 'hi-IN';
    } else {
      const inVoice = voices.find(
        (v) => v.lang === 'en-IN' || v.lang.startsWith('en')
      );
      if (inVoice) utterance.voice = inVoice;
      utterance.lang = 'en-US';
    }

    utterance.rate = 0.95; // slightly relaxed pace for readability

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleCopySummary = async () => {
    const summary = `[SignBridge Analysis]
Detected Text: ${result.detected_text}
Translation (${userLanguage}): ${result.translation}
Meaning: ${result.simple_explanation}
Action to Take (${userContext}): ${result.action_to_take}
Why It Matters: ${result.why_it_matters}
Urgency: ${result.urgency.toUpperCase()}`;

    try {
      await navigator.clipboard.writeText(summary);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Urgency badge configuration
  // low = green, medium = amber/yellow, high = orange, critical = red
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'low':
        return {
          bg: 'bg-emerald-950/80',
          text: 'text-emerald-400',
          border: 'border-emerald-800/80',
          indicator: 'bg-emerald-400',
          label: 'Low Urgency • Information only',
        };
      case 'medium':
        return {
          bg: 'bg-amber-950/80',
          text: 'text-amber-400',
          border: 'border-amber-800/80',
          indicator: 'bg-amber-400',
          label: 'Medium Urgency • Important instruction',
        };
      case 'high':
        return {
          bg: 'bg-orange-950/80',
          text: 'text-orange-400',
          border: 'border-orange-800/80',
          indicator: 'bg-orange-400',
          label: 'High Urgency • Restriction or penalty',
        };
      case 'critical':
      default:
        return {
          bg: 'bg-rose-950/80',
          text: 'text-rose-400',
          border: 'border-rose-800/80',
          indicator: 'bg-rose-400',
          label: 'Critical Urgency • Immediate physical danger',
        };
    }
  };

  const urgencyConfig = getUrgencyConfig(result.urgency);

  // Determine if safety note is relevant:
  // "safety_note must be exactly 'No special safety warning.' if there is no genuine safety warning."
  const isSafetyNoteRelevant =
    result.safety_note &&
    result.safety_note.trim() !== '' &&
    !result.safety_note.toLowerCase().includes('no special safety warning');

  return (
    <div id="results-dashboard" className="w-full space-y-5 animate-fade-in">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          id="btn-back-to-input"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Explain another sign
        </button>

        <div className="flex items-center gap-2">
          {speechSupported && (
            <button
              type="button"
              id="btn-listen-explanation"
              onClick={handleToggleSpeech}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm ${
                isSpeaking
                  ? 'bg-indigo-600 text-white animate-pulse ring-2 ring-indigo-400'
                  : 'bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/60'
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-white" />
                  <span>Stop Voice</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Listen to explanation</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            id="btn-copy-summary"
            onClick={handleCopySummary}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Copy explanation"
            aria-label="Copy explanation"
          >
            {hasCopied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Heading & Urgency Badge */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-4 sm:p-5 shadow-xl shadow-black/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="results-heading" className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Here’s what it means
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized for a <span className="font-semibold text-slate-200">{userContext}</span> in{' '}
              <span className="font-semibold text-slate-200">{userLanguage}</span>
            </p>
          </div>

          {/* Color-coded urgency badge */}
          <div
            id="urgency-badge"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wide ${urgencyConfig.bg} ${urgencyConfig.text} ${urgencyConfig.border} shrink-0`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${urgencyConfig.indicator} animate-pulse`} />
            <span className="uppercase">{result.urgency} Urgency</span>
          </div>
        </div>

        {/* Thumbnail Preview Banner if present */}
        {imageUrl ? (
          <div className="mt-4 flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-slate-800 flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Analyzed sign thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                Source Sign Image
              </span>
              <p className="text-slate-300 truncate font-mono text-[11px] mt-0.5">
                "{result.detected_text.slice(0, 60)}
                {result.detected_text.length > 60 ? '...' : ''}"
              </p>
            </div>
          </div>
        ) : sourceText ? (
          <div className="mt-4 flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="w-10 h-10 rounded-lg shrink-0 bg-indigo-950/50 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                Source Text Notice
              </span>
              <p className="text-slate-300 truncate font-mono text-[11px] mt-0.5">
                "{sourceText.slice(0, 70)}
                {sourceText.length > 70 ? '...' : ''}"
              </p>
            </div>
          </div>
        ) : null}

        {/* User Question answered notification if present */}
        {userQuestion && userQuestion.trim().length > 0 && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex items-center gap-2 text-xs text-indigo-200">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">
              Question addressed: <strong className="text-indigo-100 font-semibold">"{userQuestion}"</strong>
            </span>
          </div>
        )}

        {/* Required Cards in EXACT Order:
            1. Text detected
            2. Translation
            3. Simple meaning
            4. What you should do (Most prominent card)
            5. Why it matters
            6. Safety note only when relevant
        */}
        <div className="mt-5 space-y-3.5">
          {/* Card 1: Text detected */}
          <div
            id="card-detected-text"
            className="rounded-xl p-4 bg-slate-950/70 border border-slate-800 text-left transition-all"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                1. Text Detected
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                Orig: {result.language_detected || 'Auto'}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-200 font-mono whitespace-pre-wrap leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
              {result.detected_text}
            </p>
          </div>

          {/* Card 2: Translation */}
          <div
            id="card-translation"
            className="rounded-xl p-4 bg-slate-950/70 border border-slate-800 text-left transition-all"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-indigo-400" />
                2. Translation ({userLanguage})
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-indigo-100 leading-relaxed">
              {result.translation}
            </p>
          </div>

          {/* Card 3: Simple meaning */}
          <div
            id="card-simple-meaning"
            className="rounded-xl p-4 bg-slate-950/70 border border-slate-800 text-left transition-all"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>3. Simple Meaning</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {result.simple_explanation}
            </p>
          </div>

          {/* Card 4: What you should do (MOST PROMINENT CARD) */}
          <div
            id="card-action-to-take"
            className="rounded-2xl p-5 bg-gradient-to-br from-indigo-950/90 via-blue-950/80 to-slate-900 border-2 border-indigo-500 shadow-lg shadow-indigo-950/60 ring-1 ring-indigo-400/30 text-left relative overflow-hidden"
          >
            {/* Ambient visual badge */}
            <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between text-xs font-bold text-indigo-300 mb-2.5">
              <span className="flex items-center gap-2 text-indigo-300">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-300" />
                </span>
                <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-200">
                  4. What You Should Do ({userContext})
                </span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                Next Step
              </span>
            </div>

            <p className="text-base sm:text-lg font-bold text-white leading-snug pl-8">
              {result.action_to_take}
            </p>
          </div>

          {/* Card 5: Why it matters */}
          <div
            id="card-why-it-matters"
            className="rounded-xl p-4 bg-slate-950/70 border border-slate-800 text-left transition-all"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>5. Why It Matters</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {result.why_it_matters}
            </p>
          </div>

          {/* Card 6: Safety note only when relevant */}
          {isSafetyNoteRelevant && (
            <div
              id="card-safety-note"
              className="rounded-xl p-4 bg-rose-950/50 border border-rose-800/80 text-left transition-all"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300 mb-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>6. Safety Notice</span>
              </div>
              <p className="text-sm font-medium text-rose-200 leading-relaxed">
                {result.safety_note}
              </p>
            </div>
          )}
        </div>

        {/* Category and Confidence at the bottom */}
        <div
          id="results-metadata-footer"
          className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span className="capitalize">{result.category.replace('_', ' ')}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              <span>Confidence:</span>
              <span
                className={`font-bold ${
                  result.confidence >= 75
                    ? 'text-emerald-400'
                    : result.confidence >= 45
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {result.confidence}%
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Small Privacy Footer */}
      <footer id="privacy-footer" className="text-center pt-2 pb-6">
        <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
          Images are analyzed for this session and are not permanently stored by SignBridge.
        </p>
      </footer>
    </div>
  );
};
