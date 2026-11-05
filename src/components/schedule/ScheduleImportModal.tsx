import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Upload, 
  Camera, 
  Image as ImageIcon,
  FileJson, 
  Scan, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  BookOpen, 
  Layers,
  FileText,
  Key,
  HelpCircle,
  Lock,
  Server,
  Cpu,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { ClassSchedule, DayOfWeek } from '../../types';
import { db } from '../../db';
import { 
  capturePhotoFromCamera, 
  pickPhotoFromGallery, 
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
import { scheduleAllClassSchedulesReminders, refreshUnremovableClassNotification } from '../../services/notificationService';
import { syncScheduleToWidgets } from '../../services/widgetService';
import { Copy, CheckCheck, ExternalLink, ShieldAlert, AlertTriangle, Edit3, QrCode } from 'lucide-react';
import { playEagleSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import { decodeScheduleFromQrPayload, fetchScheduleByCloudCode } from '../../services/shareService';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

interface ScheduleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const ScheduleImportModal: React.FC<ScheduleImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [importMode, setImportMode] = useState<'qr-scan' | 'camera' | 'json' | 'text' | 'prompt-guide'>('qr-scan');
  const [qrCameraError, setQrCameraError] = useState<string | null>(null);
  const [qrMetadata, setQrMetadata] = useState<{ student?: string; campus?: string } | null>(null);
  const [isQrCameraActive, setIsQrCameraActive] = useState<boolean>(false);
  const [isStartingQrCamera, setIsStartingQrCamera] = useState<boolean>(false);
  const [qrFacingMode, setQrFacingMode] = useState<'environment' | 'user'>('environment');
  const [qrPastedText, setQrPastedText] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<number>(0);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [parsedSchedules, setParsedSchedules] = useState<ClassSchedule[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Automatically select all extracted subjects whenever parsedSchedules updates
  useEffect(() => {
    setSelectedIndices(new Set(parsedSchedules.map((_, i) => i)));
  }, [parsedSchedules]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState<string>('');
  const [rawPortalText, setRawPortalText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanSourceMode, setScanSourceMode] = useState<ScanSourceMode | null>(null);

  // Unreadable text detection & user action modal state
  const [unreadableDetections, setUnreadableDetections] = useState<UnreadableDetection[]>([]);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState<boolean>(false);
  const [editedUnreadableFields, setEditedUnreadableFields] = useState<{ [key: string]: string }>({});

  // AI Reachability State
  const [aiReachability, setAiReachability] = useState<AiReachabilityResult | null>(null);
  const [isCheckingAi, setIsCheckingAi] = useState<boolean>(true);
  const [promptCopied, setPromptCopied] = useState<boolean>(false);

  // Gemini API Key in-modal state
  const [apiKeyInput, setApiKeyInput] = useState<string>(getStoredGeminiApiKey);
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(() => !getStoredGeminiApiKey());
  const [keySavedSuccess, setKeySavedSuccess] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>(getPreferredOcrModel);

  // Probe AI reachability on modal open
  useEffect(() => {
    if (isOpen) {
      setIsCheckingAi(true);
      checkAiReachability().then((res) => {
        setAiReachability(res);
        setIsCheckingAi(false);
        if (!res.reachable && importMode === 'camera') {
          // Default to prompt guide or json if AI is offline
          setImportMode('prompt-guide');
        }
      }).catch(() => {
        setAiReachability({ reachable: false, mode: 'none', message: 'AI backend offline' });
        setIsCheckingAi(false);
        setImportMode('prompt-guide');
      });
    }
  }, [isOpen]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(PROMPT_YOURSELF_TEMPLATE);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2500);
  };

  const handleSaveApiKey = () => {
    setStoredGeminiApiKey(apiKeyInput.trim());
    setPreferredOcrModel(selectedModel);
    setKeySavedSuccess(true);
    setTimeout(() => setKeySavedSuccess(false), 2500);
    if (apiKeyInput.trim()) {
      setErrorMessage(null);
      setShowApiKeyConfig(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

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
      const current = getDailyAiScans();
      const next = current + 1;
      localStorage.setItem(key, String(next));
      setDailyScansUsed(next);
    } catch (err) {
      // ignore
    }
  };

  // 5-Minute AI Scan Cooldown
  const AI_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
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

  const isServerOnline = Boolean(aiReachability?.reachable);
  const isAiDisabledForGuest = !isLoggedIn;
  const isDailyLimitReached = isLoggedIn && dailyScansUsed >= 3;
  const canScanAi = isLoggedIn && !isDailyLimitReached && cooldownSeconds === 0 && isServerOnline && !isCheckingAi;

  // 1. Trigger Native Android Camera
  const handleLaunchCamera = async () => {
    if (isCheckingAi) {
      setErrorMessage('Checking AI Server status... please wait a moment.');
      return;
    }
    if (!isServerOnline) {
      setErrorMessage('AI Server is currently offline. The backend web server must be running to process Camera OCR scans.');
      return;
    }
    if (!isLoggedIn) {
      setErrorMessage('Google login required for AI schedule scanning. Please log in with Google to use camera OCR.');
      return;
    }
    if (isDailyLimitReached) {
      setErrorMessage('Daily AI scan limit reached: 3 of 3 scans used today. Please try again tomorrow.');
      return;
    }
    if (cooldownSeconds > 0) {
      setErrorMessage(`AI Scan Cooldown: Please wait ${Math.floor(cooldownSeconds / 60)}m ${cooldownSeconds % 60}s before scanning another document.`);
      return;
    }

    try {
      setErrorMessage(null);
      const result = await capturePhotoFromCamera();
      if (result) {
        setSelectedImage(result.dataUrl);
        runAiAnalysis(result.base64);
        return;
      }
    } catch (err: any) {
      console.warn('Native camera fallback:', err);
    }

    // Direct fallback
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  // 2. Trigger Native Android Gallery / Photo Picker
  const handlePickFromGallery = async () => {
    if (isCheckingAi) {
      setErrorMessage('Checking AI Server status... please wait a moment.');
      return;
    }
    if (!isServerOnline) {
      setErrorMessage('AI Server is currently offline. The backend web server must be running to process Gallery OCR scans.');
      return;
    }
    if (!isLoggedIn) {
      setErrorMessage('Google login required for AI schedule scanning. Please log in with Google to use gallery OCR.');
      return;
    }
    if (isDailyLimitReached) {
      setErrorMessage('Daily AI scan limit reached: 3 of 3 scans used today. Please try again tomorrow.');
      return;
    }
    if (cooldownSeconds > 0) {
      setErrorMessage(`AI Scan Cooldown: Please wait ${Math.floor(cooldownSeconds / 60)}m ${cooldownSeconds % 60}s before scanning another document.`);
      return;
    }

    try {
      setErrorMessage(null);
      const result = await pickPhotoFromGallery();
      if (result) {
        setSelectedImage(result.dataUrl);
        runAiAnalysis(result.base64);
        return;
      }
    } catch (err: any) {
      console.warn('Gallery pick fallback:', err);
    }

    // Direct fail-safe fallback to system gallery
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  // Web Browser fallback file input
  const handleFallbackFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoggedIn || isDailyLimitReached) return;
    if (cooldownSeconds > 0) {
      setErrorMessage(`AI Scan Cooldown: Please wait ${Math.floor(cooldownSeconds / 60)}m ${cooldownSeconds % 60}s before scanning another document.`);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedImage(dataUrl);
      runAiAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Process Base64 image with AI
  const runAiAnalysis = async (base64OrDataUrl: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessLogs([]);
    setProcessStep(1);
    setScanSourceMode(null);

    const logs: string[] = [];
    const addLog = (msg: string, stepNum: number) => {
      logs.push(msg);
      setProcessLogs([...logs]);
      setProcessStep(stepNum);
    };

    try {
      const extracted = await analyzeErcWithAi(base64OrDataUrl, (msg, stepNum, mode) => {
        if (mode) setScanSourceMode(mode);
        addLog(msg, stepNum);
      });

      if (extracted && extracted.schedules.length > 0) {
        // Save timestamp for 5-minute cooldown ONLY on success
        localStorage.setItem('last_ai_scan_timestamp', Date.now().toString());
        incrementDailyAiScans();
        setParsedSchedules(extracted.schedules);

        if (extracted.unreadableDetections && extracted.unreadableDetections.length > 0) {
          setUnreadableDetections(extracted.unreadableDetections);
          const initialEdits: { [key: string]: string } = {};
          extracted.unreadableDetections.forEach((d, idx) => {
            initialEdits[`${d.subjectCode || 'subj'}_${d.field}_${idx}`] = d.detectedSnippet || '';
          });
          setEditedUnreadableFields(initialEdits);
          setIsClarificationModalOpen(true);
          playEagleSound('question');
        } else {
          playEagleSound('success');
        }
      } else {
        setErrorMessage('No valid subjects were detected in the document. Please try a clearer photo.');
      }
      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
      localStorage.removeItem('last_ai_scan_timestamp');
      setCooldownSeconds(0);
      setErrorMessage(err?.message || 'Failed to analyze schedule image. Please try again or use JSON import.');
    }
  };

  // JSON File upload handler
  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setJsonText(text);
        if (file.name.toLowerCase().endsWith('.csv') || (text.includes(',') && !text.trim().startsWith('{') && !text.trim().startsWith('['))) {
          const success = parseCsvContent(text);
          if (success) return;
        }
        parseJsonContent(text);
      } catch (err) {
        setErrorMessage('Failed to read the schedule file.');
      }
    };
    reader.readAsText(file);
  };

  // CSV timetable parsing logic
  const parseCsvContent = (content: string): boolean => {
    setErrorMessage(null);
    try {
      const lines = content.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return false;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('course') || h.includes('subject'));
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('title') || h.includes('desc'));
      const roomIdx = headers.findIndex(h => h.includes('room') || h.includes('venue') || h.includes('loc'));
      const bldgIdx = headers.findIndex(h => h.includes('building') || h.includes('bldg'));
      const daysIdx = headers.findIndex(h => h.includes('day'));
      const startIdx = headers.findIndex(h => h.includes('start') || h.includes('begin'));
      const endIdx = headers.findIndex(h => h.includes('end') || h.includes('until'));
      const unitsIdx = headers.findIndex(h => h.includes('unit') || h.includes('credit'));
      const instrIdx = headers.findIndex(h => h.includes('prof') || h.includes('instructor') || h.includes('teacher'));

      if (codeIdx === -1 && nameIdx === -1) return false;

      const items: ClassSchedule[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (row.length === 0 || !row[0]) continue;

        const subjectCode = (codeIdx !== -1 && row[codeIdx] ? row[codeIdx] : (nameIdx !== -1 ? row[nameIdx] : 'COURSE')).toUpperCase().trim();
        const subjectName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : subjectCode;
        const room = roomIdx !== -1 && row[roomIdx] ? row[roomIdx] : '';
        const building = bldgIdx !== -1 && row[bldgIdx] ? row[bldgIdx] : '';
        const instructor = instrIdx !== -1 && row[instrIdx] ? row[instrIdx] : '';
        const units = unitsIdx !== -1 && Number(row[unitsIdx]) ? Number(row[unitsIdx]) : 3;

        let startTime = startIdx !== -1 && row[startIdx] ? row[startIdx] : '08:00';
        let endTime = endIdx !== -1 && row[endIdx] ? row[endIdx] : '09:30';
        if (startTime.length === 4 && startTime.includes(':')) startTime = '0' + startTime;
        if (endTime.length === 4 && endTime.includes(':')) endTime = '0' + endTime;

        let days: DayOfWeek[] = ['Monday', 'Wednesday', 'Friday'];
        if (daysIdx !== -1 && row[daysIdx]) {
          const rawDays = row[daysIdx].toUpperCase();
          const parsedDays: DayOfWeek[] = [];
          if (rawDays.includes('M') || rawDays.includes('MON')) parsedDays.push('Monday');
          if (rawDays.includes('TTH') || (rawDays.includes('T') && !rawDays.includes('TH')) || rawDays.includes('TUE')) parsedDays.push('Tuesday');
          if (rawDays.includes('W') || rawDays.includes('WED')) parsedDays.push('Wednesday');
          if (rawDays.includes('TH') || rawDays.includes('THU')) parsedDays.push('Thursday');
          if (rawDays.includes('F') || rawDays.includes('FRI')) parsedDays.push('Friday');
          if (rawDays.includes('S') && !rawDays.includes('SUN') || rawDays.includes('SAT')) parsedDays.push('Saturday');
          if (rawDays.includes('SUN')) parsedDays.push('Sunday');
          if (parsedDays.length > 0) days = parsedDays;
        }

        const defaultReminder = Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;
        items.push({
          subjectCode,
          subjectName,
          room,
          building,
          instructor,
          days,
          startTime,
          endTime,
          units,
          reminderMinutes: defaultReminder,
          color: PRESET_COLORS[items.length % PRESET_COLORS.length]
        });
      }

      if (items.length > 0) {
        setParsedSchedules(items);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // JSON parsing logic
  const parseJsonContent = (content: string) => {
    setErrorMessage(null);
    try {
      let clean = content.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      // Check if this is a QR code payload or cloud short code first
      if (clean.startsWith('ID:') || clean.startsWith('A1:') || clean.startsWith('Z1:') || clean.startsWith('SKWELA:') || (/^[A-Z0-9]{6}$/i.test(clean) && !clean.includes('{') && !clean.includes('['))) {
        handleProcessQrOrCloudPayload(clean);
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

      for (const item of rawList) {
        if (!item.subjectCode && !item.name && !item.code && !item.c && !item.n) continue;

        const sched: ClassSchedule = {
          ofrCode: item.ofrCode ? String(item.ofrCode) : undefined,
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
            : (Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10),
          color: (item.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(item.color).trim()))
            ? String(item.color).trim()
            : (item.col || PRESET_COLORS[items.length % PRESET_COLORS.length]),
          notes: item.notes || ''
        };
        items.push(sched);
      }

      if (items.length === 0) {
        setErrorMessage('JSON file did not contain any valid subject schedules.');
        return;
      }

      setParsedSchedules(items);
      playEagleSound('success');
      confetti({ particleCount: 50, spread: 60 });
    } catch (err) {
      // Fallback attempt to parse as CSV before erroring
      const csvParsed = parseCsvContent(content);
      if (!csvParsed) {
        setErrorMessage('Invalid timetable format. Please ensure your file contains valid JSON or CSV schedule data.');
      }
    }
  };

  // Stop running scanner safely
  const stopQrCamera = async () => {
    setIsStartingQrCamera(false);
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsQrCameraActive(false);
  };

  const handleProcessQrOrCloudPayload = async (rawText: string) => {
    setErrorMessage(null);
    const text = rawText.trim();
    if (!text) return;

    // 1. Direct Cloud short-code (e.g. ID:K9X2M4 or raw 6-character code)
    if (text.startsWith('ID:') || (/^[A-Z0-9]{6}$/i.test(text) && !text.includes('{') && !text.includes('['))) {
      setIsProcessing(true);
      try {
        const cloudRes = await fetchScheduleByCloudCode(text);
        if (cloudRes.success && cloudRes.schedules.length > 0) {
          setParsedSchedules(cloudRes.schedules);
          setQrMetadata({ student: cloudRes.studentName, campus: cloudRes.campusName });
          playEagleSound('success');
          confetti({ particleCount: 50, spread: 60 });
          return;
        } else {
          setErrorMessage(cloudRes.error || `Could not find schedule with code ${text}`);
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
      return;
    }

    // 3. Fallback to standard JSON / CSV
    parseJsonContent(text);
  };

  // Start running scanner on user click or demand
  const startQrCamera = async (facingModeOverride?: 'environment' | 'user') => {
    setQrCameraError(null);
    setIsStartingQrCamera(true);
    const targetMode = facingModeOverride || qrFacingMode;
    try {
      await stopQrCamera();

      // Explicitly check & request Android runtime camera permission
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await CapacitorCamera.checkPermissions();
          if (status.camera !== 'granted') {
            const req = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
            if (req.camera !== 'granted') {
              setQrCameraError('Camera permission is required to scan QR codes. Please allow camera access in app settings.');
              setIsStartingQrCamera(false);
              return;
            }
          }
        } catch (permErr) {
          console.warn('Camera permission check note:', permErr);
          try {
            await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
          } catch (reqErr) {
            console.warn('Camera request note:', reqErr);
          }
        }
      }

      // Small delay to ensure viewfinder container is properly laid out in DOM
      await new Promise((res) => setTimeout(res, 160));

      const container = document.getElementById('qr-reader-container');
      if (!container) {
        setIsStartingQrCamera(false);
        return;
      }

      const scanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = scanner;

      // Select camera: prioritize requested facingMode
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
      } catch (enumErr) {
        console.warn('Camera enumeration note:', enumErr);
        cameraConfig = { facingMode: targetMode };
      }

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.75);
            return { width: Math.max(edge, 180), height: Math.max(edge, 180) };
          }
        },
        (decodedText) => {
          stopQrCamera();
          handleProcessQrOrCloudPayload(decodedText);
        },
        () => {}
      );

      setIsQrCameraActive(true);
      setIsStartingQrCamera(false);
    } catch (e: any) {
      console.warn('QR camera start failed:', e);
      setQrCameraError(e?.message || 'Camera preview unavailable. Please allow camera permissions or upload a QR screenshot.');
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

  // Cleanup on close or mode change
  useEffect(() => {
    if (!isOpen || importMode !== 'qr-scan') {
      stopQrCamera();
    }
    return () => {
      stopQrCamera();
    };
  }, [isOpen, importMode]);

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
      } catch (cErr) {
        // Safe clear
      }

      handleProcessQrOrCloudPayload(decodedText);
    } catch (err) {
      console.warn('QR file scan error:', err);
      setErrorMessage('No valid SkwelaDabaw QR code detected in this image. Please ensure the QR is clear and well-lit.');
    } finally {
      e.target.value = '';
    }
  };

  const handleDecodePastedQr = () => {
    if (!qrPastedText.trim()) return;
    setErrorMessage(null);
    handleProcessQrOrCloudPayload(qrPastedText.trim());
  };

  // Edit / remove parsed item before saving
  const handleRemoveParsedItem = (index: number) => {
    setParsedSchedules(prev => prev.filter((_, i) => i !== index));
  };

  // Save selected parsed items into Dexie IndexedDB
  const handleConfirmImport = async () => {
    if (isSaving) return;
    const selectedItems = parsedSchedules.filter((_, i) => selectedIndices.has(i));
    if (selectedItems.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const defaultReminder = Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;
      const cleanItems = selectedItems.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          color: cleanItem.color || '#2563EB',
          reminderMinutes: (cleanItem.reminderMinutes !== undefined && cleanItem.reminderMinutes !== null) 
            ? cleanItem.reminderMinutes 
            : defaultReminder
        };
      });

      // Atomic bulk addition
      await db.schedules.bulkAdd(cleanItems as any);

      // Background cloud backup and local cache update for this user account
      const currentSession = getSavedSession();
      db.schedules.toArray().then((allClasses) => {
        scheduleAllClassSchedulesReminders(allClasses).catch(console.warn);
        syncScheduleToWidgets(allClasses).catch(console.warn);
        refreshUnremovableClassNotification(allClasses).catch(console.warn);
        if (currentSession.uid && currentSession.isLoggedIn) {
          localStorage.setItem(`skweladabaw_cached_schedules_${currentSession.uid}`, JSON.stringify(allClasses));
          backupSchedulesToCloud(currentSession.uid, allClasses, false, currentSession);
        } else {
          localStorage.setItem('skweladabaw_cached_schedules_guest', JSON.stringify(allClasses));
        }
      }).catch(console.warn);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      onImportComplete?.();
      onClose();
    } catch (err) {
      setIsSaving(false);
      console.error('Save schedules error:', err);
      setErrorMessage('Failed to save schedules to local database.');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--modal-bg)] w-full max-w-xl rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--nested-bg)] text-[var(--text-primary)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-center font-bold">
              <Upload className="w-4 h-4 text-[var(--text-primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Import Schedule
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Scan assessment card or load JSON file
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* AI Reachability Status Banner */}
          {aiReachability && aiReachability.reachable && (
            <div className="p-2.5 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] truncate">
                  {aiReachability.message}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-2 shrink-0">ONLINE</span>
            </div>
          )}

          {aiReachability && !aiReachability.reachable && (
            <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-start justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-[#FF9F0A] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-[var(--text-primary)]">
                    AI Server Unreachable — Manual Options Active
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Use <strong>Prompt Yourself</strong> to extract with ChatGPT/Gemini/Claude for free, or import via <strong>JSON File</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCheckingAi(true);
                  checkAiReachability().then(res => {
                    setAiReachability(res);
                    setIsCheckingAi(false);
                  }).catch(() => {
                    setIsCheckingAi(false);
                  });
                }}
                disabled={isCheckingAi}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[10px] font-bold text-[var(--text-primary)] hover:opacity-80 transition-all"
              >
                {isCheckingAi ? 'Checking...' : 'Retry'}
              </button>
            </div>
          )}

          {/* Mode Switcher */}
          {parsedSchedules.length === 0 && !isProcessing && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 bg-[var(--nested-bg)] rounded-2xl border border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => setImportMode('qr-scan')}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  importMode === 'qr-scan'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QR</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isServerOnline) setImportMode('camera');
                }}
                disabled={!isServerOnline || isCheckingAi}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  importMode === 'camera'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                } ${!isServerOnline || isCheckingAi ? 'opacity-35 cursor-not-allowed pointer-events-none select-none' : 'pressable'}`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photo / ERC</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isServerOnline) setImportMode('text');
                }}
                disabled={!isServerOnline || isCheckingAi}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  importMode === 'text'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                } ${!isServerOnline || isCheckingAi ? 'opacity-35 cursor-not-allowed pointer-events-none select-none' : 'pressable'}`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Portal Text</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('prompt-guide')}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  importMode === 'prompt-guide'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Prompt Guide</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('json')}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  importMode === 'json'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON / CSV</span>
              </button>
            </div>
          )}

          {/* MODE 0: Instant Classmate QR Scanner */}
          {importMode === 'qr-scan' && parsedSchedules.length === 0 && !isProcessing && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[var(--text-primary)]" />
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">Scan Classmate Schedule QR</h4>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-500">
                    Fast Import
                  </span>
                </div>

                {/* Viewfinder Container */}
                <div className="w-full max-w-xs mx-auto aspect-square rounded-2xl overflow-hidden bg-black border border-[var(--card-border)] relative flex flex-col items-center justify-center">
                  <div id="qr-reader-container" className="w-full h-full" />
                  {!isQrCameraActive && (
                    <div className="absolute inset-0 p-4 bg-[var(--nested-bg)] flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)]">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">Point your camera at a classmate QR code</p>
                      {isStartingQrCamera ? (
                        <div className="flex items-center gap-2 py-2 px-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-secondary)]">
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Starting camera...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startQrCamera()}
                            className="py-2 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold transition-all active:scale-95 shadow-xs"
                          >
                            Start Camera Scanner
                          </button>
                          <button
                            type="button"
                            onClick={() => qrCameraInputRef.current?.click()}
                            className="py-2 px-3.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold hover:bg-[var(--card-bg)] transition-all active:scale-95"
                          >
                            Snap Photo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {qrCameraError && (
                    <div className="absolute inset-0 p-4 bg-black/95 flex flex-col items-center justify-center text-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-amber-400 shrink-0" />
                      <p className="text-xs text-zinc-200 font-medium px-2 leading-relaxed">{qrCameraError}</p>
                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => startQrCamera()}
                          className="py-1.5 px-3.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold transition-all active:scale-95 shadow-xs"
                        >
                          Retry Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => qrCameraInputRef.current?.click()}
                          className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
                        >
                          Snap Photo
                        </button>
                        <label className="cursor-pointer py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all">
                          Upload Image
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

                {isQrCameraActive && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={toggleQrCameraFacing}
                      className="py-1.5 px-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 pressable shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{qrFacingMode === 'environment' ? 'Switch to Front' : 'Switch to Back'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopQrCamera}
                      className="py-1.5 px-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold transition-all active:scale-95 pressable"
                    >
                      Stop Camera
                    </button>
                  </div>
                )}

                <div id="qr-reader-file-container" className="hidden" />
                <input
                  ref={qrCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleScanQrFile}
                  className="hidden"
                />

                <div className="pt-2 border-t border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-secondary)]">Have a QR screenshot from chat?</span>
                  <label className="cursor-pointer py-1.5 px-3.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold hover:opacity-90 transition-all pressable flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>Upload QR Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScanQrFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Paste QR Payload Option */}
              <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Paste QR Payload or Encoded Text</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={5000}
                  value={qrPastedText}
                  onChange={(e) => setQrPastedText(e.target.value.slice(0, 5000))}
                  placeholder="SKWELA:v1:... or paste shared schedule string"
                  className="w-full p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] font-mono text-xs focus:outline-hidden"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleDecodePastedQr}
                    disabled={!qrPastedText.trim()}
                    className="py-1.5 px-3.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs disabled:opacity-40 transition-all active:scale-95"
                  >
                    Decode &amp; Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 1: Camera / Gallery AI OCR */}
          {importMode === 'camera' && parsedSchedules.length === 0 && !isProcessing && (
            <div className="space-y-3">
              {/* Hidden file input for web / system fallback */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFallbackFileSelected}
                className="hidden"
              />

              {/* Server Checking / Offline Banner */}
              {isCheckingAi && (
                <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-500 shrink-0 animate-spin" />
                  <span>Checking AI Server connection...</span>
                </div>
              )}

              {!isCheckingAi && !isServerOnline && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40/30 text-xs space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Server className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <span>AI Web Server is Offline</span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          • OCR Disabled
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        Camera OCR requires the SkwelaDabaw web server backend to be online. Please use the free offline alternatives below:
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={() => setImportMode('prompt-guide')}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all"
                    >
                      Use Prompt Yourself Guide
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('json')}
                      className="px-3.5 py-1.5 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
                    >
                      Upload JSON File
                    </button>
                  </div>
                </div>
              )}

              {/* Guest Users: Shaded Out Lock Banner */}
              {isServerOnline && isAiDisabledForGuest && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04]/80 border border-slate-200 dark:border-white/[0.08] flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      Google Login Required for AI Scanning
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      AI OCR camera scanning is reserved for logged-in accounts (3 scans/day). Sign in via Settings to unlock, or use Portal Text / JSON file import.
                    </p>
                  </div>
                </div>
              )}

              {/* Logged-In Users: Daily Scans Allowance Badge */}
              {isServerOnline && isLoggedIn && !isDailyLimitReached && (
                <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs font-black text-amber-800 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-500" />
                    <span>Daily AI Scan Allowance</span>
                  </span>
                  <span className="font-mono bg-amber-400/20 px-2.5 py-0.5 rounded-lg">
                    {3 - dailyScansUsed} / 3 scans left today
                  </span>
                </div>
              )}

              {/* Logged-In Users: Daily Limit Reached */}
              {isServerOnline && isDailyLimitReached && (
                <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Daily limit reached (3 of 3 scans used today). Allowance resets tomorrow.</span>
                </div>
              )}

              {/* Cooldown Alert Banner */}
              {isServerOnline && cooldownSeconds > 0 && !isDailyLimitReached && isLoggedIn && (
                <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Scan Cooldown Active</span>
                  </div>
                  <span className="font-mono px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-800 dark:text-amber-200">
                    {Math.floor(cooldownSeconds / 60)}m {String(cooldownSeconds % 60).padStart(2, '0')}s
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Take Photo Button */}
                <button
                  type="button"
                  onClick={handleLaunchCamera}
                  disabled={!canScanAi}
                  className={`p-5 rounded-2xl border-2 text-left space-y-2 transition-all shadow-sm ${
                    !canScanAi
                      ? 'border-slate-100 dark:border-white/[0.06] bg-slate-100/60 dark:bg-slate-900/60 opacity-40 grayscale cursor-not-allowed pointer-events-none'
                      : 'border-amber-300 dark:border-slate-700 bg-white/60 dark:bg-white/[0.03] hover:border-amber-500 group active:scale-95 cursor-pointer'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                      <span>Take Photo with Camera</span>
                      {!isServerOnline && !isCheckingAi && (
                        <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                          Offline
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {!isServerOnline && !isCheckingAi
                        ? 'Disabled — AI Server is currently offline'
                        : (!isLoggedIn 
                          ? 'Requires Google login' 
                          : (isDailyLimitReached ? '3/3 daily scans used' : 'Capture photo of your study load card.'))}
                    </p>
                  </div>
                </button>

                {/* Select from Gallery Button */}
                <button
                  type="button"
                  onClick={handlePickFromGallery}
                  disabled={!canScanAi}
                  className={`p-5 rounded-2xl border-2 text-left space-y-2 transition-all shadow-sm ${
                    !canScanAi
                      ? 'border-slate-100 dark:border-white/[0.06] bg-slate-100/60 dark:bg-slate-900/60 opacity-40 grayscale cursor-not-allowed pointer-events-none'
                      : 'border-amber-300 dark:border-slate-700 bg-white/60 dark:bg-white/[0.03] hover:border-amber-500 group active:scale-95 cursor-pointer'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                      <span>Select Photo from Gallery</span>
                      {!isServerOnline && !isCheckingAi && (
                        <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                          Offline
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {!isServerOnline && !isCheckingAi
                        ? 'Disabled — AI Server is currently offline'
                        : (!isLoggedIn 
                          ? 'Requires Google login' 
                          : (isDailyLimitReached ? '3/3 daily scans used' : 'Pick screenshot or photo from album.'))}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: Portal Text AI Parser */}
          {importMode === 'text' && parsedSchedules.length === 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Paste Raw Schedule Table from Portal:</span>
                </label>
                <textarea
                  rows={6}
                  maxLength={25000}
                  value={rawPortalText}
                  onChange={(e) => setRawPortalText(e.target.value.slice(0, 25000))}
                  placeholder="Paste table text from Ateneo SIS, USEP portal, UM portal, etc. Example:&#10;IT 211 Data Structures MWF 08:00-09:30 F404&#10;GE 4 Purposive Comm TTH 10:00-11:30 B201"
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!rawPortalText.trim()) return;
                      setIsProcessing(true);
                      setErrorMessage(null);
                      setProcessLogs([]);
                      setScanSourceMode(null);
                      try {
                        const extracted = await parseRawScheduleTextWithAi(rawPortalText, (msg, step, mode) => {
                          if (mode) setScanSourceMode(mode);
                          setProcessStep(step);
                          setProcessLogs(prev => [...prev, msg]);
                        });
                        if (extracted && extracted.schedules.length > 0) {
                          setParsedSchedules(extracted.schedules);
                          if (extracted.unreadableDetections && extracted.unreadableDetections.length > 0) {
                            setUnreadableDetections(extracted.unreadableDetections);
                            const initialEdits: { [key: string]: string } = {};
                            extracted.unreadableDetections.forEach((d, idx) => {
                              initialEdits[`${d.subjectCode || 'subj'}_${d.field}_${idx}`] = d.detectedSnippet || '';
                            });
                            setEditedUnreadableFields(initialEdits);
                            setIsClarificationModalOpen(true);
                            playEagleSound('question');
                          } else {
                            playEagleSound('success');
                          }
                        } else {
                          setErrorMessage('No valid subjects could be extracted. Please check the text format.');
                        }
                        setIsProcessing(false);
                      } catch (err: any) {
                        setIsProcessing(false);
                        setErrorMessage(err?.message || 'Failed to parse text.');
                        if (err?.message?.toLowerCase().includes('api key')) {
                          setShowApiKeyConfig(true);
                        }
                      }
                    }}
                    disabled={!rawPortalText.trim() || !isServerOnline || isCheckingAi}
                    className={`btn-3d px-4 py-2 text-xs font-black transition-all ${
                      !isServerOnline || isCheckingAi ? 'opacity-40 grayscale cursor-not-allowed' : ''
                    }`}
                  >
                    {isCheckingAi ? 'Checking Server...' : (!isServerOnline ? 'AI Server Offline' : 'Extract with AI')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 4: Prompt Yourself Guide */}
          {importMode === 'prompt-guide' && parsedSchedules.length === 0 && !isProcessing && (
            <div className="space-y-4 animate-fade-in">
              {/* Header Card */}
              <div className="p-4 rounded-3xl bg-amber-500/10 dark:bg-white/[0.04] border border-amber-400/40/30 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-500 flex items-center justify-center font-black text-sm">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Prompt Yourself Guide
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Use ChatGPT, Gemini, or Claude to format 10+ subjects.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3 Step Visual Guide */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-amber-300/30 dark:border-slate-700 text-xs">
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-white/[0.06] space-y-1">
                    <span className="font-black text-amber-500 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/10">STEP 1</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px] leading-snug">
                      Copy the prompt template below.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-white/[0.06] space-y-1">
                    <span className="font-black text-amber-500 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/10">STEP 2</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px] leading-snug">
                      Paste into ChatGPT / Claude with your portal text.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-white/[0.06] space-y-1">
                    <span className="font-black text-amber-500 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/10">STEP 3</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px] leading-snug">
                      Paste the resulting JSON code below.
                    </p>
                  </div>
                </div>

                {/* Copy Prompt Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      promptCopied
                        ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                        : 'btn-3d text-slate-950'
                    }`}
                  >
                    {promptCopied ? (
                      <>
                        <CheckCheck className="w-4 h-4" />
                        <span>Prompt Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy AI Extraction Prompt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Paste JSON directly */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Paste AI Generated JSON:</span>
                  <span className="text-[10px] text-slate-500">Supports unlimited subjects &amp; labs</span>
                </label>
                <textarea
                  rows={5}
                  maxLength={25000}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value.slice(0, 25000))}
                  placeholder='[
  {
    "ofrCode": "1048",
    "subjectCode": "IT 211",
    "subjectName": "Data Structures & Algorithms",
    "room": "F-404",
    "days": ["Monday", "Wednesday", "Friday"],
    "startTime": "08:00",
    "endTime": "09:30",
    "units": 3
  }
]'
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => parseJsonContent(jsonText)}
                    disabled={!jsonText.trim()}
                    className="btn-3d px-5 py-2 text-xs font-black disabled:opacity-50"
                  >
                    Parse &amp; Preview Schedules
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: JSON or CSV File Upload */}
          {importMode === 'json' && parsedSchedules.length === 0 && !isProcessing && (
            <div className="space-y-4">
              <input
                type="file"
                ref={jsonFileInputRef}
                accept=".json,.csv,text/csv,application/json"
                onChange={handleJsonFileUpload}
                className="hidden"
              />

              <div
                onClick={() => jsonFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 text-center space-y-3 hover:border-slate-900 dark:hover:border-white transition-colors cursor-pointer bg-slate-50 dark:bg-slate-800/40"
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center">
                  <FileJson className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Click to browse .JSON or .CSV timetable file
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload schedules exported from another device, portal, or spreadsheet.
                  </p>
                </div>
              </div>

              {/* Paste JSON / CSV manually */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Or Paste JSON or CSV Directly:</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={25000}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value.slice(0, 25000))}
                  placeholder='[{"ofrCode":"1048","subjectCode":"IT 211","subjectName":"Data Structures","days":["Monday","Wednesday"],"startTime":"08:00","endTime":"09:30","units":3}]&#10;or: subjectCode,subjectName,room,days,startTime,endTime'
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = jsonText.trim();
                      if (trimmed.includes(',') && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
                        const ok = parseCsvContent(trimmed);
                        if (ok) return;
                      }
                      parseJsonContent(trimmed);
                    }}
                    disabled={!jsonText.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white dark:text-white font-bold text-xs disabled:opacity-50"
                  >
                    Parse Schedule
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI PROCESSING STAGE */}
          {isProcessing && (
            <div className="p-6 rounded-3xl bg-slate-50/80 dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center animate-spin">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Processing Document Schedule...
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Step {processStep} of 4 in progress
                    </p>
                  </div>
                </div>

                {scanSourceMode && (
                  <div className={`px-3 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 border shadow-xs ${
                    scanSourceMode === 'server'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                  }`}>
                    {scanSourceMode === 'server' ? (
                      <>
                        <Server className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Mode: Server Proxy (HestiaCP)</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Mode: Client Direct (Google Gemini)</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(processStep / 4) * 100}%` }}
                />
              </div>

              {/* Step Logs */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                {processLogs.map((log, i) => (
                  <div key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="text-amber-500">›</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ERROR ALERT WITH CONTACT ADMIN */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed flex-1">{errorMessage}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-rose-500/20">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Encountered an issue?
                </span>
                <a
                  href="mailto:support@kurzyrio.site?subject=SkwelaDabaw%20Schedule%20Import%20Issue"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black shadow-xs transition-transform active:scale-95"
                >
                  <span>Contact Admin</span>
                  <span className="font-mono text-[10px] opacity-90">(support@kurzyrio.site)</span>
                </a>
              </div>
            </div>
          )}

          {/* PARSED RESULTS REVIEW SCREEN */}
          {parsedSchedules.length > 0 && !isProcessing && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <span>Parsed Subjects: {parsedSchedules.length}</span>
                    <span className="text-[10px] font-bold text-emerald-500">
                      • Ready to Save
                    </span>
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Review and select which extracted subjects to add to your schedule.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedIndices(new Set(parsedSchedules.map((_, i) => i)))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--card-border)] hover:bg-[var(--card-bg)] transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIndices(new Set())}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={() => { setParsedSchedules([]); setSelectedImage(null); }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    Clear &amp; Re-scan
                  </button>
                </div>
              </div>

              {/* Selection Summary Pill */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-secondary)]">
                <span>Selected: {selectedIndices.size} of {parsedSchedules.length} subjects</span>
                {selectedIndices.size === 0 && (
                  <span className="text-rose-500 font-bold">Select at least 1 subject to import</span>
                )}
              </div>

              {/* List of Extracted Cards with Individual Checkboxes */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {parsedSchedules.map((item, index) => {
                  const isSelected = selectedIndices.has(index);
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        const next = new Set(selectedIndices);
                        if (isSelected) next.delete(index);
                        else next.add(index);
                        setSelectedIndices(next);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 shadow-xs ${
                        isSelected
                          ? 'border-[var(--card-hover-border)] bg-[var(--card-bg)]'
                          : 'border-[var(--card-border)] bg-[var(--nested-bg)] opacity-60'
                      }`}
                      style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            const next = new Set(selectedIndices);
                            if (e.target.checked) next.add(index);
                            else next.delete(index);
                            setSelectedIndices(next);
                          }}
                          className="mt-1 w-4 h-4 rounded text-[var(--btn-primary-bg)] focus:ring-[var(--card-hover-border)] bg-transparent border-[var(--card-border)] cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.ofrCode && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]">
                                OFR: {item.ofrCode}
                              </span>
                            )}
                            <span 
                              className="px-2 py-0.5 rounded-md text-xs font-bold text-white"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.subjectCode}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {item.subjectName}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-wrap">
                            <span className="flex items-center gap-1 font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{item.days.map(d => d.substring(0, 3)).join('/')} {item.startTime} - {item.endTime}</span>
                            </span>
                            {item.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{item.room} {item.building && `• ${item.building}`}</span>
                              </span>
                            )}
                            <span className="font-bold text-[var(--text-primary)]">
                              {item.units || 3} units
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveParsedItem(index);
                        }}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[var(--nested-bg)] border-t border-[var(--card-border)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-colors"
          >
            Cancel
          </button>

          {parsedSchedules.length > 0 && (
            <button
              type="button"
              disabled={selectedIndices.size === 0 || isSaving}
              onClick={handleConfirmImport}
              className={`px-6 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all ${
                selectedIndices.size === 0 || isSaving
                  ? 'bg-[var(--nested-bg)] text-[var(--text-tertiary)] border border-[var(--card-border)] cursor-not-allowed opacity-60'
                  : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 active:scale-95 cursor-pointer'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving {selectedIndices.size} {selectedIndices.size === 1 ? 'Subject' : 'Subjects'}...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save {selectedIndices.size} Selected {selectedIndices.size === 1 ? 'Subject' : 'Subjects'} to Schedule</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* CLARIFICATION / UNREADABLE DETAILS MODAL POPUP */}
      {isClarificationModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsClarificationModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl p-5 sm:p-6 space-y-4 animate-modal-pop-in max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center font-black shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>Unclear Details Detected in OCR</span>
                  <span className="text-[10px] font-bold text-amber-600">
                    • Action Needed
                  </span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-snug">
                  Some letters, room numbers, or times were blurry or ambiguous. Please confirm or edit them below.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
              {unreadableDetections.map((detection, idx) => {
                const editKey = `${detection.subjectCode || 'subj'}_${detection.field}_${idx}`;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-[var(--text-primary)]">
                        {detection.subjectCode || 'Enrolled Course'} • {detection.field.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-amber-500 font-semibold">
                        Detected: "{detection.detectedSnippet}"
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {detection.suggestedAction}
                    </p>

                    <div className="relative">
                      <input
                        type="text"
                        value={editedUnreadableFields[editKey] !== undefined ? editedUnreadableFields[editKey] : detection.detectedSnippet}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedUnreadableFields(prev => ({
                            ...prev,
                            [editKey]: val
                          }));
                        }}
                        placeholder={`e.g. Enter corrected ${detection.field}`}
                        className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--input-text)] focus:outline-hidden focus:border-amber-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => setIsClarificationModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] text-xs font-bold hover:text-[var(--text-primary)]"
              >
                Keep As Is
              </button>
              <button
                type="button"
                onClick={() => {
                  // Apply edits to parsedSchedules
                  setParsedSchedules(prev => {
                    return prev.map((item) => {
                      const updated = { ...item };
                      unreadableDetections.forEach((d, idx) => {
                        if (d.subjectCode === item.subjectCode) {
                          const editKey = `${d.subjectCode || 'subj'}_${d.field}_${idx}`;
                          const val = editedUnreadableFields[editKey];
                          if (val !== undefined && val.trim().length > 0) {
                            (updated as any)[d.field] = val.trim();
                          }
                        }
                      });
                      return updated;
                    });
                  });
                  setIsClarificationModalOpen(false);
                  playEagleSound('success');
                }}
                className="btn-3d px-5 py-2.5 text-xs font-black flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Apply Corrected Details</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
