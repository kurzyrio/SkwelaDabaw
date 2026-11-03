import React from 'react';
import { UserX, LogIn } from 'lucide-react';

interface SessionExpiredModalProps {
  isOpen: boolean;
  userName?: string;
  onReLogin: () => void;
  onContinueGuest: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  userName,
  onReLogin,
  onContinueGuest
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm sheet-backdrop-enter">
      <div className="bg-[var(--card-bg)] w-full max-w-sm rounded-3xl border border-[var(--card-border)] shadow-2xl p-6 text-center space-y-5 sheet-enter-spring">
        {/* Minimalist Icon Badge */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
          <UserX className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-bold text-lg text-[var(--text-primary)]">
            Session Expired
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {userName ? `Hi ${userName}, your` : 'Your'} account session was not found on the server or an update is required. Please sign in again with Google to sync your account.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onReLogin}
            className="w-full py-3.5 px-4 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all pressable"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>

          <button
            type="button"
            onClick={onContinueGuest}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
