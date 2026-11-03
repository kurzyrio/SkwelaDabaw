import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

interface CustomDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialDate?: string;
  onSelectDate: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CustomDatePickerModal: React.FC<CustomDatePickerModalProps> = ({
  isOpen,
  onClose,
  title = 'Select Due Date',
  initialDate,
  onSelectDate
}) => {
  // Dismiss modal on Android back button
  useBackHandler(isOpen, onClose, BackPriority.MODAL);
  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getTodayStr = () => formatLocalDate(new Date());

  const [selectedDateStr, setSelectedDateStr] = useState<string>(initialDate || getTodayStr());
  const [viewYear, setViewYear] = useState<number>(() => {
    const d = new Date(initialDate || getTodayStr());
    return isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const d = new Date(initialDate || getTodayStr());
    return isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth();
  });

  useEffect(() => {
    if (isOpen) {
      const active = initialDate || getTodayStr();
      setSelectedDateStr(active);
      const d = new Date(active);
      if (!isNaN(d.getFullYear())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = getTodayStr();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(formatted);
  };

  const handleApplyPreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const formatted = formatLocalDate(target);
    setSelectedDateStr(formatted);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  const handleConfirm = () => {
    onSelectDate(selectedDateStr);
    onClose();
  };

  const getFriendlyDisplay = () => {
    try {
      const parts = selectedDateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return selectedDateStr;
    }
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
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">{title}</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {getFriendlyDisplay()}
              </p>
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
          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-[var(--nested-bg)] rounded-2xl border border-[var(--card-border)]">
            <button
              type="button"
              onClick={() => handleApplyPreset(0)}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all pressable"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(1)}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all pressable"
            >
              Tmrw
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(3)}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all pressable"
            >
              +3 Days
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(7)}
              className="py-1.5 px-2 rounded-xl text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all pressable"
            >
              +1 Week
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:bg-[var(--card-bg)] pressable"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:bg-[var(--card-bg)] pressable"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_NAMES.map((wd, i) => (
              <span key={i} className="text-[10px] font-semibold text-[var(--text-secondary)]">
                {wd}
              </span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDateStr === dateKey;
              const isToday = todayStr === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 rounded-xl text-xs font-semibold transition-all flex items-center justify-center relative pressable ${
                    isSelected
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                      : isToday
                      ? 'border border-[var(--text-primary)] text-[var(--text-primary)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)]'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-[var(--text-primary)] absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--card-border)] bg-[var(--nested-bg)] flex items-center justify-end gap-2">
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
            className="px-5 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center gap-1.5 pressable"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Set Date</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
