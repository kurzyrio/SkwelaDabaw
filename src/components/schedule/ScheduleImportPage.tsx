import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft,
  QrCode, 
  Camera, 
  FileText, 
  FileJson, 
  Lightbulb, 
  Upload, 
  ImageIcon, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Clock, 
  MapPin, 
  Layers, 
  Copy, 
  CheckCheck, 
  ShieldAlert, 
  Cpu, 
  Server, 
  Lock
} from 'lucide-react';
import { ClassSchedule, DayOfWeek } from '../../types';
import { db } from '../../db';
import { 
  capturePhotoFromCamera, 
  analyzeErcWithAi,
  parseRawScheduleTextWithAi,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  AVAILABLE_OCR_MODELS,
  getPreferredOcrModel,
  setPreferredOcrModel,
  checkAiReachability,
  PROMPT_YOURSELF_TEMPLATE,
  AiReachabilityResult,
  UnreadableDetection,
  ScanSourceMode,
  PRESET_COLORS
} from '../../services/aiScheduleScanner';
import { backupSchedulesToCloud } from '../../services/userService';
import { getSavedSession } from '../../services/authService';
import { playEagleSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import { decodeScheduleFromQrPayload, fetchScheduleByCloudCode } from '../../services/shareService';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { 
  scheduleAllClassSchedulesReminders, 
  refreshUnremovableClassNotification 
} from '../../services/notificationService';
import { syncScheduleToWidgets } from '../../services/widgetService';
import { useBackHandler } from '../../hooks/useBackHandler';
import { BackPriority } from '../../services/navigationManager';

export interface ScheduleImportPageProps {
  onBack: () => void;
  onImportComplete?: () => void;
  initialCode?: string;
}

export const ScheduleImportPage: React.FC<ScheduleImportPageProps> = ({
  onBack,
  onImportComplete,
  initialCode
}) => {
  // Navigation & hardware back button handling
  useBackHandler(true, onBack, BackPriority.SUBVIEW, 'schedule_import_page');

  // Mode Selection
  const [importMode, setImportMode] = useState<'qr-scan' | 'camera' | 'text' | 'json' | 'prompt-guide'>('qr-scan');

  // QR Scanning States
  const [qrCameraError, setQrCameraError] = useState<string | null>(null);
  const [qrMetadata, setQrMetadata] = useState<{ student?: string; campus?: string } | null>(null);
  const [isQrCameraActive, setIsQrCameraActive] = useState<boolean>(false);
  const [isStartingQrCamera, setIsStartingQrCamera] = useState<boolean>(false);
  const [qrFacingMode, setQrFacingMode] = useState<'environment' | 'user'>('environment');
  const [qrPastedText, setQrPastedText] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCameraInputRef = useRef<HTMLInputElement>(null);

  // Parsing & Processing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<number>(0);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [parsedSchedules, setParsedSchedules] = useState<ClassSchedule[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Auto-select all parsed subjects on change
  useEffect(() => {
    setSelectedIndices(new Set(parsedSchedules.map((_, i) => i)));
  }, [parsedSchedules]);

  // AI & OCR States
  const [aiReachability, setAiReachability] = useState<AiReachabilityResult | null>(null);
  const [isCheckingAi, setIsCheckingAi] = useState<boolean>(true);
  const [promptCopied, setPromptCopied] = useState<boolean>(false);
  const [rawPortalText, setRawPortalText] = useState<string>('');
  const [jsonText, setJsonText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // API Key Configuration Modal / Drawer
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(getStoredGeminiApiKey);
  const [selectedModel, setSelectedModel] = useState<string>(getPreferredOcrModel);
  const [keySavedSuccess, setKeySavedSuccess] = useState<boolean>(false);

  // User Authentication & AI Quota
  const session = getSavedSession();
  const isLoggedIn = Boolean(session?.isLoggedIn);
  const userUid = session?.uid || 'guest';
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  const getDailyAiScans = (): number => {
    try {
      const key = `skweladabaw_daily_ai_scans_${userUid}_${getTodayDateStr()}`;
      const count = localStorage.getItem(key);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  };

  const [dailyScansUsed, setDailyScansUsed] = useState<number>(getDailyAiScans);
  const incrementDailyAiScans = () => {
    try {
      const key = `skweladabaw_daily_ai_scans_${userUid}_${getTodayDateStr()}`;
      const next = getDailyAiScans() + 1;
      localStorage.setItem(key, String(next));
      setDailyScansUsed(next);
    } catch (_) {}
  };

  // Cooldown Tracking
  const AI_COOLDOWN_MS = 5 * 60 * 1000;
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    const checkCooldown = () => {
      const lastScan = localStorage.getItem('last_ai_scan_timestamp');
      if (lastScan) {
        const elapsed = Date.now() - parseInt(lastScan, 10);
        if (elapsed < AI_COOLDOWN_MS) {
          setCooldownSeconds(Math.ceil((AI_COOLDOWN_MS - elapsed) / 1000));
          return;
        }
      }
      setCooldownSeconds(0);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAiAvailable = Boolean(aiReachability?.reachable);
  const isUsingDirectKey = aiReachability?.mode === 'direct';
  const isDailyLimitReached = !isUsingDirectKey && isLoggedIn && dailyScansUsed >= 5;
  const canScanAi = isAiAvailable && !isCheckingAi && (isUsingDirectKey || (!isDailyLimitReached && cooldownSeconds === 0));

  const probeAiReachability = () => {
    setIsCheckingAi(true);
    setErrorMessage(null);
    checkAiReachability().then((res) => {
      setAiReachability(res);
      setIsCheckingAi(false);
      if (!res.reachable && (importMode === 'camera' || importMode === 'text')) {
        setImportMode('qr-scan');
      }
    }).catch(() => {
      setAiReachability({ reachable: false, mode: 'none', message: 'AI backend offline' });
      setIsCheckingAi(false);
      if (importMode === 'camera' || importMode === 'text') {
        setImportMode('qr-scan');
      }
    });
  };

  // Probe AI reachability on mount
  useEffect(() => {
    probeAiReachability();
  }, []);

  const handleSelectAiMode = (targetMode: 'camera' | 'text') => {
    if (isCheckingAi) {
      setErrorMessage('Verifying scanner connection, please wait a moment...');
      return;
    }
    if (!isAiAvailable) {
      playEagleSound('alert');
      setErrorMessage(
        aiReachability?.message || 
        'Document scanner is currently unreachable. Please check your internet connection or use QR Code / JSON Import.'
      );
      return;
    }
    setImportMode(targetMode);
  };

  // Cleanup QR camera on unmount or tab switch
  useEffect(() => {
    return () => {
      stopQrCamera();
    };
  }, [importMode]);

  const stopQrCamera = async () => {
    setIsStartingQrCamera(false);
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('QR camera stop note:', err);
      }
      scannerRef.current = null;
    }
    setIsQrCameraActive(false);
  };

  const startQrCamera = async (facingModeOverride?: 'environment' | 'user') => {
    setQrCameraError(null);
    setIsStartingQrCamera(true);
    const targetMode = facingModeOverride || qrFacingMode;

    try {
      await stopQrCamera();

      // Check native permissions
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await CapacitorCamera.checkPermissions();
          if (status.camera !== 'granted') {
            const req = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
            if (req.camera !== 'granted') {
              setQrCameraError('Camera permission is required to scan QR codes. Please enable camera access in system settings.');
              setIsStartingQrCamera(false);
              return;
            }
          }
        } catch (_) {
          try {
            await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
          } catch (_) {}
        }
      }

      await new Promise((res) => setTimeout(res, 180));
      const container = document.getElementById('qr-reader-container');
      if (!container) {
        setIsStartingQrCamera(false);
        return;
      }

      const scanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = scanner;

      let cameraConfig: any = { facingMode: targetMode };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const matchedCam = devices.find((d) =>
            targetMode === 'environment'
              ? /back|rear|environment/i.test(d.label)
              : /front|user|selfie/i.test(d.label)
          );
          if (matchedCam && matchedCam.id) {
            cameraConfig = matchedCam.id;
          } else {
            cameraConfig = { facingMode: targetMode };
          }
        }
      } catch (_) {
        cameraConfig = { facingMode: targetMode };
      }

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (w, h) => {
            const edge = Math.floor(Math.min(w, h) * 0.75);
            return { width: Math.max(edge, 180), height: Math.max(edge, 180) };
          }
        },
        (decodedText) => {
          stopQrCamera();
          handleProcessDecodedString(decodedText);
        },
        () => {}
      );

      setIsQrCameraActive(true);
      setIsStartingQrCamera(false);
    } catch (e: any) {
      console.warn('QR camera start failed:', e);
      setQrCameraError(e?.message || 'Camera preview unavailable. Please verify permissions or upload a QR image.');
      setIsQrCameraActive(false);
      setIsStartingQrCamera(false);
    }
  };

  const toggleQrCameraFacing = async () => {
    const nextMode = qrFacingMode === 'environment' ? 'user' : 'environment';
    setQrFacingMode(nextMode);
    await stopQrCamera();
    setTimeout(() => {
      startQrCamera(nextMode);
    }, 200);
  };

  const handleProcessDecodedString = async (text: string) => {
    setErrorMessage(null);
    const trimmed = text.trim();

    // 1. Direct Cloud short-code (e.g. ID:K9X2M4 or raw 6-character code)
    if (trimmed.startsWith('ID:') || (/^[A-Z0-9]{6}$/i.test(trimmed) && !trimmed.includes('{') && !trimmed.includes('['))) {
      setIsProcessing(true);
      try {
        const cloudRes = await fetchScheduleByCloudCode(trimmed);
        if (cloudRes.success && cloudRes.schedules.length > 0) {
          setParsedSchedules(cloudRes.schedules);
          setQrMetadata({ student: cloudRes.studentName, campus: cloudRes.campusName });
          playEagleSound('success');
          confetti({ particleCount: 50, spread: 60 });
          return;
        } else {
          setErrorMessage(cloudRes.error || `Could not find schedule with code ${trimmed}`);
        }
      } catch (err: any) {
        setErrorMessage('Network error fetching schedule: ' + (err?.message || 'Please check connection.'));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // 2. Decode QR payload
    const qrRes = decodeScheduleFromQrPayload(text);
    if (qrRes.isCloudLookup && qrRes.shortCode) {
      setIsProcessing(true);
      try {
        const cloudRes = await fetchScheduleByCloudCode(qrRes.shortCode);
        if (cloudRes.success && cloudRes.schedules.length > 0) {
          setParsedSchedules(cloudRes.schedules);
          setQrMetadata({ student: cloudRes.studentName, campus: cloudRes.campusName });
          playEagleSound('success');
          confetti({ particleCount: 50, spread: 60 });
          return;
        } else {
          setErrorMessage(cloudRes.error || `Could not find schedule with code ${qrRes.shortCode}`);
        }
      } catch (err: any) {
        setErrorMessage('Network error fetching schedule: ' + (err?.message || 'Please check connection.'));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (qrRes.success && qrRes.schedules.length > 0) {
      setParsedSchedules(qrRes.schedules);
      setQrMetadata({ student: qrRes.studentName, campus: qrRes.campusName });
      playEagleSound('success');
      confetti({ particleCount: 50, spread: 60 });
    } else {
      parseJsonOrCsvContent(text);
    }
  };

  // Auto-process initial shared schedule code from deep link / App Link
  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      setImportMode('qr-scan');
      setQrPastedText(initialCode.trim());
      handleProcessDecodedString(initialCode.trim());
    }
  }, [initialCode]);

  const handleScanQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    try {
      let fileContainer = document.getElementById('qr-reader-file-container');
      if (!fileContainer) {
        fileContainer = document.createElement('div');
        fileContainer.id = 'qr-reader-file-container';
        fileContainer.style.position = 'absolute';
        fileContainer.style.left = '-9999px';
        fileContainer.style.top = '-9999px';
        fileContainer.style.width = '300px';
        fileContainer.style.height = '300px';
        document.body.appendChild(fileContainer);
      }

      const scanner = new Html5Qrcode('qr-reader-file-container');
      const decodedText = await scanner.scanFile(file, true);
      try {
        await scanner.clear();
      } catch (_) {}

      handleProcessDecodedString(decodedText);
    } catch (err) {
      console.warn('QR file scan error:', err);
      setErrorMessage('No valid SkwelaDabaw QR code detected in this photo. Please ensure the QR is well-lit and clear.');
    } finally {
      e.target.value = '';
    }
  };

  // AI Document OCR
  const handleLaunchCamera = async () => {
    if (!canScanAi) return;
    try {
      setErrorMessage(null);
      const result = await capturePhotoFromCamera();
      if (result) {
        runAiAnalysis(result.base64);
        return;
      }
    } catch (err) {
      console.warn('Native camera fallback:', err);
    }
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handlePickFromGallery = () => {
    if (!canScanAi) return;
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleFallbackFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      runAiAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runAiAnalysis = async (base64OrDataUrl: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessLogs([]);
    setProcessStep(1);

    const logs: string[] = [];
    const addLog = (msg: string, stepNum: number) => {
      logs.push(msg);
      setProcessLogs([...logs]);
      setProcessStep(stepNum);
    };

    try {
      const extracted = await analyzeErcWithAi(base64OrDataUrl, (msg, stepNum) => {
        addLog(msg, stepNum);
      });

      if (extracted && extracted.schedules.length > 0) {
        localStorage.setItem('last_ai_scan_timestamp', Date.now().toString());
        incrementDailyAiScans();
        setParsedSchedules(extracted.schedules);
        playEagleSound('success');
        confetti({ particleCount: 50, spread: 60 });
      } else {
        setErrorMessage('No valid timetable entries detected. Please ensure the course codes, days, and times are legible.');
      }
    } catch (err: any) {
      localStorage.removeItem('last_ai_scan_timestamp');
      setCooldownSeconds(0);
      setErrorMessage(err?.message || 'Failed to analyze schedule document. Please try again or use JSON / Text import.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Portal Text Parsing
  const handleParsePortalText = async () => {
    if (!rawPortalText.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await parseRawScheduleTextWithAi(rawPortalText);
      if (result && result.schedules && result.schedules.length > 0) {
        setParsedSchedules(result.schedules);
        playEagleSound('success');
        confetti({ particleCount: 50, spread: 60 });
      } else {
        setErrorMessage('Could not extract any timetable schedules from the pasted text. Please verify the copied contents.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse portal text. You can format it into JSON or use the Prompt Guide.');
    } finally {
      setIsProcessing(false);
    }
  };

  // JSON / CSV Parsing
  const parseJsonOrCsvContent = (content: string) => {
    setErrorMessage(null);
    try {
      let clean = content.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      // Check QR compact format or cloud code first
      if (clean.startsWith('ID:') || clean.startsWith('A1:') || clean.startsWith('Z1:') || clean.startsWith('SKWELA:') || (/^[A-Z0-9]{6}$/i.test(clean) && !clean.includes('{') && !clean.includes('['))) {
        handleProcessDecodedString(clean);
        return;
      }

      const qrRes = decodeScheduleFromQrPayload(clean);
      if (qrRes.success && qrRes.schedules.length > 0) {
        setParsedSchedules(qrRes.schedules);
        setQrMetadata({ student: qrRes.studentName, campus: qrRes.campusName });
        playEagleSound('success');
        confetti({ particleCount: 50, spread: 60 });
        return;
      }

      const parsed = JSON.parse(clean);
      const items: ClassSchedule[] = [];
      const rawList = Array.isArray(parsed) ? parsed : (parsed.schedules || parsed.classes || parsed.courses || [parsed]);

      const defaultReminder = Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;
      for (const item of rawList) {
        if (!item.subjectCode && !item.name && !item.code && !item.c && !item.n) continue;

        items.push({
          subjectCode: String(item.subjectCode || item.code || item.c || 'COURSE').toUpperCase().trim(),
          subjectName: String(item.subjectName || item.name || item.n || item.subjectCode || item.c || 'Enrolled Course').trim(),
          room: item.room || item.r || '',
          building: item.building || item.b || '',
          instructor: item.instructor || '',
          days: Array.isArray(item.days) && item.days.length > 0
            ? item.days
            : Array.isArray(item.d) && item.d.length > 0
            ? item.d
            : ['Monday', 'Wednesday', 'Friday'],
          startTime: item.startTime || item.s || '08:00',
          endTime: item.endTime || item.e || '09:30',
          units: Number(item.units || item.u) || 3,
          reminderMinutes: item.reminderMinutes !== undefined && item.reminderMinutes !== null
            ? Number(item.reminderMinutes)
            : defaultReminder,
          color: (item.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(item.color).trim()))
            ? String(item.color).trim()
            : PRESET_COLORS[items.length % PRESET_COLORS.length],
          notes: item.notes || ''
        });
      }

      if (items.length === 0) {
        setErrorMessage('JSON file did not contain any recognizable subject schedules.');
        return;
      }

      setParsedSchedules(items);
      playEagleSound('success');
      confetti({ particleCount: 50, spread: 60 });
    } catch (_) {
      // CSV Fallback
      const lines = content.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('course') || h.includes('subject'));
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('title'));
        const roomIdx = headers.findIndex(h => h.includes('room') || h.includes('venue'));
        const daysIdx = headers.findIndex(h => h.includes('day'));
        const startIdx = headers.findIndex(h => h.includes('start'));
        const endIdx = headers.findIndex(h => h.includes('end'));

        if (codeIdx !== -1 || nameIdx !== -1) {
          const items: ClassSchedule[] = [];
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
            if (!row[0]) continue;
            const subjectCode = (codeIdx !== -1 && row[codeIdx] ? row[codeIdx] : 'CLASS').toUpperCase().trim();
            const subjectName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : subjectCode;
            items.push({
              subjectCode,
              subjectName,
              room: roomIdx !== -1 && row[roomIdx] ? row[roomIdx] : '',
              days: ['Monday', 'Wednesday', 'Friday'],
              startTime: startIdx !== -1 && row[startIdx] ? row[startIdx] : '08:00',
              endTime: endIdx !== -1 && row[endIdx] ? row[endIdx] : '09:00',
              units: 3,
              color: PRESET_COLORS[items.length % PRESET_COLORS.length]
            });
          }

          if (items.length > 0) {
            setParsedSchedules(items);
            playEagleSound('success');
            confetti({ particleCount: 50, spread: 60 });
            return;
          }
        }
      }
      setErrorMessage('Could not decode schedule. Please ensure your input is valid JSON or a SkwelaDabaw QR payload.');
    }
  };

  // Confirmation & Save
  const handleConfirmImport = async () => {
    if (isSaving) return;
    const selectedItems = parsedSchedules.filter((_, i) => selectedIndices.has(i));
    if (selectedItems.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const defaultReminder = Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;
      const cleanItems = selectedItems.map((item) => {
        const { id, ...clean } = item;
        return {
          ...clean,
          color: clean.color || '#2563EB',
          reminderMinutes: (clean.reminderMinutes !== undefined && clean.reminderMinutes !== null) 
            ? clean.reminderMinutes 
            : defaultReminder
        };
      });

      // Atomic bulk addition (instant single-transaction write)
      await db.schedules.bulkAdd(cleanItems as any);

      // Play success audio & celebration immediately
      confetti({ particleCount: 80, spread: 70 });
      playEagleSound('success');

      // Schedule background notifications and widget sync without blocking the UI
      db.schedules.toArray().then((allClasses) => {
        scheduleAllClassSchedulesReminders(allClasses).catch(console.warn);
        syncScheduleToWidgets(allClasses).catch(console.warn);
        refreshUnremovableClassNotification(allClasses).catch(console.warn);
        if (session.uid && session.isLoggedIn) {
          backupSchedulesToCloud(session.uid, allClasses, false, session).catch(console.warn);
        }
      });

      // Transition immediately so user never experiences lag
      if (onImportComplete) {
        onImportComplete();
      } else {
        onBack();
      }
    } catch (err: any) {
      setIsSaving(false);
      setErrorMessage(err?.message || 'Failed to save imported courses to local database.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col animate-fade-in select-none w-full pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--card-border)] px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--nested-bg)] text-[var(--text-primary)] transition-all pressable"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                Import Timetable
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Sync schedules from classmates, documents, or school portal
              </p>
            </div>
          </div>

          {/* Scanner Reachability Status Badge & Re-probe Button */}
          <button
            type="button"
            onClick={probeAiReachability}
            disabled={isCheckingAi}
            title={aiReachability?.message || 'Tap to re-check scanner connectivity'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer pressable ${
              isCheckingAi
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                : isAiAvailable 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/15' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/15'
            }`}
          >
            {isCheckingAi ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span className={`w-2 h-2 rounded-full shrink-0 ${isAiAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            )}
            <span>
              {isCheckingAi ? 'Checking...' : isAiAvailable ? 'Scanner Online' : 'Scanner Offline'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-semibold flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* REVIEW STEP: Extracted Courses List */}
        {parsedSchedules.length > 0 ? (
          <div className="space-y-4 animate-page-enter">
            {/* Review Header Card */}
            <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Review Extracted Courses
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {qrMetadata?.student ? `Shared by ${qrMetadata.student}` : 'Select the courses you want to add to your daily schedule'}
                  {qrMetadata?.campus ? ` (${qrMetadata.campus})` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIndices.size === parsedSchedules.length) {
                      setSelectedIndices(new Set());
                    } else {
                      setSelectedIndices(new Set(parsedSchedules.map((_, i) => i)));
                    }
                  }}
                  className="py-1.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] pressable"
                >
                  {selectedIndices.size === parsedSchedules.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParsedSchedules([]);
                    setQrMetadata(null);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold pressable"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Courses Matrix */}
            <div className="space-y-2.5">
              {parsedSchedules.map((sched, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      const updated = new Set(selectedIndices);
                      if (updated.has(idx)) {
                        updated.delete(idx);
                      } else {
                        updated.add(idx);
                      }
                      setSelectedIndices(updated);
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[var(--card-bg)] border-emerald-500/50 shadow-xs'
                        : 'bg-[var(--nested-bg)] border-[var(--card-border)] opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-[var(--card-border)] bg-[var(--card-bg)]'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ring-1 ring-black/10 dark:ring-white/20" 
                            style={{ backgroundColor: sched.color || '#2563EB' }}
                            title={`Color: ${sched.color || '#2563EB'}`}
                          />
                          <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                            {sched.subjectCode}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] font-medium">
                            {sched.units || 3} units
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {sched.subjectName}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] flex-wrap pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
                            <span>{sched.startTime} – {sched.endTime}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[var(--text-secondary)]" />
                            <span>{(sched.days || []).map(d => d.slice(0, 3)).join(', ')}</span>
                          </span>
                          {sched.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[var(--text-secondary)]" />
                              <span>{sched.room}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete Single Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setParsedSchedules(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-rose-500 transition-colors"
                      title="Remove course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sticky Bottom Actions */}
            <div className="sticky bottom-4 z-20 pt-2">
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedIndices.size === 0 || isSaving}
                className="w-full py-3.5 px-4 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed pressable"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Importing {selectedIndices.size} Courses...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3] shrink-0" />
                    <span>Import {selectedIndices.size} Selected Courses to Schedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* INPUT METHODS SELECTION */
          <div className="space-y-5 animate-fade-in">
            {/* Top Navigation Mode Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => setImportMode('qr-scan')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all pressable ${
                  importMode === 'qr-scan'
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectAiMode('camera')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all pressable ${
                  importMode === 'camera'
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                } ${!isAiAvailable || isCheckingAi ? 'opacity-65' : ''}`}
                title={!isAiAvailable ? 'Scanner is currently offline - Tap to retry' : 'CamScanner Photo OCR'}
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Photo OCR</span>
                {!isAiAvailable && !isCheckingAi && (
                  <span className="text-[9px] px-1 py-0.2 rounded-md bg-rose-500/15 text-rose-500 font-bold hidden sm:inline">
                    Offline
                  </span>
                )}
                {isCheckingAi && (
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-500 hidden sm:inline" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectAiMode('text')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all pressable ${
                  importMode === 'text'
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                } ${!isAiAvailable || isCheckingAi ? 'opacity-65' : ''}`}
                title={!isAiAvailable ? 'Scanner is currently offline - Tap to retry' : 'Portal Text Scanner'}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Portal Text</span>
                {!isAiAvailable && !isCheckingAi && (
                  <span className="text-[9px] px-1 py-0.2 rounded-md bg-rose-500/15 text-rose-500 font-bold hidden sm:inline">
                    Offline
                  </span>
                )}
                {isCheckingAi && (
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-500 hidden sm:inline" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setImportMode('json')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all pressable ${
                  importMode === 'json'
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileJson className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">JSON / CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setImportMode('prompt-guide')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all pressable ${
                  importMode === 'prompt-guide'
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Prompt Guide</span>
              </button>
            </div>

            {/* PROCESSING SPINNER OVERLAY */}
            {isProcessing && (
              <div className="p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-md flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-spin">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">
                    Analyzing Schedule Data
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Extracting courses, rooms, and class timings...
                  </p>
                </div>
                {processLogs.length > 0 && (
                  <div className="p-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] font-mono text-[11px] text-[var(--text-secondary)] max-w-sm w-full text-left space-y-1">
                    {processLogs.map((log, lIdx) => (
                      <div key={lIdx} className="truncate">› {log}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* METHOD 1: QR CODE SCANNER */}
            {!isProcessing && importMode === 'qr-scan' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)]">
                        Classmate QR Code Scanner
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Instantly import timetables shared by blockmates or friends
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Offline Ready
                    </span>
                  </div>

                  {/* Viewfinder Area */}
                  <div className="w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden bg-black border border-[var(--card-border)] relative flex flex-col items-center justify-center shadow-inner">
                    <div id="qr-reader-container" className="w-full h-full" />
                    
                    {!isQrCameraActive && (
                      <div className="absolute inset-0 p-5 bg-[var(--nested-bg)] flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] shadow-xs">
                          <Camera className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">
                            Camera Scanner Ready
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] max-w-xs">
                            Point your rear camera at a classmate QR code to scan instantly
                          </p>
                        </div>

                        {isStartingQrCamera ? (
                          <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-secondary)]">
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Starting camera...</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startQrCamera()}
                            className="py-2.5 px-5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold shadow-md pressable flex items-center gap-1.5"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Start Camera Scanner</span>
                          </button>
                        )}
                      </div>
                    )}

                    {qrCameraError && (
                      <div className="absolute inset-0 p-5 bg-black/95 flex flex-col items-center justify-center text-center space-y-3">
                        <AlertCircle className="w-8 h-8 text-amber-400 shrink-0" />
                        <p className="text-xs text-zinc-200 font-medium leading-relaxed max-w-xs">
                          {qrCameraError}
                        </p>
                        <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                          <button
                            type="button"
                            onClick={() => startQrCamera()}
                            className="py-1.5 px-3.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold"
                          >
                            Retry
                          </button>
                          <label className="cursor-pointer py-1.5 px-3.5 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold">
                            Upload Photo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleScanQrFile}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Camera Controls */}
                  {isQrCameraActive && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={toggleQrCameraFacing}
                        className="py-2 px-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 pressable shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{qrFacingMode === 'environment' ? 'Switch to Front' : 'Switch to Back'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopQrCamera}
                        className="py-2 px-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold pressable"
                      >
                        Stop Camera
                      </button>
                    </div>
                  )}

                  {/* Offline QR Screenshot Picker */}
                  <div className="pt-3 border-t border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Saved a QR screenshot from group chat?
                    </span>
                    <label className="cursor-pointer py-2 px-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold hover:opacity-90 transition-all pressable flex items-center gap-1.5 shadow-xs">
                      <ImageIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>Upload QR Screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScanQrFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Paste Shared Code Direct */}
                <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      Paste Schedule Code or JSON
                    </h4>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      Instant text decode
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={5000}
                    value={qrPastedText}
                    onChange={(e) => setQrPastedText(e.target.value.slice(0, 5000))}
                    placeholder="Paste SKWELA:v2:... code or raw schedule JSON"
                    className="w-full p-3 rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] font-mono text-xs focus:outline-hidden"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleProcessDecodedString(qrPastedText.trim())}
                      disabled={!qrPastedText.trim()}
                      className="py-2 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs disabled:opacity-40 pressable shadow-xs"
                    >
                      Decode &amp; Preview
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* METHOD 2: CAMERA / COR AI OCR */}
            {!isProcessing && importMode === 'camera' && (
              <div className="space-y-4 animate-fade-in">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFallbackFileSelected}
                  className="hidden"
                />

                <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-amber-500" />
                        <span>CamScanner (COR / Assessment)</span>
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Capture your printed Enrollment Assessment Form or school registration slip
                      </p>
                    </div>
                  </div>

                  {/* Quota & Allowance Banner */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-amber-500" />
                      <span>Daily Scan Allowance</span>
                    </span>
                    <span className="font-mono bg-amber-500/20 px-2 py-0.5 rounded-lg">
                      {3 - dailyScansUsed} / 3 scans left today
                    </span>
                  </div>

                  {/* Cooldown Active Banner */}
                  {cooldownSeconds > 0 && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Cooldown Active</span>
                      </div>
                      <span className="font-mono bg-amber-500/20 px-2 py-0.5 rounded-lg">
                        {Math.floor(cooldownSeconds / 60)}m {cooldownSeconds % 60}s
                      </span>
                    </div>
                  )}

                  {/* Camera Action Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleLaunchCamera}
                      disabled={!canScanAi}
                      className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-left space-y-2 transition-all pressable disabled:opacity-40"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[var(--text-primary)]">
                          Take Document Photo
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Snap photo using rear camera with autofocus
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handlePickFromGallery}
                      disabled={!canScanAi}
                      className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-left space-y-2 transition-all pressable disabled:opacity-40"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[var(--text-primary)]">
                          Choose from Gallery
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Upload existing COR screenshot or photo
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* METHOD 3: PORTAL TEXT */}
            {!isProcessing && importMode === 'text' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      Portal Text Importer
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Highlight and copy text directly from your university portal, then paste it here
                    </p>
                  </div>

                  <textarea
                    rows={6}
                    maxLength={25000}
                    value={rawPortalText}
                    onChange={(e) => setRawPortalText(e.target.value.slice(0, 25000))}
                    placeholder="Example:&#10;CS101 Intro to Computer Science MWF 08:00 AM - 09:30 AM Rm F-201 3 units&#10;MATH21 Differential Calculus TTH 10:00 AM - 11:30 AM Rm M-102 3 units"
                    className="w-full p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-mono focus:outline-hidden"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParsePortalText}
                      disabled={!rawPortalText.trim()}
                      className="py-2.5 px-5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs disabled:opacity-40 pressable shadow-xs flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Parse Portal Text</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* METHOD 4: JSON / CSV FILE */}
            {!isProcessing && importMode === 'json' && (
              <div className="space-y-4 animate-fade-in">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={jsonFileInputRef}
                  accept=".json,.csv,text/csv,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      setJsonText(text);
                      parseJsonOrCsvContent(text);
                    };
                    reader.readAsText(file);
                  }}
                  className="hidden"
                />

                <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)]">
                        JSON or CSV Timetable File
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Upload exported SkwelaDabaw backups or spreadsheet timetables
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      100% Offline
                    </span>
                  </div>

                  {/* Upload Card */}
                  <div
                    onClick={() => jsonFileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-[var(--card-border)] hover:border-[var(--btn-primary-bg)] bg-[var(--nested-bg)] cursor-pointer flex flex-col items-center justify-center text-center space-y-2 transition-all pressable"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        Tap to Select Timetable File
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Supports .json and .csv files
                      </p>
                    </div>
                  </div>

                  {/* Or Direct Paste */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">
                      Or paste raw JSON / CSV text:
                    </label>
                    <textarea
                      rows={4}
                      maxLength={25000}
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value.slice(0, 25000))}
                      placeholder='[{"subjectCode": "CS101", "subjectName": "Computer Science", "days": ["Monday", "Wednesday", "Friday"], "startTime": "08:00", "endTime": "09:30"}]'
                      className="w-full p-3 rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-mono focus:outline-hidden"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => parseJsonOrCsvContent(jsonText)}
                        disabled={!jsonText.trim()}
                        className="py-2 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs disabled:opacity-40 pressable shadow-xs"
                      >
                        Decode &amp; Preview
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* METHOD 5: PROMPT GUIDE */}
            {!isProcessing && importMode === 'prompt-guide' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>Prompt Yourself Guide</span>
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      You can copy this timetable extraction prompt and paste it alongside your COR screenshot or study load text into external tools.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] relative">
                    <pre className="font-mono text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                      {PROMPT_YOURSELF_TEMPLATE}
                    </pre>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(PROMPT_YOURSELF_TEMPLATE);
                        setPromptCopied(true);
                        setTimeout(() => setPromptCopied(false), 2500);
                      }}
                      className="absolute top-3 right-3 py-1.5 px-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-primary)] shadow-xs flex items-center gap-1.5 pressable"
                    >
                      {promptCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{promptCopied ? 'Copied!' : 'Copy Prompt'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--text-secondary)] space-y-1">
                    <p className="font-bold text-[var(--text-primary)]">Next Step:</p>
                    <p>After the JSON code is generated, switch to the <strong>JSON / CSV</strong> tab above and paste it directly.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
