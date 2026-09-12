import React from 'react';
import { Eye, ShieldCheck, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 py-3.5 sm:px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div
            id="brand-logo"
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-extrabold text-xl tracking-tight select-none ring-1 ring-white/20"
          >
            S
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 id="app-title" className="text-xl font-bold tracking-tight text-white">
                SignBridge
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-700/50">
                <Sparkles className="w-2.5 h-2.5" />
                AI Accessibility
              </span>
            </div>
            <p id="app-tagline" className="text-xs font-medium text-slate-400">
              Point. Understand. Act.
            </p>
          </div>
        </div>

        {/* Status / Accessibility indicator */}
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multimodal Gemini 3</span>
          </div>
        </div>
      </div>
    </header>
  );
};
