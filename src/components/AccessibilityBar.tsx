import React, { useState } from 'react';
import { Volume2, VolumeX, Eye, EyeOff, Keyboard, HelpCircle, X } from 'lucide-react';
import { soundSynth } from '../simulation/audioSynth';

interface AccessibilityBarProps {
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: (enabled: boolean) => void;
  liveAnnouncement: string;
}

export const AccessibilityBar: React.FC<AccessibilityBarProps> = ({
  soundEnabled,
  onToggleSound,
  reducedMotion,
  onToggleReducedMotion,
  liveAnnouncement,
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    onToggleSound(next);
    soundSynth.setEnabled(next);
  };

  return (
    <>
      {/* Screen Reader Live Region for WCAG compliance */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {liveAnnouncement}
      </div>

      <nav aria-label="Accessibility and experience options" className="fixed top-4 right-4 z-40 flex items-center gap-2">
        {/* Sound Toggle */}
        <button
          onClick={handleSoundToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono tracking-wide transition-all duration-200 border ${
            soundEnabled
              ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
          } backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer`}
          aria-label={soundEnabled ? 'Mute simulated audio telemetry' : 'Unmute simulated audio telemetry'}
          title={soundEnabled ? 'Audio telemetry active' : 'Audio telemetry muted'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          <span>{soundEnabled ? 'AUDIO ON' : 'AUDIO OFF'}</span>
        </button>

        {/* Reduced Motion Toggle */}
        <button
          onClick={() => onToggleReducedMotion(!reducedMotion)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono tracking-wide transition-all duration-200 border ${
            reducedMotion
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
          } backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer`}
          aria-label={reducedMotion ? 'Enable smooth animations' : 'Reduce motion and animations'}
          title={reducedMotion ? 'Reduced motion active' : 'Standard motion active'}
        >
          {reducedMotion ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
          <span className="hidden sm:inline">{reducedMotion ? 'REDUCED MOTION' : 'MOTION ON'}</span>
        </button>

        {/* Keyboard Shortcuts Dialog Trigger */}
        <button
          onClick={() => setShowShortcuts(true)}
          className="p-1.5 rounded-full text-slate-400 hover:text-cyan-300 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md hover:border-cyan-500/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
          aria-label="View keyboard shortcuts"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </nav>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowShortcuts(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-cyan-400" />
                <h3 id="shortcuts-title" className="text-lg font-bold text-white tracking-wide">
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                aria-label="Close shortcuts dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-sm">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-300 font-sans text-xs sm:text-sm">Send / Start Simulation</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-cyan-500/40 rounded text-cyan-300 text-xs shadow-inner">
                  S
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-300 font-sans text-xs sm:text-sm">Pause / Resume Journey</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-cyan-500/40 rounded text-cyan-300 text-xs shadow-inner">
                  Space
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-300 font-sans text-xs sm:text-sm">Reset Simulation</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-cyan-500/40 rounded text-cyan-300 text-xs shadow-inner">
                  R
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-300 font-sans text-xs sm:text-sm">Break / Disable Random Node</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-rose-500/40 rounded text-rose-300 text-xs shadow-inner">
                  N
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <span className="text-slate-300 font-sans text-xs sm:text-sm">Toggle Telemetry Audio</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-cyan-500/40 rounded text-cyan-300 text-xs shadow-inner">
                  M
                </kbd>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>You can also click any network node on the canvas to toggle its status manually.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
