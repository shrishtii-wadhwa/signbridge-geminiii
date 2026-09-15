import React from 'react';
import { Camera, FileText, Hand } from 'lucide-react';
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
        className="grid grid-cols-3 p-1.5 rounded-2xl bg-slate-900/95 border border-slate-800/90 shadow-lg gap-1"
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
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
            activeMode === 'image'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Camera className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeMode === 'image' ? 'text-white' : 'text-slate-400'}`} />
          <span className="truncate">Scan Image</span>
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
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
            activeMode === 'text'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <FileText className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeMode === 'text' ? 'text-white' : 'text-slate-400'}`} />
          <span className="truncate">Paste Text</span>
        </button>

        {/* Tab 3: ISL Camera Translator — Beta */}
        <button
          type="button"
          role="tab"
          id="tab-isl-translator"
          aria-selected={activeMode === 'gesture'}
          aria-controls="panel-gesture-mode"
          tabIndex={activeMode === 'gesture' ? 0 : -1}
          onClick={() => onModeChange('gesture')}
          disabled={disabled}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center relative ${
            activeMode === 'gesture'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-950 ring-1 ring-indigo-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Hand className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeMode === 'gesture' ? 'text-amber-300' : 'text-amber-400/80'}`} />
          <span className="truncate hidden lg:inline">ISL Camera Translator — Beta</span>
          <span className="truncate hidden sm:inline lg:hidden">ISL Translator (Beta)</span>
          <span className="truncate sm:hidden">ISL Beta</span>
          <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            Beta
          </span>
        </button>
      </div>
    </div>
  );
};
