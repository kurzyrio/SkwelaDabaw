import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Share2, 
  Check, 
  Copy,
  QrCode,
  Image as ImageIcon,
  Cloud,
  Zap,
  Loader2
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { ClassSchedule } from '../../types';
import { 
  shareCanvasImage, 
  encodeScheduleToQrPayload, 
  createCloudScheduleCode,
  getScheduleShareUrl,
  shareContent
} from '../../services/shareService';
import { saveWallpaperToDevice } from '../../services/widgetService';

interface ScheduleShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: ClassSchedule[];
  studentName?: string;
  campusName?: string;
}

export const ScheduleShareModal: React.FC<ScheduleShareModalProps> = ({
  isOpen,
  onClose,
  schedules,
  studentName = 'Dabawenyo Student',
  campusName = 'Davao Campus'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'graphic' | 'qr'>('graphic');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'offline' | 'cloud'>('offline');
  const [cloudCode, setCloudCode] = useState<string | null>(null);
  const [isGeneratingCloudCode, setIsGeneratingCloudCode] = useState<boolean>(false);

  // Render high-contrast minimalist graphic card on canvas
  useEffect(() => {
    if (!isOpen || activeTab !== 'graphic' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions: 800x1050px high res
    const w = (canvas.width = 800);
    const h = (canvas.height = 1050);

    // 1. Background: Pure Pitch-Black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // 2. Outer Inset Card
    ctx.fillStyle = '#181818';
    ctx.beginPath();
    ctx.roundRect(30, 30, w - 60, h - 60, 24);
    ctx.fill();
    ctx.strokeStyle = '#2C2C2E';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Branding Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('SkwelaDabaw Timetable', 60, 85);

    ctx.fillStyle = '#8E8E93';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${studentName} • ${campusName}`, 60, 115);

    // Total Units Pill
    const totalUnits = schedules.reduce((sum, s) => sum + (s.units || 3), 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(w - 230, 60, 160, 44, 22);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${totalUnits} Total Units`, w - 200, 88);

    // 4. Subjects Inset Rows
    let startY = 150;
    ctx.fillStyle = '#2C2C2E';
    ctx.fillRect(60, startY, w - 120, 1);
    startY += 20;

    schedules.slice(0, 8).forEach((s) => {
      // Inset card row
      ctx.fillStyle = '#242426';
      ctx.beginPath();
      ctx.roundRect(60, startY, w - 120, 78, 16);
      ctx.fill();

      ctx.strokeStyle = '#38383A';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Subject color indicator strip
      ctx.fillStyle = s.color || '#3B82F6';
      ctx.beginPath();
      ctx.roundRect(72, startY + 14, 5, 50, 3);
      ctx.fill();

      // Subject Code & Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 19px sans-serif';
      ctx.fillText(s.subjectCode, 90, startY + 34);

      ctx.fillStyle = '#8E8E93';
      ctx.font = '15px sans-serif';
      const shortName = s.subjectName.length > 30 ? s.subjectName.slice(0, 30) + '...' : s.subjectName;
      ctx.fillText(shortName, 90, startY + 58);

      // Days & Time
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px monospace';
      const daysStr = (s.days || []).map((d) => d.slice(0, 2)).join('/');
      ctx.fillText(daysStr, w - 260, startY + 34);

      ctx.fillStyle = '#8E8E93';
      ctx.font = '14px monospace';
      ctx.fillText(`${s.startTime} - ${s.endTime}`, w - 260, startY + 58);

      // Room
      if (s.room) {
        ctx.fillStyle = '#8E8E93';
        ctx.font = '13px sans-serif';
        ctx.fillText(`Rm. ${s.room}`, w - 130, startY + 34);
      }

      startY += 90;
    });

    // 5. Bottom Footer
    ctx.fillStyle = '#636366';
    ctx.font = '13px sans-serif';
    ctx.fillText('Generated via SkwelaDabaw • Davao Student Hub', 60, h - 55);
  }, [isOpen, activeTab, schedules, studentName, campusName]);

  // Generate QR code when QR tab is selected
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr' || !qrCanvasRef.current) return;
    const payload = shareMode === 'cloud' && cloudCode
      ? `ID:${cloudCode}`
      : encodeScheduleToQrPayload(schedules, studentName, campusName);

    QRCode.toCanvas(
      qrCanvasRef.current,
      [{ data: payload, mode: 'alphanumeric' }],
      {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      },
      (error) => {
        if (error) console.error('Failed to generate QR Code:', error);
      }
    );
  }, [isOpen, activeTab, schedules, studentName, campusName, shareMode, cloudCode]);

  const handleShareSystem = async () => {
    if (!canvasRef.current) return;
    const fileName = `SkwelaDabaw_Timetable_${studentName.replace(/\s+/g, '_')}.png`;
    const res = await shareCanvasImage(
      canvasRef.current,
      fileName,
      'SkwelaDabaw Student Timetable',
      `${studentName} timetable for ${campusName} • ${schedules.length} enrolled subjects.`
    );

    if (res.success) {
      confetti({ particleCount: 40, spread: 50 });
      setShareFeedback(res.message || 'Shared successfully');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleDownloadCard = async () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const fileName = `SkwelaDabaw_Timetable_${studentName.replace(/\s+/g, '_')}.png`;
    const res = await saveWallpaperToDevice(url, fileName);
    confetti({ particleCount: 50, spread: 60 });
    setShareFeedback(res.message || 'Image saved successfully');
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(schedules, null, 2));
    setCopiedLink(true);
    confetti({ particleCount: 30, spread: 40 });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadQrCode = async () => {
    if (!qrCanvasRef.current) return;
    const url = qrCanvasRef.current.toDataURL('image/png');
    const fileName = `SkwelaDabaw_QR_${studentName.replace(/\s+/g, '_')}.png`;
    const res = await saveWallpaperToDevice(url, fileName);
    confetti({ particleCount: 40, spread: 50 });
    setShareFeedback(res.message || 'QR code image saved successfully');
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleGenerateCloudCode = async () => {
    setIsGeneratingCloudCode(true);
    setShareFeedback(null);
    try {
      const res = await createCloudScheduleCode(schedules, studentName, campusName);
      if (res.success && res.shortCode) {
        setCloudCode(res.shortCode);
        setShareMode('cloud');
        confetti({ particleCount: 40, spread: 50 });
        setShareFeedback(`Cloud code ${res.shortCode} ready!`);
        setTimeout(() => setShareFeedback(null), 3000);
      } else {
        setShareFeedback(res.error || 'Could not generate cloud code');
        setTimeout(() => setShareFeedback(null), 3000);
      }
    } catch (e: any) {
      setShareFeedback('Cloud service unreachable');
      setTimeout(() => setShareFeedback(null), 3000);
    } finally {
      setIsGeneratingCloudCode(false);
    }
  };

  const handleShareAppLink = async () => {
    let targetCode = cloudCode;
    if (!targetCode) {
      setIsGeneratingCloudCode(true);
      try {
        const res = await createCloudScheduleCode(schedules, studentName, campusName);
        if (res.success && res.shortCode) {
          targetCode = res.shortCode;
          setCloudCode(targetCode);
          setShareMode('cloud');
        } else {
          setShareFeedback(res.error || 'Could not generate share link');
          setTimeout(() => setShareFeedback(null), 3000);
          return;
        }
      } catch {
        setShareFeedback('Cloud service unreachable');
        setTimeout(() => setShareFeedback(null), 3000);
        return;
      } finally {
        setIsGeneratingCloudCode(false);
      }
    }

    const shareUrl = getScheduleShareUrl(targetCode);
    const title = `${studentName}'s Class Timetable`;
    const text = `Open or import my class timetable for ${campusName} (${schedules.length} enrolled classes) on SkwelaDabaw!`;
    const res = await shareContent(title, text, shareUrl);
    if (res.success) {
      confetti({ particleCount: 40, spread: 50 });
      setShareFeedback(res.message || 'Share link ready');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleCopyQrCodeText = () => {
    const payload = shareMode === 'cloud' && cloudCode
      ? `ID:${cloudCode}`
      : encodeScheduleToQrPayload(schedules, studentName, campusName);
    navigator.clipboard.writeText(payload);
    setCopiedLink(true);
    confetti({ particleCount: 30, spread: 40 });
    setShareFeedback('Schedule code copied to clipboard');
    setTimeout(() => {
      setCopiedLink(false);
      setShareFeedback(null);
    }, 2500);
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--nested-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Share Timetable
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Export graphic card or scan QR code with classmates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Ribbon */}
        <div className="flex border-b border-[var(--card-border)] bg-[var(--nested-bg)] p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('graphic')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all pressable ${
              activeTab === 'graphic'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Graphic Wallpaper</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all pressable ${
              activeTab === 'qr'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code Share</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {shareFeedback && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] text-xs font-semibold text-center animate-fade-in">
            {shareFeedback}
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'graphic' ? (
            <div className="space-y-4">
              {/* Canvas Wallpaper Preview */}
              <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] shadow-md bg-black max-h-[380px] flex items-center justify-center">
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-auto block max-h-[380px] object-contain"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleShareSystem}
                  className="py-2.5 px-3 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 pressable"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share to Apps</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCard}
                  className="py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-1.5 pressable"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Image</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-1.5 pressable"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-[#30D158]" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3.5 py-1">
              {/* Offline vs Cloud Code Switch */}
              <div className="flex items-center gap-1.5 p-1 bg-[var(--nested-bg)] rounded-xl border border-[var(--card-border)] w-full max-w-xs justify-center">
                <button
                  type="button"
                  onClick={() => setShareMode('offline')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all pressable ${
                    shareMode === 'offline'
                      ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Offline QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!cloudCode) {
                      handleGenerateCloudCode();
                    } else {
                      setShareMode('cloud');
                    }
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all pressable ${
                    shareMode === 'cloud'
                      ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isGeneratingCloudCode ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5" />
                  )}
                  <span>{cloudCode ? `Cloud ${cloudCode}` : 'Cloud Code'}</span>
                </button>
              </div>

              {/* QR Canvas */}
              <div className="p-3.5 rounded-3xl bg-white border border-[var(--card-border)] shadow-xl">
                <canvas ref={qrCanvasRef} className="block rounded-xl" />
              </div>

              {/* Mode Badge / Cloud Code Display */}
              {shareMode === 'offline' ? (
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {encodeScheduleToQrPayload(schedules, studentName, campusName).startsWith('Z1:')
                    ? 'Base45 Deflate • 5.5b/char'
                    : 'Alphanumeric • 5.5b/char'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold text-[var(--text-primary)] tracking-widest bg-[var(--nested-bg)] px-3 py-1 rounded-xl border border-[var(--card-border)]">
                    {cloudCode || '...'}
                  </span>
                </div>
              )}

              <div className="text-center space-y-1 max-w-xs">
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Instant Classmate Scanner</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {shareMode === 'cloud'
                    ? 'Share this 6-character code or QR code with classmates to import over the cloud.'
                    : `Scan with SkwelaDabaw on another phone to import all ${schedules.length} classes instantly offline.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={handleShareAppLink}
                  disabled={isGeneratingCloudCode}
                  className="py-2 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 pressable shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isGeneratingCloudCode ? 'Generating...' : 'Share Web Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQrCode}
                  className="py-2 px-3.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center justify-center gap-1.5 pressable shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR Image</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyQrCodeText}
                  className="py-2 px-3.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-bold flex items-center justify-center gap-1.5 pressable"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-[#30D158]" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Code Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
