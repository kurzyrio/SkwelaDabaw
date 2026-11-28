import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, Link2, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { extractThemeIdFromUrl } from '../../services/themeDownloadService';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export interface ThemeQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetectedThemeId: (themeId: string) => void;
}

export const ThemeQrScannerModal: React.FC<ThemeQrScannerModalProps> = ({
  isOpen,
  onClose,
  onDetectedThemeId
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const hasDetectedRef = useRef(false);

  useBackHandler(isOpen, onClose, BackPriority.MODAL, 'theme_qr_scanner_modal');
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    hasDetectedRef.current = false;
    setCameraError(null);
    setManualError(null);

    let cancelled = false;
    const containerId = 'skwela-theme-qr-reader';

    const startScanner = async () => {
      try {
        await new Promise((r) => setTimeout(r, 120));
        if (cancelled || !document.getElementById(containerId)) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (hasDetectedRef.current) return;
            const extracted = extractThemeIdFromUrl(decodedText);
            if (extracted) {
              hasDetectedRef.current = true;
              scanner.stop().catch(() => {});
              onDetectedThemeId(extracted);
              onClose();
            } else {
              setManualError('QR code is not a valid theme.kurzyrio.dev theme.');
            }
          },
          () => {}
        );
      } catch (err: any) {
        if (!cancelled) {
          setCameraError(err?.message || 'Camera unavailable. Paste a theme link or ID below.');
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (active) {
        active.stop().then(() => active.clear()).catch(() => {});
      }
    };
  }, [isOpen, onClose, onDetectedThemeId]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const trimmed = manualInput.trim();
    if (!trimmed) return;

    const extracted = extractThemeIdFromUrl(trimmed) ||
      (/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed) ? trimmed : null);

    if (!extracted) {
      setManualError('Enter a valid theme link or theme ID from theme.kurzyrio.dev.');
      return;
    }
    setManualInput('');
    onDetectedThemeId(extracted);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] shadow-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--accent-color)]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Scan Theme QR</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">From theme.kurzyrio.dev</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="w-8 h-8 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer pressable"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport */}
        {!cameraError ? (
          <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-black aspect-square max-h-64 w-full mx-auto">
            <div id="skwela-theme-qr-reader" className="w-full h-full" />
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-center space-y-1.5">
            <AlertCircle className="w-5 h-5 text-[var(--text-secondary)] mx-auto" />
            <p className="text-xs text-[var(--text-secondary)]">{cameraError}</p>
          </div>
        )}

        {/* Direct Link / Theme ID Fallback */}
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste theme link or ID…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-xs text-[var(--input-text)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-color)]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] cursor-pointer pressable shrink-0"
            >
              Load
            </button>
          </div>
          {manualError && (
            <p className="text-[11px] font-medium text-rose-500 px-1">{manualError}</p>
          )}
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ThemeQrScannerModal;
