import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputModeToggle } from './components/InputModeToggle';
import { ImageCapture } from './components/ImageCapture';
import { TextInput } from './components/TextInput';
import { GestureRecognizerComponent } from './components/GestureRecognizerComponent';
import { SettingsSelector } from './components/SettingsSelector';
import { ResultDashboard } from './components/ResultDashboard';
import {
  LanguageOption,
  UserContextOption,
  InputMode,
  SignAnalysisResult,
  AnalyzeSignResponse,
  SampleSign,
} from './types';
import { getSampleSignDataUrl } from './data/sampleSigns';
import { Sparkles, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function App() {
  const [inputMode, setInputMode] = useState<InputMode>('image');

  // Image mode states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');

  // Text mode states
  const [inputText, setInputText] = useState<string>('');
  const [userQuestion, setUserQuestion] = useState<string>('');

  // Preference states (used by Scan Image & Paste Text modes)
  const [language, setLanguage] = useState<LanguageOption>('Hinglish');
  const [context, setContext] = useState<UserContextOption>('Traveler');

  // Status & output states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SignAnalysisResult | null>(null);

  // Handle image selection
  const handleImageSelected = (dataUrl: string, mime: string) => {
    setSelectedImage(dataUrl);
    setMimeType(mime);
    setErrorMessage(null);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  // Quick preset sample click
  const handleSelectSample = (sample: SampleSign) => {
    const pngDataUrl = getSampleSignDataUrl(sample.id);
    setSelectedImage(pngDataUrl);
    setMimeType('image/png');
    if (sample.recommendedContext) {
      setContext(sample.recommendedContext);
    }
    setErrorMessage(null);
    setAnalysisResult(null);
  };

  // Calculate validity for primary action (Image or Text mode)
  const isImageValid = Boolean(selectedImage);
  const isTextValid = inputText.trim().length >= 8;
  const isActionReady = inputMode === 'image' ? isImageValid : isTextValid;

  // Helper to convert base64 data URL to a File for FormData
  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binaryString = atob(parts[1] || '');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  };

  // Primary explain action (Sign or Text)
  const handleExplain = async () => {
    if (inputMode === 'image' && !selectedImage) {
      setErrorMessage('Please add or capture a sign photo before explaining.');
      return;
    }

    if (inputMode === 'text' && inputText.trim().length < 8) {
      setErrorMessage('Please enter at least 8 non-whitespace characters to explain.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();

      if (inputMode === 'image' && selectedImage) {
        const file = dataUrlToFile(selectedImage, 'sign_capture.jpg');
        formData.append('image', file);
      } else if (inputMode === 'text') {
        formData.append('inputText', inputText.trim());
        if (userQuestion.trim()) {
          formData.append('userQuestion', userQuestion.trim());
        }
      }

      formData.append('outputLanguage', language);
      formData.append('userContext', context);

      let res: Response;
      let isMultipartFailed = false;

      try {
        res = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });
      } catch (networkErr) {
        console.warn('Multipart fetch failed, attempting JSON fallback endpoint:', networkErr);
        isMultipartFailed = true;
        // Fallback to JSON payload
        const jsonPayload: any = {
          outputLanguage: language,
          language,
          userContext: context,
          context,
        };
        if (inputMode === 'image' && selectedImage) {
          jsonPayload.image = selectedImage;
          jsonPayload.mimeType = mimeType;
        } else if (inputMode === 'text') {
          jsonPayload.inputText = inputText.trim();
          if (userQuestion.trim()) {
            jsonPayload.userQuestion = userQuestion.trim();
          }
        }

        res = await fetch('/api/analyze-sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jsonPayload),
        });
      }

      // Safely read response text first, then parse JSON with error handling
      const responseText = await res.text();
      let json: any;
      try {
        json = JSON.parse(responseText);
      } catch {
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to analyze sign. Please try again.');
      }

      const resultData: SignAnalysisResult = json.data || json;
      setAnalysisResult(resultData);
    } catch (err: any) {
      console.error('Sign analysis failed:', err);
      setErrorMessage(
        err?.message || 'Could not connect to Gemini service. Please verify your connection.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 flex flex-col">
        {analysisResult ? (
          /* Results Dashboard View */
          <ResultDashboard
            result={analysisResult}
            userLanguage={language}
            userContext={context}
            onReset={handleReset}
            imageUrl={inputMode === 'image' ? selectedImage : null}
            sourceText={inputMode === 'text' ? inputText : null}
            userQuestion={inputMode === 'text' ? userQuestion : null}
          />
        ) : (
          /* Input / Homepage View */
          <div className="space-y-6">
            {/* Product intro headline */}
            <div className="text-center space-y-1.5 pt-1 pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-[11px] font-semibold text-indigo-300">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                AI Real-World Sign & Notice Assistant
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Point. Understand. Act.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                SignBridge is an AI accessibility tool that helps people understand real-world
                signs, notices, warnings, menus, forms, and public instructions.
              </p>
            </div>

            {/* Input Mode Segmented Control: Scan Image, Paste Text, Basic Gesture Mode (Experimental) */}
            <div className="space-y-1">
              <InputModeToggle
                activeMode={inputMode}
                onModeChange={(mode) => {
                  setInputMode(mode);
                  setErrorMessage(null);
                }}
                disabled={isLoading}
              />
            </div>

            {/* Mode 1: Scan image */}
            {inputMode === 'image' && (
              <div id="panel-image-mode" role="tabpanel" aria-labelledby="tab-scan-image">
                <ImageCapture
                  selectedImage={selectedImage}
                  mimeType={mimeType}
                  onImageSelected={handleImageSelected}
                  onClearImage={handleClearImage}
                  onSelectSample={handleSelectSample}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Mode 2: Paste text */}
            {inputMode === 'text' && (
              <div id="panel-text-mode" role="tabpanel" aria-labelledby="tab-paste-text">
                <TextInput
                  inputText={inputText}
                  onInputTextChange={(val) => {
                    setInputText(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  userQuestion={userQuestion}
                  onUserQuestionChange={setUserQuestion}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Mode 3: ISL Camera Translator — Beta */}
            {inputMode === 'gesture' && (
              <div id="panel-gesture-mode" role="tabpanel" aria-labelledby="tab-isl-translator">
                <GestureRecognizerComponent />
              </div>
            )}

            {/* Settings and Primary Action for Image & Text Modes */}
            {inputMode !== 'gesture' && (
              <>
                {/* Step 2: Make it personal */}
                <SettingsSelector
                  language={language}
                  onLanguageChange={setLanguage}
                  context={context}
                  onContextChange={setContext}
                  disabled={isLoading}
                />

                {/* Error Message Box */}
                {errorMessage && (
                  <div
                    id="api-error-alert"
                    className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-3 shadow-lg animate-fade-in"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-rose-200">Notice</p>
                      <p className="mt-0.5 leading-relaxed text-rose-300/90">{errorMessage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-rose-400 hover:text-rose-200 p-1"
                      aria-label="Dismiss error"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    id={inputMode === 'image' ? 'btn-explain-sign' : 'btn-explain-text'}
                    onClick={handleExplain}
                    disabled={isLoading || !isActionReady}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                      !isActionReady || isLoading
                        ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
                        : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/30 hover:shadow-indigo-600/40 active:scale-[0.99]'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />
                        <span>
                          {inputMode === 'image'
                            ? 'Gemini is understanding this sign…'
                            : 'Gemini is understanding this text…'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-indigo-200" />
                        <span>
                          {inputMode === 'image' ? 'Explain this sign' : 'Explain this text'}
                        </span>
                        <ArrowRight className="w-5 h-5 text-indigo-200" />
                      </>
                    )}
                  </button>

                  {/* Contextual helper note below button */}
                  {!isActionReady && !isLoading && (
                    <p className="text-center text-[11px] text-slate-500 mt-2">
                      {inputMode === 'image'
                        ? 'Select a photo or click any sample sign above to begin'
                        : inputText.trim().length === 0
                        ? 'Paste or type a notice above to begin'
                        : 'Enter at least 8 characters before explaining'}
                    </p>
                  )}
                </div>

                {/* Detailed loading indicator card */}
                {isLoading && (
                  <div
                    id="loading-indicator-card"
                    className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-900/60 text-center space-y-3 shadow-xl animate-pulse"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        {inputMode === 'image'
                          ? 'Gemini is understanding this sign…'
                          : 'Gemini is analyzing this text notice…'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Translating to {language} and generating tailored next steps for a {context}.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-indigo-300/80 pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                      <span>
                        {inputMode === 'image'
                          ? 'Multimodal visual analysis'
                          : 'Contextual semantic analysis'}{' '}
                        in progress
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Privacy note */}
            <footer className="text-center pt-4 pb-6">
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Inputs are analyzed for this session and are not permanently stored by SignBridge.
              </p>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
