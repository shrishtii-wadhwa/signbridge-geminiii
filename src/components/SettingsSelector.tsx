import React from 'react';
import {
  GraduationCap,
  Compass,
  Car,
  Camera,
  HeartPulse,
  Languages,
  UserCheck,
} from 'lucide-react';
import { LanguageOption, UserContextOption } from '../types';

interface SettingsSelectorProps {
  language: LanguageOption;
  onLanguageChange: (lang: LanguageOption) => void;
  context: UserContextOption;
  onContextChange: (ctx: UserContextOption) => void;
  disabled?: boolean;
}

const LANGUAGES: { id: LanguageOption; label: string; sub: string }[] = [
  { id: 'Hinglish', label: 'Hinglish', sub: 'Easy Roman Hindi + English' },
  { id: 'Hindi', label: 'हिंदी (Hindi)', sub: 'Devanagari script' },
  { id: 'English', label: 'English', sub: 'Clear, plain English' },
];

const CONTEXTS: {
  id: UserContextOption;
  label: string;
  icon: React.ElementType;
  hint: string;
}[] = [
  { id: 'Traveler', label: 'Traveler', icon: Compass, hint: 'Transit, stations, public ways' },
  { id: 'Driver', label: 'Driver', icon: Car, hint: 'Roads, parking, lane rules, fines' },
  { id: 'Student', label: 'Student', icon: GraduationCap, hint: 'Campus, exams, libraries' },
  { id: 'Tourist', label: 'Tourist', icon: Camera, hint: 'Attractions, entry, local customs' },
  { id: 'Patient / Visitor', label: 'Patient / Visitor', icon: HeartPulse, hint: 'Hospitals, clinics, quiet zones' },
];

export const SettingsSelector: React.FC<SettingsSelectorProps> = ({
  language,
  onLanguageChange,
  context,
  onContextChange,
  disabled = false,
}) => {
  return (
    <section aria-labelledby="step-make-it-personal" className="w-full space-y-4">
      {/* Section Header */}
      <div className="flex items-center space-x-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold ring-1 ring-indigo-500/30">
          2
        </span>
        <h2 id="step-make-it-personal" className="text-sm font-semibold tracking-tight text-slate-200">
          Make it personal
        </h2>
      </div>

      {/* Language Selection */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-3.5 sm:p-4">
        <div className="flex items-center space-x-2 mb-2.5">
          <Languages className="w-4 h-4 text-indigo-400" />
          <label htmlFor="language-group" className="text-xs font-semibold text-slate-300">
            Output Language
          </label>
        </div>

        <div id="language-group" role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                id={`lang-option-${lang.id.toLowerCase()}`}
                onClick={() => onLanguageChange(lang.id)}
                disabled={disabled}
                className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                    {lang.label}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400" />
                  )}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  {lang.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Context Selection */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-3.5 sm:p-4">
        <div className="flex items-center space-x-2 mb-2.5">
          <UserCheck className="w-4 h-4 text-indigo-400" />
          <label htmlFor="context-group" className="text-xs font-semibold text-slate-300">
            Your Role / Context
          </label>
        </div>

        <div id="context-group" role="radiogroup" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CONTEXTS.map((item) => {
            const Icon = item.icon;
            const isSelected = context === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                id={`context-option-${item.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => onContextChange(item.id)}
                disabled={disabled}
                className={`relative flex flex-col items-start p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 w-full mb-1">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-xs font-semibold truncate ${
                      isSelected ? 'text-indigo-200' : 'text-slate-200'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 line-clamp-1 leading-normal">
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
