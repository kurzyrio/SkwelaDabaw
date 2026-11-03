import React from 'react';
import { ArrowUpCircle, X } from 'lucide-react';
import { UpdateCheckResult } from '../../services/updateService';

interface UpdateBannerPillProps {
  updateInfo: UpdateCheckResult;
  onOpenDetails: () => void;
  onDismiss: () => void;
}

export const UpdateBannerPill: React.FC<UpdateBannerPillProps> = ({
  updateInfo,
  onOpenDetails,
  onDismiss
}) => {
  const handleOpen = () => {
    onOpenDetails();
  };

  return (
    <div className="fixed top-3 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-slide-down">
      <div 
        className="pointer-events-auto flex items-center gap-3 pl-3 pr-2 py-2 rounded-full bg-[var(--modal-bg)]/95 backdrop-blur-md border border-[var(--card-border)] shadow-xl transition-all max-w-sm sm:max-w-md w-full justify-between"
      >
        <div 
          onClick={handleOpen}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
        >
          <div className="w-7 h-7 rounded-full bg-[var(--btn-primary-bg)]/15 flex items-center justify-center shrink-0 text-[var(--btn-primary-bg)]">
            <ArrowUpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                Update Ready • v{updateInfo.latestVersion}
              </span>
              {updateInfo.sizeFormatted && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] shrink-0 font-medium">
                  {updateInfo.sizeFormatted}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              {updateInfo.title || 'Tap to view improvements and install'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpen}
            className="px-3 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Update
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors cursor-pointer"
            aria-label="Dismiss update banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
