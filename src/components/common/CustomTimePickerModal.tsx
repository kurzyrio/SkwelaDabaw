import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Check } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

interface CustomTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialTime?: string;
  onSelectTime: (time24h: string) => void;
}

export const CustomTimePickerModal: React.FC<CustomTimePickerModalProps> = ({
  isOpen,
  onClose,
  title = 'Select Class Time',
  initialTime = '08:00',
  onSelectTime
}) => {
  // Dismiss modal on Android back button
  useBackHandler(isOpen, onClose, BackPriority.MODAL);
  const parseTime = (timeStr: string) => {
    const parts = (timeStr || '08:00').split(':');
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (isNaN(h)) h = 8;
    
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;

    return {
      hour: h12,
      minute: m,
      period
    };
  };

  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (isOpen) {
      const parsed = parseTime(initialTime);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    }
  }, [isOpen, initialTime]);

  if (!isOpen) return null;

  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const presets = [
    { label: '07:30 AM', time24: '07:30' },
    { label: '08:00 AM', time24: '08:00' },
    { label: '09:30 AM', time24: '09:30' },
    { label: '10:00 AM', time24: '10:00' },
    { label: '11:30 AM', time24: '11:30' },
    { label: '01:00 PM', time24: '13:00' },
    { label: '01:30 PM', time24: '13:30' },
    { label: '03:00 PM', time24: '15:00' },
    { label: '04:30 PM', time24: '16:30' },
    { label: '06:00 PM', time24: '18:00' },
  ];

  const handleApplyPreset = (time24: string) => {
    const parsed = parseTime(time24);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
  };

  const handleConfirm = () => {
    let h24 = selectedHour;
    if (selectedPeriod === 'PM' && h24 < 12) {
      h24 += 12;
    } else if (selectedPeriod === 'AM' && h24 === 12) {
      h24 = 0;
    }

    const formatted = `${String(h24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    onSelectTime(formatted);
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--card-border)] bg-[var(--nested-bg)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">{title}</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">Select class time</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Big Digital Display Box */}
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center gap-2">
            <div className="text-3xl font-mono font-black tracking-wider text-[var(--text-primary)]">
              {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
            </div>
            <div className="flex flex-col gap-1 ml-2">
              <button
                type="button"
                onClick={() => setSelectedPeriod('AM')}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all pressable ${
                  selectedPeriod === 'AM'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                    : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('PM')}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all pressable ${
                  selectedPeriod === 'PM'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                    : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Hours Grid */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Hour</label>
            <div className="grid grid-cols-6 gap-1.5">
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSelectedHour(h)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all pressable ${
                    selectedHour === h
                      ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                      : 'border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Minutes Grid */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Minute</label>
            <div className="grid grid-cols-6 gap-1.5">
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMinute(m)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all pressable ${
                    selectedMinute === m
                      ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                      : 'border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Davao Timetable Presets</label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.time24}
                  type="button"
                  onClick={() => handleApplyPreset(p.time24)}
                  className="px-2.5 py-1 rounded-xl text-[10px] font-semibold border border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] pressable"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--card-border)] bg-[var(--nested-bg)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center gap-1.5 pressable"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Set Time</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
