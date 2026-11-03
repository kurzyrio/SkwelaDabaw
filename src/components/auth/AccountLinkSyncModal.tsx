import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, Smartphone, Check, X, ShieldAlert, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { UserAccountRecord } from '../../services/userService';
import { StudentAuthSession } from '../../services/authService';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';

export interface AccountLinkSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudUser: UserAccountRecord;
  guestSession: StudentAuthSession;
  localScheduleCount?: number;
  onRestoreCloud: () => void | Promise<void>;
  onSyncGuest: () => void | Promise<void>;
  isProcessing?: boolean;
}

export const AccountLinkSyncModal: React.FC<AccountLinkSyncModalProps> = ({
  isOpen,
  onClose,
  cloudUser,
  guestSession,
  localScheduleCount = 0,
  onRestoreCloud,
  onSyncGuest,
  isProcessing = false
}) => {
  useBackHandler(isOpen, onClose, BackPriority.MODAL, 'account_link_sync_modal');

  // Confirmation step state: null = viewing options, 'sync-guest' | 'use-existing' = confirming choice
  const [confirmingAction, setConfirmingAction] = useState<'sync-guest' | 'use-existing' | null>(null);

  if (!isOpen) return null;

  const getCampusName = (campusId: string) => {
    const found = DAVAO_CAMPUSES.find(c => c.id === campusId);
    return found ? (found.shortName || found.name) : campusId;
  };

  const cloudCampusName = getCampusName(cloudUser.campusId || 'addu-jacinto');
  const guestCampusName = getCampusName(guestSession.campusId || 'addu-jacinto');

  const handleExecuteConfirmedAction = () => {
    if (confirmingAction === 'sync-guest') {
      onSyncGuest();
    } else if (confirmingAction === 'use-existing') {
      onRestoreCloud();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm sheet-backdrop-enter select-none overscroll-none touch-none"
      onClick={isProcessing ? undefined : onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl p-5 sm:p-6 space-y-5 sheet-enter-spring max-h-[90vh] flex flex-col overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Step 1: Option Selection */}
        {!confirmingAction ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    Existing Account Found
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {cloudUser.email || 'Cloud account data detected'}
                  </p>
                </div>
              </div>
              {!isProcessing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This Google account is already registered in our database. Choose how you want to handle existing saved data:
            </p>

            {/* Options Stack */}
            <div className="space-y-3 overflow-y-auto pr-0.5 -mr-0.5">
              {/* Option 1: Sync from Guest Account */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmingAction('sync-guest')}
                className="w-full text-left p-3.5 rounded-2xl border border-[var(--card-border)] hover:border-emerald-500/50 bg-[var(--card-bg)] hover:bg-emerald-500/5 transition-all space-y-2 group cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-[var(--text-primary)]">
                      Option 1: Sync from Guest Account
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    Sync Guest
                  </span>
                </div>

                <div className="bg-[var(--nested-bg)] rounded-xl p-2.5 space-y-1 text-[11px] text-[var(--text-secondary)] border border-[var(--card-border)]/60">
                  <div className="flex items-center justify-between">
                    <span>Guest Campus:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{guestCampusName}</span>
                  </div>
                  {guestSession.course && (
                    <div className="flex items-center justify-between">
                      <span>Guest Course:</span>
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{guestSession.course}</span>
                    </div>
                  )}
                  {localScheduleCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Local Schedules:</span>
                      <span className="font-semibold text-emerald-500">{localScheduleCount} class{localScheduleCount > 1 ? 'es' : ''} to upload</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Overwrites the existing account's preferences and timetable with your current Guest session data. (Existing Display Name and Username are strictly locked and preserved).
                </p>
              </button>

              {/* Option 2: Use Existing Account Data */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmingAction('use-existing')}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-[var(--brand-primary)]/40 hover:border-[var(--brand-primary)] bg-[var(--card-bg)] hover:bg-[var(--brand-primary)]/5 transition-all space-y-2 group cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] flex items-center justify-center">
                      <Cloud className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-[var(--text-primary)]">
                      Option 2: Use Existing Account Data
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                    Keep Cloud
                  </span>
                </div>

                <div className="bg-[var(--nested-bg)] rounded-xl p-2.5 space-y-1 text-[11px] text-[var(--text-secondary)] border border-[var(--card-border)]/60">
                  <div className="flex items-center justify-between">
                    <span>Profile:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {cloudUser.displayName || 'Registered Student'} {cloudUser.username ? `(@${cloudUser.username})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Campus:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{cloudCampusName}</span>
                  </div>
                  {cloudUser.course && (
                    <div className="flex items-center justify-between">
                      <span>Course:</span>
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{cloudUser.course}</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Discards temporary Guest settings and loads the existing account's saved timetable and preferences from the cloud.
                </p>
              </button>
            </div>

            {/* Footer */}
            <div className="pt-1 flex items-center justify-between gap-3 border-t border-[var(--card-border)]/60">
              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {isProcessing && (
                <span className="text-xs text-[var(--brand-primary)] font-semibold flex items-center gap-1.5 animate-pulse">
                  Processing account...
                </span>
              )}
            </div>
          </>
        ) : (
          /* Step 2: Explicit Confirmation Warning Step */
          <div className="space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Confirm Account Synchronization
                </h3>
                <p className="text-xs text-rose-500 font-semibold">
                  This action cannot be reverted!
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              {confirmingAction === 'sync-guest' ? (
                <>
                  <p className="font-medium text-[var(--text-primary)]">
                    You chose <strong>Option 1: Sync from Guest Account</strong>.
                  </p>
                  <p>
                    Your current local guest timetable and preferences will overwrite the existing cloud account.
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    ✓ Safety Guardrail: The existing account's Display Name and Username will remain locked to their database values and will NOT be altered.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-[var(--text-primary)]">
                    You chose <strong>Option 2: Use Existing Account Data</strong>.
                  </p>
                  <p>
                    All temporary guest settings and unsaved local schedules will be permanently discarded and replaced with the cloud account's saved data.
                  </p>
                </>
              )}
            </div>

            {/* Confirmation Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmingAction(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-[var(--text-primary)] font-semibold text-xs transition-all border border-[var(--card-border)] pressable cursor-pointer"
              >
                Go Back
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteConfirmedAction}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white transition-all shadow-md pressable cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  confirmingAction === 'sync-guest'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {isProcessing ? (
                  <span>Syncing...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm &amp; Proceed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AccountLinkSyncModal;
