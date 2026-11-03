import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { EagleBuddy } from './EagleBuddy';
import { Tag, Download, RefreshCw, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { UpdateCheckResult, applyAppUpdate } from '../../services/updateService';
import { playEagleSound } from '../../utils/audio';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

interface AppUpdateModalProps {
  updateInfo: UpdateCheckResult;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  updateInfo,
  onClose
}) => {
  // Dismiss update modal on back press if not forced
  useBackHandler(!updateInfo.isForceUpdate, onClose, BackPriority.MODAL);
  
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadUpdate = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    playEagleSound('success');

    // Strictly target only the single authoritative latest versioned APK
    const targetUrl = updateInfo.apkUrl && updateInfo.apkUrl.includes(updateInfo.latestVersion)
      ? updateInfo.apkUrl
      : `https://skweladabaw.kurzyrio.site/downloads/SkwelaDabaw-v${updateInfo.latestVersion}.apk`;

    if (Capacitor.isNativePlatform()) {
      // On Android native app: open external browser / download manager cleanly via _system intent
      try {
        window.open(targetUrl, '_system');
      } catch {
        window.location.href = targetUrl;
      }
    } else {
      // In web browser: trigger a single clean download
      try {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.setAttribute('download', `SkwelaDabaw-v${updateInfo.latestVersion}.apk`);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.open(targetUrl, '_blank');
      }
    }

    // Lock download button for 5 seconds to eliminate duplicate intent triggers
    setTimeout(() => {
      setIsDownloading(false);
    }, 5000);
  };

  const handleNotNow = () => {
    try {
      localStorage.setItem('skwela_update_snoozed_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
      localStorage.setItem('skwela_update_snoozed_version', updateInfo.latestVersion);
    } catch {
      // ignore
    }
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
      onClick={() => {
        if (!updateInfo.isForceUpdate) handleNotNow();
      }}
    >
      <div 
        className="relative w-full max-w-md bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 sheet-enter-spring max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {!updateInfo.isForceUpdate && (
          <button
            type="button"
            onClick={handleNotNow}
            className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Mascot & Header */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center overflow-hidden">
              <EagleBuddy
                mood="celebrating"
                width={70}
                height={70}
                showSpeech={false}
                isAnimated={true}
                isTalking={true}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-[10px] shadow-xs flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>v{updateInfo.latestVersion}</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-center">
              {updateInfo.isOptional ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  Optional Update
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25">
                  <ShieldAlert className="w-3 h-3" />
                  Required Update
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
              {updateInfo.title || 'New Update Ready'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Current: v{updateInfo.currentVersion} ➔ Latest: v{updateInfo.latestVersion}
            </p>
          </div>
        </div>

        {/* Release Notes Card */}
        {updateInfo.releaseNotes && updateInfo.releaseNotes.length > 0 && (
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span>What's New in this Release:</span>
            </p>
            <ul className="space-y-1.5 text-xs text-[var(--text-primary)]">
              {updateInfo.releaseNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[var(--text-secondary)]">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadUpdate}
            disabled={isDownloading}
            className="w-full py-3.5 px-4 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center justify-center gap-2 pressable cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {isDownloading
                ? 'Opening Download...'
                : `Download Update${updateInfo.sizeFormatted ? ` • ${updateInfo.sizeFormatted}` : ''}`}
            </span>
          </button>

          {!updateInfo.isForceUpdate && (
            <button
              type="button"
              onClick={handleNotNow}
              className="w-full py-2.5 px-4 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-2 pressable transition-colors cursor-pointer"
            >
              <span>Maybe Later</span>
            </button>
          )}
        </div>

        {updateInfo.isForceUpdate && (
          <p className="text-[11px] text-[#FF453A] font-semibold text-center flex items-center justify-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>This is a required update for student services.</span>
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};
