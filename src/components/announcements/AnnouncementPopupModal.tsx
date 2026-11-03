import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Heart, AlertTriangle, Bell, Clock, Calendar, ShieldAlert } from 'lucide-react';
import { PopupAnnouncement, snoozeAnnouncement, dismissAnnouncement } from '../../services/announcementService';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { playEagleSound } from '../../utils/audio';

interface AnnouncementPopupModalProps {
  announcement: PopupAnnouncement;
  onClose: () => void;
}

export const AnnouncementPopupModal: React.FC<AnnouncementPopupModalProps> = ({
  announcement,
  onClose
}) => {
  // Dismiss modal on Android physical Back press
  useBackHandler(true, onClose, BackPriority.MODAL, 'announcement_popup');

  const [dontShowToday, setDontShowToday] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClose = () => {
    if (dontShowToday) {
      snoozeAnnouncement(announcement.id, 24);
    } else {
      dismissAnnouncement(announcement.id);
    }
    onClose();
  };

  const handleActionClick = () => {
    if (announcement.actionUrl) {
      playEagleSound('chirp');
      if (dontShowToday) {
        snoozeAnnouncement(announcement.id, 24);
      }
      try {
        window.open(announcement.actionUrl, '_blank', 'noopener,noreferrer');
      } catch {
        window.location.href = announcement.actionUrl;
      }
    }
  };

  const getCategoryBadge = () => {
    const cat = (announcement.category || 'general').toLowerCase();
    const isUrgent = (announcement.priority || '').toLowerCase() === 'urgent';

    if (isUrgent) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          Urgent Advisory
        </span>
      );
    }

    if (cat.includes('relief') || cat.includes('donation') || cat.includes('help')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
          Community Relief Drive
        </span>
      );
    }

    if (cat.includes('suspension') || cat.includes('weather') || cat.includes('rain')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          Class Advisory
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--btn-primary-bg)]/10 text-[var(--text-primary)] border border-[var(--card-border)]">
        <Bell className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        Campus Bulletin
      </span>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm sheet-backdrop-enter select-none"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 sheet-enter-spring max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {getCategoryBadge()}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--nested-bg)] border border-[var(--card-border)] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Poster / Photo stored in MySQL */}
        {announcement.imageData && !imageError && (
          <div className="w-full rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-[var(--card-border)] flex items-center justify-center max-h-72 sm:max-h-80">
            <img
              src={announcement.imageData}
              alt={announcement.title}
              onError={() => setImageError(true)}
              className="w-full h-auto max-h-72 sm:max-h-80 object-contain rounded-2xl select-none"
              loading="lazy"
            />
          </div>
        )}

        {/* Title & Body */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight leading-snug">
            {announcement.title}
          </h3>

          <div className="text-xs sm:text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1">
            {announcement.content}
          </div>

          {announcement.authorName && (
            <p className="text-[11px] text-[var(--text-tertiary,var(--text-secondary))] pt-1 flex items-center gap-1.5 opacity-80">
              <Calendar className="w-3 h-3" />
              <span>Posted by {announcement.authorName}</span>
            </p>
          )}
        </div>

        {/* Action Button & Snooze Checkbox */}
        <div className="space-y-3 pt-2 mt-auto">
          {announcement.actionUrl && (
            <button
              type="button"
              onClick={handleActionClick}
              className="w-full py-3 px-4 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 pressable cursor-pointer hover:opacity-95 transition-opacity"
            >
              <span>{announcement.actionText || 'Open Link / Details'}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <input
                type="checkbox"
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--card-border)] text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Don't show again today
              </span>
            </label>

            <button
              type="button"
              onClick={handleClose}
              className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
