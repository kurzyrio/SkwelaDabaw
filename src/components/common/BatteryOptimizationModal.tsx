import React from 'react';
import { Zap, X, ShieldCheck } from 'lucide-react';
import { requestBatteryExemption } from '../../services/widgetService';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

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
  const handleDismiss = () => {
    localStorage.setItem('skwela_battery_prompt_dismissed', Date.now().toString());
    onClose();
  };

  useBackHandler(isOpen, handleDismiss, BackPriority.MODAL, 'battery_opt_modal');

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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--modal-overlay,rgba(0,0,0,0.65))] backdrop-blur-sm animate-fade-in"
      onClick={handleDismiss}
    >
      <div 
        className="w-full max-w-sm rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] p-6 shadow-2xl space-y-5 text-[var(--text-primary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="battery-opt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500 dark:text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2 id="battery-opt-title" className="text-base font-bold tracking-tight text-[var(--text-primary)]">
            Background Class Alerts
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Allow background operation so your timetable alarms, ongoing assistant, and DC Bus transit notifications fire reliably even if SkwelaDabaw is closed.
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] p-3.5 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span className="text-[11px] text-[var(--text-secondary)] leading-snug">
            Prevents Android battery saver from silencing scheduled class alarms.
          </span>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleRequest}
            className="w-full py-3 px-4 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold hover:opacity-95 active:scale-[0.98] transition-all shadow-md shadow-[var(--btn-primary-bg)]/20 cursor-pointer pressable"
          >
            Enable Background Alerts
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-2xl bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] text-xs font-semibold transition-colors cursor-pointer pressable"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
