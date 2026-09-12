import React, { useRef, useState } from 'react';
import { Camera, UploadCloud, X, RefreshCw, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { SAMPLE_SIGNS } from '../data/sampleSigns';
import { SampleSign } from '../types';

interface ImageCaptureProps {
  selectedImage: string | null;
  mimeType: string;
  onImageSelected: (dataUrl: string, mime: string) => void;
  onClearImage: () => void;
  onSelectSample: (sample: SampleSign) => void;
  disabled?: boolean;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ImageCapture: React.FC<ImageCaptureProps> = ({
  selectedImage,
  mimeType,
  onImageSelected,
  onClearImage,
  onSelectSample,
  disabled = false,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcessing = (file: File) => {
    setLocalError(null);

    // Validation: MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setLocalError('Please upload a valid JPEG, PNG, or WebP image file.');
      return;
    }

    // Validation: File size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError('File size exceeds 10 MB. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        onImageSelected(result, file.type || 'image/jpeg');
      }
    };
    reader.onerror = () => {
      setLocalError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcessing(file);
    }
    // reset input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcessing(file);
    }
  };

  return (
    <section aria-labelledby="step-add-sign" className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold ring-1 ring-indigo-500/30">
            1
          </span>
          <h2 id="step-add-sign" className="text-sm font-semibold tracking-tight text-slate-200">
            Add a sign
          </h2>
        </div>
        {selectedImage && (
          <button
            type="button"
            id="btn-clear-image"
            onClick={onClearImage}
            disabled={disabled}
            className="inline-flex items-center text-xs text-slate-400 hover:text-rose-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-900"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Remove photo
          </button>
        )}
      </div>

      {/* Hidden Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileInputChange}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        disabled={disabled}
      />

      {/* Local Error Notice */}
      {localError && (
        <div
          id="image-validation-error"
          className="mb-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{localError}</span>
        </div>
      )}

      {/* Active Preview or Empty State Dropzone */}
      {selectedImage ? (
        <div
          id="image-preview-container"
          className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-lg shadow-black/40 group"
        >
          <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full max-h-72 flex items-center justify-center bg-slate-950/90 overflow-hidden">
            <img
              src={selectedImage}
              alt="Sign preview"
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
          </div>

          <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span className="font-medium">Sign image ready</span>
              <span className="text-[11px] text-slate-500 uppercase font-mono">
                {mimeType.replace('image/', '')}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="btn-replace-photo"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Change
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          id="image-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative w-full rounded-2xl border-2 border-dashed p-6 sm:p-8 transition-all flex flex-col items-center justify-center text-center ${
            dragOver
              ? 'border-indigo-500 bg-indigo-950/20'
              : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
            <Camera className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-slate-200 mb-1">
            Capture or choose a sign photo
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
            Snap a notice, transit board, warning label, or parking sign in any language.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-xs">
            {/* Camera Trigger */}
            <button
              type="button"
              id="btn-open-camera"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled}
              className="flex-1 min-w-[120px] inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-colors focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Use Camera
            </button>

            {/* File Upload Trigger */}
            <button
              type="button"
              id="btn-upload-file"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex-1 min-w-[120px] inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors focus:ring-2 focus:ring-slate-500 focus:outline-none"
            >
              <UploadCloud className="w-4 h-4 mr-1.5" />
              Upload Photo
            </button>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            JPG, PNG, or WebP up to 10 MB
          </p>
        </div>
      )}

      {/* Instant Presets for instant trial without finding a photo */}
      <div className="mt-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Or try a sample sign
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_SIGNS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              id={`sample-sign-${sample.id}`}
              onClick={() => onSelectSample(sample)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/40 transition-all text-left"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <span>{sample.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
