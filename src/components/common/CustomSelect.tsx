import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface CustomSelectProps {
  id?: string;
  label?: string;
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const justClosedRef = useRef<number>(0);

  // Close floating dropdown on hardware or gesture back press
  useBackHandler(isOpen, () => {
    justClosedRef.current = Date.now();
    setIsOpen(false);
  }, BackPriority.POPUP);

  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
    width: number;
    placeAbove: boolean;
  }>({
    left: 0,
    top: 0,
    width: 0,
    placeAbove: false
  });

  const selectedOption = options.find((opt) => opt.value === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(options.length * 40 + 16, 240);
    const placeAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    setMenuPosition({
      left: Math.max(8, rect.left),
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      width: Math.min(rect.width, window.innerWidth - 16),
      placeAbove
    });
  }, [options.length]);

  const handleToggle = () => {
    if (disabled) return;
    if (Date.now() - justClosedRef.current < 350) {
      return;
    }
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      justClosedRef.current = Date.now();
      setIsOpen(false);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    justClosedRef.current = Date.now();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Recalculate position on open
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Handle outside clicks, resize, and scroll events
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        justClosedRef.current = Date.now();
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      // If the scroll happened inside the dropdown menu itself, do not close or recompute
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown' && !isOpen) {
        updatePosition();
        setIsOpen(true);
        e.preventDefault();
      }
    },
    [disabled, isOpen, updatePosition]
  );

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[var(--text-secondary)] tracking-wide"
        >
          {label}
          {required && <span className="text-[#FF453A] ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-between transition-all select-none pressable focus:outline-hidden focus:border-[var(--card-hover-border)] ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--card-hover-border)]'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate pr-2 text-left">
          {selectedOption?.icon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
          )}
          <span className={`truncate font-medium ${!selectedOption ? 'text-[var(--text-secondary)]' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--text-primary)]' : ''
          }`}
        />
      </button>

      {/* Portal-Rendered Top-Layer Floating Menu */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop Tap-to-Close with pointer event suppression */}
          <div 
            className="fixed inset-0 z-[9998] bg-black/10 sm:bg-transparent overscroll-none touch-none" 
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              justClosedRef.current = Date.now();
              setIsOpen(false);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              justClosedRef.current = Date.now();
              setIsOpen(false);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />

          {/* Floating Dropdown Menu Card */}
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              left: `${menuPosition.left}px`,
              top: menuPosition.placeAbove ? 'auto' : `${menuPosition.top}px`,
              bottom: menuPosition.placeAbove ? `${Math.max(8, window.innerHeight - menuPosition.top)}px` : 'auto',
              width: `${menuPosition.width}px`,
              zIndex: 9999
            }}
            className={`max-h-60 overflow-y-auto overscroll-contain rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl p-1 space-y-0.5 animate-modal-pop-in select-none ${menuClassName}`}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              const Icon = option.icon;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'text-[var(--text-primary)] hover:bg-[var(--nested-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{option.label}</span>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
