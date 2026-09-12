import React from 'react';
import { Camera, FileText } from 'lucide-react';
import { InputMode } from '../types';

interface InputModeToggleProps {
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  disabled?: boolean;
}

export const InputModeToggle: React.FC<InputModeToggleProps> = ({
  activeMode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className="w-full" role="region" aria-label="Input mode selection">
      <div
        role="tablist"
        aria-label="Input method"
        className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-900/95 border border-slate-800/90 shadow-lg"
      >
        {/* Tab 1: Scan image */}
        <button
          type="button"
          role="tab"
          id="tab-scan-image"
          aria-selected={activeMode === 'image'}
          aria-controls="panel-image-mode"
          tabIndex={activeMode === 'image' ? 0 : -1}
          onClick={() => onModeChange('image')}
          disabled={disabled}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeMode === 'image'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Camera className={`w-4 h-4 ${activeMode === 'image' ? 'text-white' : 'text-slate-400'}`} />
          <span>Scan image</span>
        </button>

        {/* Tab 2: Paste text */}
        <button
          type="button"
          role="tab"
          id="tab-paste-text"
          aria-selected={activeMode === 'text'}
          aria-controls="panel-text-mode"
          tabIndex={activeMode === 'text' ? 0 : -1}
          onClick={() => onModeChange('text')}
          disabled={disabled}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeMode === 'text'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <FileText className={`w-4 h-4 ${activeMode === 'text' ? 'text-white' : 'text-slate-400'}`} />
          <span>Paste text</span>
        </button>
      </div>
    </div>
  );
};
