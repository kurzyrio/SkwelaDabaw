import React, { useState, useEffect } from 'react';
import { Edit3 } from 'lucide-react';
import { CustomSelect, CustomSelectOption } from './CustomSelect';

export type SelectOption = CustomSelectOption;

export interface SelectWithOtherProps {
  id?: string;
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  otherPlaceholder?: string;
  otherOptionLabel?: string;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

export const SelectWithOther: React.FC<SelectWithOtherProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  otherPlaceholder = 'Specify custom entry',
  otherOptionLabel = 'Other',
  className = '',
  selectClassName = '',
  inputClassName = '',
  disabled = false,
  required = false
}) => {
  const isPreset = options.some((opt) => opt.value === value && opt.value !== 'other');
  const isOther = !isPreset && value !== '';
  const [showOtherInput, setShowOtherInput] = useState<boolean>(isOther || value === 'other');
  const [customText, setCustomText] = useState<string>(isPreset ? '' : value === 'other' ? '' : value);

  useEffect(() => {
    const presetFound = options.some((opt) => opt.value === value && opt.value !== 'other');
    if (presetFound) {
      setShowOtherInput(false);
      setCustomText('');
    } else if (value) {
      setShowOtherInput(true);
      if (value !== 'other') {
        setCustomText(value);
      }
    }
  }, [value, options]);

  const handleSelectChange = (selected: string) => {
    if (selected === 'other') {
      setShowOtherInput(true);
      onChange(customText.trim() || 'other');
    } else {
      setShowOtherInput(false);
      setCustomText('');
      onChange(selected);
    }
  };

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomText(text);
    onChange(text);
  };

  const selectValue = showOtherInput ? 'other' : value;

  const fullOptions: SelectOption[] = [
    ...options,
    ...(!options.some((opt) => opt.value === 'other')
      ? [{ value: 'other', label: otherOptionLabel }]
      : [])
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <CustomSelect
        id={id}
        label={label}
        options={fullOptions}
        value={selectValue}
        onChange={handleSelectChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        triggerClassName={selectClassName}
      />

      {showOtherInput && (
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] animate-fade-in">
          <div className="w-6 h-6 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
            <Edit3 className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={customText}
            onChange={handleCustomTextChange}
            placeholder={otherPlaceholder}
            disabled={disabled}
            autoFocus
            className={`flex-1 bg-transparent px-2 py-1 text-xs text-[var(--input-text)] placeholder:text-[var(--text-secondary)] focus:outline-hidden ${inputClassName}`}
          />
        </div>
      )}
    </div>
  );
};
