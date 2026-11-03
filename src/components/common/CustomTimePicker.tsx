import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

export interface CustomTimePickerProps {
  id?: string;
  label?: string;
  value: string; // Accepts "07:30 AM", "07:30", "14:30", etc.
  onChange: (value: string) => void;
  outputFormat?: '12h' | '24h'; // Default '12h' (e.g. "07:30 AM")
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

// Parse various time formats into standard 12-hour components
function parseTimeString(timeStr: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: 8, minute: 0, period: 'AM' };
  }

  const clean = timeStr.trim().toUpperCase();
  const hasAmPm = clean.includes('AM') || clean.includes('PM');
  const period: 'AM' | 'PM' = clean.includes('PM') ? 'PM' : 'AM';

  const digitsOnly = clean.replace(/[^0-9:]/g, '');
  const parts = digitsOnly.split(':');
  let rawHour = parseInt(parts[0], 10);
  let rawMinute = parseInt(parts[1], 10) || 0;

  if (isNaN(rawHour)) rawHour = 8;
  if (isNaN(rawMinute) || rawMinute < 0 || rawMinute > 59) rawMinute = 0;

  if (hasAmPm) {
    // 12-hour source
    let h12 = rawHour % 12;
    if (h12 === 0) h12 = 12;
    return { hour: h12, minute: rawMinute, period };
  } else {
    // 24-hour source
    const p: 'AM' | 'PM' = rawHour >= 12 ? 'PM' : 'AM';
    let h12 = rawHour % 12;
    if (h12 === 0) h12 = 12;
    return { hour: h12, minute: rawMinute, period: p };
  }
}

// Format 12-hour components into output string
function formatTimeOutput(hour: number, minute: number, period: 'AM' | 'PM', format: '12h' | '24h'): string {
  const mm = String(minute).padStart(2, '0');
  if (format === '24h') {
    let h24 = hour % 12;
    if (period === 'PM') h24 += 12;
    const hh = String(h24).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const hh = String(hour).padStart(2, '0');
  return `${hh}:${mm} ${period}`;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  id,
  label,
  value,
  onChange,
  outputFormat = '12h',
  placeholder = 'Select time',
  className = '',
  triggerClassName = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const parsed = parseTimeString(value);

  // Close time picker modal on hardware back button
  useBackHandler(isOpen, () => setIsOpen(false), BackPriority.MODAL);

  const [selectedHour, setSelectedHour] = useState<number>(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(parsed.period);

  useEffect(() => {
    if (isOpen) {
      const p = parseTimeString(value);
      setSelectedHour(p.hour);
      setSelectedMinute(p.minute);
      setSelectedPeriod(p.period);
    }
  }, [isOpen, value]);

  const displayTime = value ? formatTimeOutput(parsed.hour, parsed.minute, parsed.period, '12h') : placeholder;

  const handleConfirm = () => {
    const out = formatTimeOutput(selectedHour, selectedMinute, selectedPeriod, outputFormat);
    onChange(out);
    setIsOpen(false);
  };

  const handleQuickPreset = (h: number, m: number, p: 'AM' | 'PM') => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
  };

  const incrementHour = (delta: number) => {
    setSelectedHour((prev) => {
      let next = prev + delta;
      if (next > 12) next = 1;
      if (next < 1) next = 12;
      return next;
    });
  };

  const incrementMinute = (delta: number) => {
    setSelectedMinute((prev) => {
      let next = prev + delta;
      if (next >= 60) next = 0;
      if (next < 0) next = 55;
      return next;
    });
  };

  const COMMON_MINUTES = [0, 15, 30, 45];
  const COMMON_PRESETS = [
    { label: '07:00 AM', h: 7, m: 0, p: 'AM' as const },
    { label: '07:30 AM', h: 7, m: 30, p: 'AM' as const },
    { label: '08:00 AM', h: 8, m: 0, p: 'AM' as const },
    { label: '09:30 AM', h: 9, m: 30, p: 'AM' as const },
    { label: '01:00 PM', h: 1, m: 0, p: 'PM' as const },
    { label: '04:30 PM', h: 4, m: 30, p: 'PM' as const },
    { label: '06:00 PM', h: 6, m: 0, p: 'PM' as const }
  ];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[var(--text-secondary)] tracking-wide"
        >
          {label}
          {required && <span className="text-[#FF453A] ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger Button • 44px min height for mobile ergonomics */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-between transition-all select-none pressable focus:outline-hidden focus:border-[var(--card-hover-border)] ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--card-hover-border)]'
        } ${triggerClassName}`}
      >
        <span className={`font-semibold ${!value ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
          {displayTime}
        </span>
        <Clock className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
      </button>

      {/* Apple iOS 18 Inset Grouped Modal Dialog */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col p-5 space-y-4 sheet-enter-spring"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--card-border)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Select Time</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">iOS 18 Inset Grouped Picker</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] pressable"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inset Grouped Time Wheel / Stepper Columns */}
            <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-center justify-center gap-3">
              {/* Hours Wheel */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => incrementHour(1)}
                  className="w-11 h-11 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center pressable"
                  title="Increase Hour"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div className="w-14 h-14 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-xl font-black text-[var(--text-primary)] shadow-inner">
                  {String(selectedHour).padStart(2, '0')}
                </div>
                <button
                  type="button"
                  onClick={() => incrementHour(-1)}
                  className="w-11 h-11 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center pressable"
                  title="Decrease Hour"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mt-0.5">Hour</span>
              </div>

              {/* Time Divider */}
              <div className="text-2xl font-black text-[var(--text-secondary)] pb-5">:</div>

              {/* Minutes Wheel */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => incrementMinute(5)}
                  className="w-11 h-11 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center pressable"
                  title="Increase Minutes"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div className="w-14 h-14 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-xl font-black text-[var(--text-primary)] shadow-inner">
                  {String(selectedMinute).padStart(2, '0')}
                </div>
                <button
                  type="button"
                  onClick={() => incrementMinute(-5)}
                  className="w-11 h-11 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center pressable"
                  title="Decrease Minutes"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mt-0.5">Min</span>
              </div>

              {/* AM / PM Segmented Pills • 44px min touch target */}
              <div className="flex flex-col gap-2 pl-2 border-l border-[var(--card-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('AM')}
                  className={`w-12 h-11 rounded-xl text-xs font-bold transition-all pressable flex items-center justify-center ${
                    selectedPeriod === 'AM'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-sm'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('PM')}
                  className={`w-12 h-11 rounded-xl text-xs font-bold transition-all pressable flex items-center justify-center ${
                    selectedPeriod === 'PM'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-sm'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Quick Minute Jumps */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              {COMMON_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMinute(m)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all pressable text-center ${
                    selectedMinute === m
                      ? 'bg-[var(--text-primary)] text-[var(--card-bg)] font-bold'
                      : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]'
                  }`}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>

            {/* Presets Horizontal Scroll */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Common Class Schedules
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {COMMON_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleQuickPreset(preset.h, preset.m, preset.p)}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shrink-0 pressable"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm & Cancel Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="btn-primary-ios px-6 py-2.5 rounded-full text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-sm pressable flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Time</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
