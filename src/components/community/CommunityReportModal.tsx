import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, ShieldAlert, Check } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { CommunityPost } from '../../services/communityService';

export interface CommunityReportModalProps {
  isOpen: boolean;
  post: CommunityPost | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

const REPORT_CATEGORIES = [
  'Harassment or Bullying',
  'Inappropriate or Explicit Content',
  'Spam, Scam, or Misleading Info',
  'Hate Speech or Disrespect',
  'Academic Dishonesty / Cheating',
  'Other Guidelines Violation'
];

export const CommunityReportModal: React.FC<CommunityReportModalProps> = ({
  isOpen,
  post,
  onClose,
  onSubmit,
  isSubmitting = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const [additionalDetails, setAdditionalDetails] = useState<string>('');

  useBackHandler(isOpen, onClose, BackPriority.MODAL, 'community_report_modal');

  if (!isOpen || !post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = additionalDetails.trim()
      ? `${selectedCategory}: ${additionalDetails.trim()}`
      : selectedCategory;
    onSubmit(finalReason);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm sheet-backdrop-enter select-none"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-md bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl p-5 sm:p-6 space-y-4 sheet-enter-spring max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                Report Discussion
              </h3>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                Post by @{post.authorName || 'student'}
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Please select the reason that best describes why this post violates community guidelines:
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-0.5">
          {/* Reason Pills / Options */}
          <div className="space-y-1.5">
            {REPORT_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40'
                  }`}
                >
                  <span>{cat}</span>
                  {isSelected && <Check className="w-4 h-4 shrink-0 text-[var(--brand-primary)]" />}
                </button>
              );
            })}
          </div>

          {/* Additional Context */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Additional Details (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={250}
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="Provide extra context for moderators..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--card-border)]/60">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm pressable cursor-pointer disabled:opacity-60 transition-all"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
