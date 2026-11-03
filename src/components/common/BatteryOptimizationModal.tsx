import React from 'react';
import { Zap, X, ShieldCheck } from 'lucide-react';
import { requestBatteryExemption } from '../../services/widgetService';

interface BatteryOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGranted?: () => void;
}

export function BatteryOptimizationModal({
  isOpen,
  onClose,
  onGranted
}: BatteryOptimizationModalProps) {
  if (!isOpen) return null;

  const handleRequest = async () => {
    try {
      await requestBatteryExemption();
      if (onGranted) onGranted();
    } catch (err) {
      console.warn('Battery exemption request error:', err);
    } finally {
      onClose();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('skwela_battery_prompt_dismissed', Date.now().toString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-2xl bg-[var(--surface-bg,#18181b)] border border-[var(--surface-border,#27272a)] p-6 shadow-2xl space-y-5 text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="battery-opt-title"
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2 id="battery-opt-title" className="text-lg font-semibold tracking-tight">
            Background Class Alerts
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Allow background operation so your timetable alarms, ongoing assistant, and DC Bus transit notifications fire reliably even if SkwelaDabaw is closed.
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-zinc-300">
            Prevents Android battery saver from silencing scheduled class alarms.
          </span>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={handleRequest}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 cursor-pointer"
          >
            Enable Background Alerts
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-2 px-4 rounded-xl bg-transparent text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
