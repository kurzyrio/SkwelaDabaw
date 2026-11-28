/**
 * SkwelaDabaw — Zero-Leak Dual-Engine QR Camera & Image Decoder
 *
 * Guarantees deterministic hardware camera release on Android WebView & Web:
 * 1. Directly owns MediaStreamTrack references in a global registry.
 * 2. Prevents async getUserMedia race conditions via monotonic session IDs.
 * 3. Automatically kills all active camera tracks on visibilitychange, pagehide,
 *    Capacitor appStateChange (background), and native Android onPause/onStop.
 * 4. Decodes full-frame HD video via native BarcodeDetector (Android WebView ML Kit)
 *    with automatic dual-pass jsQR fallback (normal + inverted + center-crop).
 */

import jsQR from 'jsqr';
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { App as CapacitorApp } from '@capacitor/app';

export type QrFacingMode = 'environment' | 'user';

export interface QrCameraController {
  stop: () => void;
  setTorch: (enabled: boolean) => Promise<boolean>;
  supportsTorch: boolean;
  facingMode: QrFacingMode;
  isActive: () => boolean;
}

export interface StartQrCameraOptions {
  videoEl: HTMLVideoElement;
  facingMode?: QrFacingMode;
  /**
   * Called when a QR code is decoded.
   * Return `true` (or void) to accept the scan (camera stops IMMEDIATELY before/on accept).
   * Return `false` if the QR payload is not valid for this scanner and scanning should continue.
   */
  onDecode: (decodedText: string) => boolean | void;
  onStatusChange?: (active: boolean) => void;
}

// Global hardware stream registry — guarantees zero orphaned tracks anywhere in the app
const activeStreams = new Set<MediaStream>();
const activeControllers = new Set<QrCameraController>();
let globalLaunchSeq = 0;
let lifecycleListenersRegistered = false;
let isRequestingCameraPermission = false;

function stopMediaStreamCompletely(stream: MediaStream | null | undefined, videoEl?: HTMLVideoElement | null): void {
  if (stream) {
    try {
      const tracks = stream.getTracks();
      for (const track of tracks) {
        try {
          // Best-effort turn off torch before stopping track
          if (track.kind === 'video' && typeof track.applyConstraints === 'function') {
            track.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
          }
        } catch {}
        try {
          track.enabled = false;
        } catch {}
        try {
          track.stop();
        } catch {}
      }
    } catch {}
    activeStreams.delete(stream);
  }

  if (videoEl) {
    try {
      const attached = videoEl.srcObject as MediaStream | null;
      if (attached && attached !== stream) {
        attached.getTracks().forEach((t) => {
          try { t.enabled = false; } catch {}
          try { t.stop(); } catch {}
        });
        activeStreams.delete(attached);
      }
      videoEl.pause();
      videoEl.srcObject = null;
      videoEl.removeAttribute('src');
      // Force Chromium WebMediaPlayer on Android WebView to release Camera2 HAL immediately
      videoEl.load();
    } catch {}
  }
}

/**
 * Immediately terminates EVERY active QR camera stream across the entire application.
 * Safe to call multiple times synchronously.
 */
export function forceStopAllQrCameras(): void {
  globalLaunchSeq++;

  const controllers = Array.from(activeControllers);
  activeControllers.clear();
  for (const ctrl of controllers) {
    try {
      ctrl.stop();
    } catch {}
  }

  const streams = Array.from(activeStreams);
  activeStreams.clear();
  for (const stream of streams) {
    stopMediaStreamCompletely(stream);
  }

  // Defensive sweep: detach any stray <video data-qr-video="true"> elements in DOM
  if (typeof document !== 'undefined') {
    document.querySelectorAll<HTMLVideoElement>('video[data-qr-video="true"]').forEach((vid) => {
      stopMediaStreamCompletely(vid.srcObject as MediaStream | null, vid);
    });
  }
}

function registerGlobalPrivacyKillSwitches(): void {
  if (lifecycleListenersRegistered || typeof window === 'undefined') return;
  lifecycleListenersRegistered = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      forceStopAllQrCameras();
    }
  });

  window.addEventListener('pagehide', () => {
    forceStopAllQrCameras();
  });

  window.addEventListener('beforeunload', () => {
    forceStopAllQrCameras();
  });

  // Dispatched directly from MainActivity.java onPause() / onStop()
  window.addEventListener('skwela:app-pause', () => {
    if (isRequestingCameraPermission) return;
    forceStopAllQrCameras();
  });

  if (Capacitor.isNativePlatform()) {
    try {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive && !isRequestingCameraPermission) {
          forceStopAllQrCameras();
        }
      });
    } catch {}
  }
}

registerGlobalPrivacyKillSwitches();

async function ensureCameraPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  isRequestingCameraPermission = true;
  try {
    const status = await CapacitorCamera.checkPermissions();
    if (status.camera === 'granted') return;
    const req = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
    if (req.camera !== 'granted') {
      throw new Error('Camera permission is required to scan QR codes. Please allow camera access in Settings.');
    }
  } catch (err: any) {
    if (err?.message && err.message.includes('Camera permission is required')) {
      throw err;
    }
    // Some Android OEMs throw on checkPermissions before WebView permission prompt — continue to getUserMedia
  } finally {
    isRequestingCameraPermission = false;
  }
}

async function acquireCameraStream(facingMode: QrFacingMode): Promise<MediaStream> {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    throw new Error('Camera streaming is unavailable on this device. Use Upload QR Image instead.');
  }

  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { exact: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: { facingMode },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];

  let lastErr: any = null;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      lastErr = err;
      // Do not retry if user explicitly denied permission
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        throw new Error('Camera permission was denied. Please enable Camera permission for SkwelaDabaw in Settings.');
      }
    }
  }

  throw new Error(lastErr?.message || 'Unable to start camera. Please check camera permissions or upload a QR image.');
}

function createNativeBarcodeDetector(): any | null {
  try {
    const BD = (window as any).BarcodeDetector;
    if (typeof BD === 'function') {
      return new BD({ formats: ['qr_code'] });
    }
  } catch {}
  return null;
}

/**
 * Starts a hardened, zero-leak QR scanning camera session bound directly to `videoEl`.
 */
export async function startQrCameraSession(options: StartQrCameraOptions): Promise<QrCameraController> {
  registerGlobalPrivacyKillSwitches();

  // Kill any pre-existing camera session before acquiring a new one
  forceStopAllQrCameras();
  const mySeq = ++globalLaunchSeq;
  const facingMode: QrFacingMode = options.facingMode || 'environment';
  const videoEl = options.videoEl;

  let stopped = false;
  let stream: MediaStream | null = null;
  let scanTimer: number | null = null;
  let decodingBusy = false;
  let supportsTorch = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (scanTimer !== null) {
      window.clearTimeout(scanTimer);
      scanTimer = null;
    }
    stopMediaStreamCompletely(stream, videoEl);
    stream = null;
    activeControllers.delete(controller);
    options.onStatusChange?.(false);
  };

  const setTorch = async (enabled: boolean): Promise<boolean> => {
    if (stopped || !stream || !supportsTorch) return false;
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== 'function') return false;
    try {
      await track.applyConstraints({ advanced: [{ torch: enabled } as any] });
      return true;
    } catch {
      return false;
    }
  };

  const controller: QrCameraController = {
    stop,
    setTorch,
    get supportsTorch() {
      return supportsTorch;
    },
    facingMode,
    isActive: () => !stopped && stream !== null,
  };

  activeControllers.add(controller);

  try {
    await ensureCameraPermission();

    // Check if caller cancelled/unmounted while waiting on permission dialog
    if (stopped || mySeq !== globalLaunchSeq || !videoEl.isConnected) {
      stop();
      throw new Error('CANCELLED');
    }

    const acquired = await acquireCameraStream(facingMode);

    // CRITICAL PRIVACY GUARD: If modal closed or component unmounted while getUserMedia was pending,
    // immediately destroy the acquired hardware stream so camera LED turns OFF instantly.
    if (stopped || mySeq !== globalLaunchSeq || !videoEl.isConnected || document.hidden) {
      stopMediaStreamCompletely(acquired, videoEl);
      stop();
      throw new Error('CANCELLED');
    }

    stream = acquired;
    activeStreams.add(stream);

    // Configure continuous autofocus & detect torch capability
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const caps: any = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
        if (caps?.torch) {
          supportsTorch = true;
        }
        if (Array.isArray(caps?.focusMode) && caps.focusMode.includes('continuous')) {
          videoTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] }).catch(() => {});
        }
      } catch {}

      // If OS revokes camera track externally, update UI cleanly
      videoTrack.addEventListener('ended', () => {
        stop();
      });
    }

    videoEl.setAttribute('data-qr-video', 'true');
    videoEl.playsInline = true;
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.srcObject = stream;

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timeout);
        resolve();
      };
      const timeout = window.setTimeout(finish, 2000);
      videoEl.addEventListener(
        'loadedmetadata',
        () => {
          videoEl.play().catch(() => {}).finally(finish);
        },
        { once: true }
      );
      videoEl.play().then(() => {
        if (videoEl.videoWidth > 0) finish();
      }).catch(() => {
        // Wait for loadedmetadata to retry play() cleanly
      });
    });

    if (stopped || mySeq !== globalLaunchSeq || !videoEl.isConnected) {
      stop();
      throw new Error('CANCELLED');
    }

    options.onStatusChange?.(true);

    // Start Dual-Engine Decode Loop
    const detector = createNativeBarcodeDetector();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let frameTick = 0;
    let lastRejectedText = '';
    let lastRejectedAt = 0;

    const handleDetected = (rawText: string) => {
      const clean = rawText.trim();
      if (!clean || stopped) return;

      // Debounce repeated invalid QR scans so error text doesn't flicker 10x/sec
      if (clean === lastRejectedText && Date.now() - lastRejectedAt < 1800) {
        return;
      }

      const accepted = options.onDecode(clean);
      if (accepted === false) {
        lastRejectedText = clean;
        lastRejectedAt = Date.now();
        return;
      }

      // Immediately kill camera hardware on accepted scan
      stop();
    };

    const scanOnce = async () => {
      if (stopped || !stream || !videoEl.isConnected) return;
      if (decodingBusy || videoEl.readyState < 2 || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
        if (!stopped) scanTimer = window.setTimeout(scanOnce, 90);
        return;
      }

      decodingBusy = true;
      frameTick++;

      try {
        let decoded: string | null = null;

        // Pass 1: Native Hardware-Accelerated BarcodeDetector (Android WebView ML Kit)
        if (detector) {
          try {
            const results = await detector.detect(videoEl);
            if (Array.isArray(results) && results.length > 0 && results[0]?.rawValue) {
              decoded = String(results[0].rawValue);
            }
          } catch {
            // Fall through cleanly to jsQR
          }
        }

        // Pass 2: High-accuracy jsQR fallback (3-zone cycle: full-frame, 72% crop, 50% tight crop + inverted QR support)
        if (!decoded && ctx) {
          const vw = videoEl.videoWidth;
          const vh = videoEl.videoHeight;
          const passMode = frameTick % 3;

          let sx = 0, sy = 0, sw = vw, sh = vh;
          let maxDim = 820;

          if (passMode === 1) {
            const cropEdge = Math.floor(Math.min(vw, vh) * 0.72);
            sx = Math.floor((vw - cropEdge) / 2);
            sy = Math.floor((vh - cropEdge) / 2);
            sw = cropEdge;
            sh = cropEdge;
            maxDim = 680;
          } else if (passMode === 2) {
            const cropEdge = Math.floor(Math.min(vw, vh) * 0.50);
            sx = Math.floor((vw - cropEdge) / 2);
            sy = Math.floor((vh - cropEdge) / 2);
            sw = cropEdge;
            sh = cropEdge;
            maxDim = 640;
          }

          const scale = Math.min(1, maxDim / Math.max(sw, sh));
          const tw = Math.max(120, Math.round(sw * scale));
          const th = Math.max(120, Math.round(sh * scale));

          if (canvas.width !== tw || canvas.height !== th) {
            canvas.width = tw;
            canvas.height = th;
          }

          ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, tw, th);
          const imageData = ctx.getImageData(0, 0, tw, th);
          const code = jsQR(imageData.data, tw, th, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            decoded = code.data;
          }
        }

        if (decoded && !stopped) {
          handleDetected(decoded);
        }
      } catch {
        // Ignore single-frame decode errors
      } finally {
        decodingBusy = false;
        if (!stopped) {
          scanTimer = window.setTimeout(scanOnce, 85);
        }
      }
    };

    scanTimer = window.setTimeout(scanOnce, 120);
    return controller;
  } catch (err) {
    stop();
    throw err;
  }
}

/**
 * High-reliability multi-pass QR decoder for uploaded screenshots & camera photos.
 * Never opens the live camera stream.
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read the selected image.'));
      el.src = objectUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) {
      throw new Error('Selected image appears empty or corrupted.');
    }

    // Pass 1: Native BarcodeDetector directly on the image
    const detector = createNativeBarcodeDetector();
    if (detector) {
      try {
        const res = await detector.detect(img);
        if (Array.isArray(res) && res.length > 0 && res[0]?.rawValue) {
          return String(res[0].rawValue).trim();
        }
      } catch {}
    }

    // Pass 2–4: Multi-scale & center-crop jsQR passes (handles high-res screenshots & inverted dark QRs)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tryRegion = (sx: number, sy: number, sw: number, sh: number, maxDim: number): string | null => {
      if (!ctx) return null;
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const tw = Math.max(120, Math.round(sw * scale));
      const th = Math.max(120, Math.round(sh * scale));
      canvas.width = tw;
      canvas.height = th;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, tw, th);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
      const data = ctx.getImageData(0, 0, tw, th);
      const found = jsQR(data.data, tw, th, { inversionAttempts: 'attemptBoth' });
      return found?.data ? found.data.trim() : null;
    };

    // Full image @ up to 1400px
    const p2 = tryRegion(0, 0, w, h, 1400);
    if (p2) return p2;

    // Downscaled full image @ 720px (cleans screenshot moiré / anti-aliasing)
    const p3 = tryRegion(0, 0, w, h, 720);
    if (p3) return p3;

    // Center 72% square crop (screenshots with header/footer chrome around QR)
    const minSide = Math.min(w, h);
    const crop = Math.floor(minSide * 0.78);
    const p4 = tryRegion(Math.floor((w - crop) / 2), Math.floor((h - crop) / 2), crop, crop, 900);
    if (p4) return p4;

    throw new Error('No readable QR code detected in this image. Make sure the QR code is clear and uncropped.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
