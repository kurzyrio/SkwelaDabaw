import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  QrCode,
  Link2,
  AlertCircle,
  Camera,
  CameraOff,
  Flashlight,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { extractThemeIdFromUrl } from '../../services/themeDownloadService';
import {
  startQrCameraSession,
  forceStopAllQrCameras,
  decodeQrFromImageFile,
  QrCameraController,
  QrFacingMode
} from '../../services/qrCameraEngine';
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<QrCameraController | null>(null);
  const onCloseRef = useRef(onClose);
  const onDetectedRef = useRef(onDetectedThemeId);
  const hasDetectedRef = useRef(false);

  onCloseRef.current = onClose;
  onDetectedRef.current = onDetectedThemeId;

  const [facingMode, setFacingMode] = useState<QrFacingMode>('environment');
  const [cameraWanted, setCameraWanted] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [supportsTorch, setSupportsTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const stopCameraImmediately = useCallback(() => {
    const active = controllerRef.current;
    controllerRef.current = null;
    if (active) {
      active.stop();
    }
    forceStopAllQrCameras();
    setIsCameraActive(false);
    setIsStarting(false);
    setTorchOn(false);
    setSupportsTorch(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCameraImmediately();
    onCloseRef.current();
  }, [stopCameraImmediately]);

  useBackHandler(isOpen, handleClose, BackPriority.MODAL, 'theme_qr_scanner_modal');
  useBodyScrollLock(isOpen);

  // Reset modal state whenever opened; guarantee hardware kill whenever closed
  useEffect(() => {
    if (isOpen) {
      hasDetectedRef.current = false;
      setCameraError(null);
      setManualError(null);
      setCameraWanted(true);
    } else {
      stopCameraImmediately();
    }
  }, [isOpen, stopCameraImmediately]);

  // Manage live camera session strictly from [isOpen, cameraWanted, facingMode]
  useEffect(() => {
    if (!isOpen || !cameraWanted) {
      stopCameraImmediately();
      return;
    }

    let cancelled = false;
    setCameraError(null);
    setIsStarting(true);

    const launch = async () => {
      // Wait a frame so Portal <video> ref is connected
      await new Promise((r) => setTimeout(r, 60));
      if (cancelled || !videoRef.current) {
        if (!cancelled) setIsStarting(false);
        return;
      }

      try {
        const controller = await startQrCameraSession({
          videoEl: videoRef.current,
          facingMode,
          onStatusChange: (active) => {
            if (!cancelled) {
              setIsCameraActive(active);
              if (!active) {
                setTorchOn(false);
                setSupportsTorch(false);
              }
            }
          },
          onDecode: (decodedText) => {
            if (hasDetectedRef.current) return true;
            const extracted = extractThemeIdFromUrl(decodedText);
            if (!extracted) {
              setManualError('QR code is not a valid theme.kurzyrio.dev theme.');
              return false;
            }
            hasDetectedRef.current = true;
            stopCameraImmediately();
            onDetectedRef.current(extracted);
            onCloseRef.current();
            return true;
          }
        });

        if (cancelled) {
          controller.stop();
          forceStopAllQrCameras();
          return;
        }

        controllerRef.current = controller;
        setSupportsTorch(controller.supportsTorch);
        setIsCameraActive(true);
        setIsStarting(false);
      } catch (err: any) {
        if (cancelled || err?.message === 'CANCELLED') return;
        setIsStarting(false);
        setIsCameraActive(false);
        setCameraError(err?.message || 'Camera unavailable. Upload a QR screenshot or paste a link below.');
      }
    };

    launch();

    return () => {
      cancelled = true;
      stopCameraImmediately();
    };
  }, [isOpen, cameraWanted, facingMode, stopCameraImmediately]);

  // Extra safety net on component unmount
  useEffect(() => {
    return () => {
      forceStopAllQrCameras();
    };
  }, []);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleToggleTorch = async () => {
    if (!controllerRef.current) return;
    const next = !torchOn;
    const ok = await controllerRef.current.setTorch(next);
    if (ok) setTorchOn(next);
  };

  const handleFlipCamera = () => {
    stopCameraImmediately();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setCameraWanted(true);
  };

  const handleTurnOffCamera = () => {
    setCameraWanted(false);
    stopCameraImmediately();
  };

  const handleTurnOnCamera = () => {
    setCameraError(null);
    setManualError(null);
    setCameraWanted(true);
  };

  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setManualError(null);
    try {
      const decoded = await decodeQrFromImageFile(file);
      const extracted = extractThemeIdFromUrl(decoded);
      if (!extracted) {
        setManualError('This QR image is not a valid theme.kurzyrio.dev theme.');
        return;
      }
      hasDetectedRef.current = true;
      stopCameraImmediately();
      onDetectedRef.current(extracted);
      onCloseRef.current();
    } catch (err: any) {
      setManualError(err?.message || 'No readable QR code found in this image.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const trimmed = manualInput.trim();
    if (!trimmed) return;

    const extracted =
      extractThemeIdFromUrl(trimmed) ||
      (/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed) ? trimmed : null);

    if (!extracted) {
      setManualError('Enter a valid theme link or theme ID from theme.kurzyrio.dev.');
      return;
    }
    setManualInput('');
    stopCameraImmediately();
    onDetectedRef.current(extracted);
    onCloseRef.current();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none"
      onClick={handleClose}
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

          <div className="flex items-center gap-2">
            {isCameraActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Camera On
              </span>
            )}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close scanner"
              className="w-8 h-8 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer pressable"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Viewport */}
        <div className="relative rounded-2xl overflow-hidden border border-[var(--card-border)] bg-black aspect-square max-h-64 w-full mx-auto">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />

          {/* Subtle Viewfinder Guides while scanning */}
          {isCameraActive && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-44 h-44 relative">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/90 rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/90 rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/90 rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/90 rounded-br-lg" />
              </div>
            </div>
          )}

          {/* Starting state */}
          {isStarting && !cameraError && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 text-zinc-200">
              <span className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Starting camera...</span>
            </div>
          )}

          {/* Camera Off state */}
          {!cameraWanted && !cameraError && (
            <div className="absolute inset-0 bg-[var(--nested-bg)] flex flex-col items-center justify-center gap-3 p-4 text-center">
              <div className="w-11 h-11 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)]">
                <CameraOff className="w-5 h-5" />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Camera is turned off</p>
              <button
                type="button"
                onClick={handleTurnOnCamera}
                className="px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center gap-1.5 pressable cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                Turn On Camera
              </button>
            </div>
          )}

          {/* Error state */}
          {cameraError && (
            <div className="absolute inset-0 bg-[var(--nested-bg)] flex flex-col items-center justify-center text-center gap-2.5 p-4">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={handleTurnOnCamera}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold pressable cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Camera Controls & Upload QR */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {isCameraActive && supportsTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 pressable cursor-pointer ${
                  torchOn
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                    : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-primary)]'
                }`}
              >
                <Flashlight className="w-3.5 h-3.5" />
                <span>{torchOn ? 'Flash On' : 'Flash'}</span>
              </button>
            )}
            {isCameraActive && (
              <>
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center gap-1.5 pressable cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Flip</span>
                </button>
                <button
                  type="button"
                  onClick={handleTurnOffCamera}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center gap-1.5 pressable cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Off</span>
                </button>
              </>
            )}
          </div>

          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 pressable ml-auto">
            <ImageIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Upload QR</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleScanImageFile}
              className="hidden"
            />
          </label>
        </div>

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
