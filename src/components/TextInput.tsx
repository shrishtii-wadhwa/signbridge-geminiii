import React from 'react';
import { FileText, HelpCircle, X, Sparkles, Check } from 'lucide-react';

interface TextInputProps {
  inputText: string;
  onInputTextChange: (text: string) => void;
  userQuestion: string;
  onUserQuestionChange: (question: string) => void;
  disabled?: boolean;
}

const PRESET_TEXT_SAMPLES = [
  {
    label: 'Exam Hall Rule',
    text: 'Students are not permitted to enter the examination hall after 9:15 AM. Mobile phones and digital watches are strictly prohibited. Possession of unauthorized materials results in immediate expulsion.',
    question: 'What happens if I arrive at 9:20 AM?',
  },
  {
    label: 'Airport Boarding',
    text: 'Gate closes strictly 20 minutes prior to departure. Passengers must have boarding pass and government photo ID ready. Liquids over 100ml are strictly confiscated at security check.',
    question: 'Can I carry my perfume bottle in my carry-on?',
  },
  {
    label: 'Hospital ICU',
    text: 'ICU Quiet Zone. Visiting hours: 4:00 PM to 6:00 PM only. Maximum one attendant per patient. Sanitization and N95 masks mandatory before entering ward.',
    question: 'Can two family members visit together?',
  },
];

const MAX_CHAR_LIMIT = 5000;

export const TextInput: React.FC<TextInputProps> = ({
  inputText,
  onInputTextChange,
  userQuestion,
  onUserQuestionChange,
  disabled = false,
}) => {
  const charCount = inputText.length;
  const nonWhitespaceCount = inputText.trim().length;
  const isTooShort = charCount > 0 && nonWhitespaceCount < 8;

  const handleApplyPreset = (text: string, question: string) => {
    onInputTextChange(text);
    onUserQuestionChange(question);
  };

  const handleClear = () => {
    onInputTextChange('');
    onUserQuestionChange('');
  };

  return (
    <section aria-labelledby="step-paste-text" className="w-full space-y-4">
      {/* Label and Clear action */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="textarea-notice-input"
          className="text-sm font-semibold tracking-tight text-slate-200 flex items-center gap-2"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold ring-1 ring-indigo-500/30">
            1
          </span>
          <span>Paste a notice, message, sign, or instruction</span>
        </label>
        {inputText.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="inline-flex items-center text-xs text-slate-400 hover:text-rose-400 transition-colors py-1 px-2 rounded-lg hover:bg-slate-900"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear text
          </button>
        )}
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          id="textarea-notice-input"
          value={inputText}
          onChange={(e) => onInputTextChange(e.target.value.slice(0, MAX_CHAR_LIMIT))}
          placeholder="Example: Students are not permitted to enter the examination hall after 9:15 AM. Mobile phones are strictly prohibited."
          disabled={disabled}
          rows={5}
          className={`w-full p-4 rounded-2xl bg-slate-900/90 border text-slate-100 placeholder-slate-500 text-sm sm:text-base leading-relaxed focus:outline-none transition-all resize-y min-h-[140px] shadow-inner ${
            isTooShort
              ? 'border-amber-600/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
              : 'border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          }`}
        />

        {/* Character Count Bar */}
        <div className="flex items-center justify-between px-1 pt-1.5 text-xs text-slate-400">
          <div>
            {isTooShort && (
              <span className="text-amber-400 text-[11px] font-medium">
                Enter at least 8 characters ({nonWhitespaceCount}/8)
              </span>
            )}
            {nonWhitespaceCount >= 8 && (
              <span className="text-emerald-400/90 text-[11px] font-medium inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                Ready to explain
              </span>
            )}
          </div>
          <div className="font-mono text-[11px]">
            <span
              className={
                charCount >= MAX_CHAR_LIMIT
                  ? 'text-rose-400 font-bold'
                  : charCount > MAX_CHAR_LIMIT * 0.9
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }
            >
              {charCount.toLocaleString()}
            </span>
            <span className="text-slate-400"> / {MAX_CHAR_LIMIT.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Quick Text Presets */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Or try a sample notice:
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_TEXT_SAMPLES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPreset(preset.text, preset.question)}
              disabled={disabled}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/30 text-slate-300 hover:text-indigo-200 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Optional Single-Line Field: What do you want help with? */}
      <div className="space-y-1.5 pt-1">
        <label
          htmlFor="input-user-question"
          className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>What do you want help with? (optional)</span>
        </label>
        <input
          type="text"
          id="input-user-question"
          value={userQuestion}
          onChange={(e) => onUserQuestionChange(e.target.value)}
          placeholder="Example: What should I do if I am late?"
          disabled={disabled}
          maxLength={200}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
        />
      </div>
    </section>
  );
};
