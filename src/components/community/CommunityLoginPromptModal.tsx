import React from 'react';
import { createPortal } from 'react-dom';
import { LogIn, X, ShieldCheck } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

interface CommunityLoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  actionName?: string;
}

export const CommunityLoginPromptModal: React.FC<CommunityLoginPromptModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  actionName = 'interact with posts'
}) => {
  useBackHandler(isOpen, onClose, BackPriority.MODAL, 'community_login_modal');

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm sheet-backdrop-enter select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl p-6 space-y-4 sheet-enter-spring text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/30">
          <LogIn className="w-7 h-7" />
        </div>

        <div className="space-y-1.5 pt-1">
          <h3 className="font-bold text-base text-[var(--text-primary)]">
            Student Sign-In Required
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-2">
            Guests can freely read campus posts. To {actionName}, please sign in with your Google account.
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignIn();
            }}
            className="w-full py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center justify-center gap-2 shadow-sm pressable hover:opacity-95 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
