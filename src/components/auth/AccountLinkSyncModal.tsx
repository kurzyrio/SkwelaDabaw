import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, Smartphone, Compass, UserPlus, Check, X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { UserAccountRecord } from '../../services/userService';
import { StudentAuthSession } from '../../services/authService';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';

export interface AccountLinkSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'existing-account' | 'new-account';
  cloudUser?: UserAccountRecord | null;
  googleSession?: StudentAuthSession | null;
  guestSession: StudentAuthSession;
  localScheduleCount?: number;
  guestDataCounts?: {
    schedules: number;
    tasks: number;
    routines: number;
    expenses: number;
    grades: number;
  };
  onRestoreCloud?: () => void | Promise<void>;
  onSyncGuest: () => void | Promise<void>;
  onStartFresh?: () => void | Promise<void>;
  isProcessing?: boolean;
}

type ConfirmAction = 'sync-guest' | 'use-existing' | 'start-fresh' | null;

export const AccountLinkSyncModal: React.FC<AccountLinkSyncModalProps> = ({
  isOpen,
  onClose,
  mode = 'existing-account',
  cloudUser,
  googleSession,
  guestSession,
  localScheduleCount = 0,
  guestDataCounts,
  onRestoreCloud,
  onSyncGuest,
  onStartFresh,
  isProcessing = false
}) => {
  const [confirmingAction, setConfirmingAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    setConfirmingAction(null);
  }, [isOpen]);

  useBackHandler(
    isOpen,
    () => {
      if (isProcessing) return;
      if (confirmingAction) {
        setConfirmingAction(null);
      } else {
        onClose();
      }
    },
    BackPriority.MODAL,
    'account_link_sync_modal'
  );

  if (!isOpen) return null;

  const isNewAccount = mode === 'new-account';

  const getCampusName = (campusId: string) => {
    if (!campusId) return '';
    const found = DAVAO_CAMPUSES.find((c) => c.id === campusId);
    return found ? (found.shortName || found.name) : campusId;
  };

  const cloudCampusName = getCampusName(cloudUser?.campusId || '') || 'Not set';
  const guestCampusName = getCampusName(guestSession.campusId || '') || 'Not set';

  const scheduleCount = guestDataCounts ? guestDataCounts.schedules : localScheduleCount;
  const taskCount = guestDataCounts?.tasks || 0;
  const routineCount = guestDataCounts?.routines || 0;
  const expenseCount = guestDataCounts?.expenses || 0;
  const gradeCount = guestDataCounts?.grades || 0;

  const savedParts: string[] = [];
  if (scheduleCount > 0) savedParts.push(`${scheduleCount} ${scheduleCount === 1 ? 'class' : 'classes'}`);
  if (taskCount > 0) savedParts.push(`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`);
  if (routineCount > 0) savedParts.push(`${routineCount} ${routineCount === 1 ? 'routine' : 'routines'}`);
  if (expenseCount > 0) savedParts.push(`${expenseCount} ${expenseCount === 1 ? 'expense' : 'expenses'}`);
  if (gradeCount > 0) savedParts.push(`${gradeCount} ${gradeCount === 1 ? 'grade' : 'grades'}`);

  const guestDataSummary = savedParts.length > 0 ? savedParts.join(', ') : 'None yet';

  const handleExecuteConfirmedAction = () => {
    if (confirmingAction === 'sync-guest') {
      onSyncGuest();
    } else if (confirmingAction === 'use-existing') {
      onRestoreCloud?.();
    } else if (confirmingAction === 'start-fresh') {
      onStartFresh?.();
    }
  };

  const confirmHeading = confirmingAction === 'start-fresh'
    ? 'Confirm Fresh Onboarding'
    : confirmingAction === 'use-existing'
    ? 'Confirm Cloud Restore'
    : isNewAccount
    ? 'Confirm Guest Data Sync'
    : 'Confirm Account Synchronization';

  const confirmButtonClass =
    confirmingAction === 'sync-guest'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : confirmingAction === 'start-fresh'
      ? 'bg-amber-600 hover:bg-amber-700'
      : 'bg-sky-600 hover:bg-sky-700';

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
        {!confirmingAction ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                    isNewAccount
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                  }`}
                >
                  {isNewAccount ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-[var(--text-primary)] truncate">
                    {isNewAccount ? 'Link Google Account' : 'Existing Account Found'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {isNewAccount
                      ? (googleSession?.email || 'New SkwelaDabaw account')
                      : (cloudUser?.email || googleSession?.email || 'Cloud account data detected')}
                  </p>
                </div>
              </div>
              {!isProcessing && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {isNewAccount
                ? 'Choose whether to keep your Guest data or start fresh with onboarding.'
                : 'This Google account is already registered. Choose which data to keep:'}
            </p>

            {/* Options Stack */}
            <div className="space-y-3 overflow-y-auto pr-0.5 -mr-0.5">
              {/* Option 1: Keep & Sync Guest Data */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmingAction('sync-guest')}
                className="w-full text-left p-4 rounded-2xl border border-[var(--card-border)] hover:border-emerald-500/50 bg-[var(--card-bg)] hover:bg-emerald-500/5 transition-all space-y-2.5 cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                      Keep &amp; Sync Guest Data
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 shrink-0">
                    Keep Guest
                  </span>
                </div>

                <div className="bg-[var(--nested-bg)] rounded-xl p-2.5 space-y-1 text-[11px] text-[var(--text-secondary)] border border-[var(--card-border)]/60">
                  <div className="flex items-center justify-between gap-2">
                    <span>Guest Campus:</span>
                    <span className="font-semibold text-[var(--text-primary)] truncate">{guestCampusName}</span>
                  </div>
                  {guestSession.course && (
                    <div className="flex items-center justify-between gap-2">
                      <span>Guest Course:</span>
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{guestSession.course}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span>Saved Data:</span>
                    <span className={`font-semibold text-right truncate max-w-[210px] ${savedParts.length > 0 ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                      {guestDataSummary}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {isNewAccount
                    ? 'Transfers your local Guest timetable, tasks, routines, expenses, grades, and preferences to your new Google account.'
                    : 'Replaces the existing account data with your current Guest session. Existing Display Name and Username remain locked.'}
                </p>
              </button>

              {/* Option 2: Start Fresh (New Account) OR Use Existing Account Data */}
              {isNewAccount ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setConfirmingAction('start-fresh')}
                  className="w-full text-left p-4 rounded-2xl border-2 border-[var(--brand-primary)]/40 hover:border-[var(--brand-primary)] bg-[var(--card-bg)] hover:bg-[var(--brand-primary)]/5 transition-all space-y-2.5 cursor-pointer disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] flex items-center justify-center shrink-0">
                        <Compass className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                        Start Fresh (Begin Onboarding)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--brand-primary)] shrink-0">
                      Fresh Start
                    </span>
                  </div>

                  <div className="bg-[var(--nested-bg)] rounded-xl p-2.5 space-y-1 text-[11px] text-[var(--text-secondary)] border border-[var(--card-border)]/60">
                    <div className="flex items-center justify-between gap-2">
                      <span>Google Account:</span>
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                        {googleSession?.name || 'New Student'}
                      </span>
                    </div>
                    {googleSession?.email && (
                      <div className="flex items-center justify-between gap-2">
                        <span>Email:</span>
                        <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                          {googleSession.email}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Discards temporary Guest data and starts clean account onboarding from the beginning (username, campus, course, and preferences).
                  </p>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setConfirmingAction('use-existing')}
                  className="w-full text-left p-4 rounded-2xl border-2 border-[var(--brand-primary)]/40 hover:border-[var(--brand-primary)] bg-[var(--card-bg)] hover:bg-[var(--brand-primary)]/5 transition-all space-y-2.5 cursor-pointer disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] flex items-center justify-center shrink-0">
                        <Cloud className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                        Use Existing Account Data
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--brand-primary)] shrink-0">
                      Keep Cloud
                    </span>
                  </div>

                  <div className="bg-[var(--nested-bg)] rounded-xl p-2.5 space-y-1 text-[11px] text-[var(--text-secondary)] border border-[var(--card-border)]/60">
                    <div className="flex items-center justify-between gap-2">
                      <span>Profile:</span>
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-[210px]">
                        {cloudUser?.displayName || googleSession?.name || 'Registered Student'}
                        {cloudUser?.username ? ` (@${cloudUser.username})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Campus:</span>
                      <span className="font-semibold text-[var(--text-primary)] truncate">{cloudCampusName}</span>
                    </div>
                    {cloudUser?.course && (
                      <div className="flex items-center justify-between gap-2">
                        <span>Course:</span>
                        <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{cloudUser.course}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Discards temporary Guest settings and loads the existing account&apos;s saved timetable and preferences from the cloud.
                  </p>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="pt-1 flex items-center justify-between gap-3 border-t border-[var(--card-border)]/60">
              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              {isProcessing && (
                <span className="text-xs text-[var(--brand-primary)] font-semibold animate-pulse">
                  Processing account...
                </span>
              )}
            </div>
          </>
        ) : (
          /* Step 2: Explicit Confirmation Step */
          <div className="space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {confirmHeading}
                </h3>
                <p className="text-xs text-rose-500 font-semibold">
                  This action cannot be reverted.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              {confirmingAction === 'sync-guest' ? (
                isNewAccount ? (
                  <>
                    <p className="font-medium text-[var(--text-primary)]">
                      You chose <strong>Keep &amp; Sync Guest Data</strong>.
                    </p>
                    <p>
                      Your local guest campus, course, timetable, tasks, routines, expenses, and grades will be synced to{' '}
                      <strong>{googleSession?.email || 'your new Google account'}</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-[var(--text-primary)]">
                      You chose <strong>Keep &amp; Sync Guest Data</strong>.
                    </p>
                    <p>
                      Your current local guest timetable, tasks, routines, expenses, grades, and preferences will overwrite the existing cloud account.
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      Safety Guardrail: The existing account&apos;s Display Name and Username remain locked to their database values and will NOT be altered.
                    </p>
                  </>
                )
              ) : confirmingAction === 'start-fresh' ? (
                <>
                  <p className="font-medium text-[var(--text-primary)]">
                    You chose <strong>Start Fresh (Begin Onboarding)</strong>.
                  </p>
                  <p>
                    All temporary guest data on this device ({guestDataSummary}) will be permanently cleared, and clean onboarding will begin for{' '}
                    <strong>{googleSession?.email || 'your new Google account'}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-[var(--text-primary)]">
                    You chose <strong>Use Existing Account Data</strong>.
                  </p>
                  <p>
                    All temporary guest settings and local guest records will be permanently discarded and replaced with the cloud account&apos;s saved data.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmingAction(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-[var(--text-primary)] font-semibold text-xs transition-all border border-[var(--card-border)] pressable cursor-pointer disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteConfirmedAction}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white transition-all shadow-md pressable cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${confirmButtonClass}`}
              >
                {isProcessing ? (
                  <span>Processing...</span>
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
