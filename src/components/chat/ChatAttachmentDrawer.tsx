import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera as CameraIcon, Bus, CloudRain, MapPin, X, Loader2 } from 'lucide-react';
import { uploadChatMedia } from '../../services/chatService';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface ChatAttachmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUploaded: (mediaUrl: string) => void;
  onPhotoSelected?: (source: File | Blob | string) => void;
  onOpenRoutePicker: () => void;
  onOpenAlertPicker: () => void;
  onOpenSpotPicker: () => void;
  senderUid?: string;
}

export const ChatAttachmentDrawer: React.FC<ChatAttachmentDrawerProps> = ({
  isOpen,
  onClose,
  onImageUploaded,
  onPhotoSelected,
  onOpenRoutePicker,
  onOpenAlertPicker,
  onOpenSpotPicker,
  senderUid
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const processAndUploadImage = async (source: File | Blob | string) => {
    setIsCompressing(true);
    setUploadError(null);

    try {
      const result = await uploadChatMedia(source);
      if (result.success && result.url) {
        onImageUploaded(result.url);
        onClose();
      } else {
        setUploadError(result.error || 'Failed to upload photo. Please try again.');
      }
    } catch (err: any) {
      console.warn('Image process/upload error:', err);
      setUploadError(err?.message || 'Failed to process image. Please try again.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoPicked = async (source: File | Blob | string) => {
    if (onPhotoSelected) {
      onClose();
      onPhotoSelected(source);
    } else {
      await processAndUploadImage(source);
    }
  };

  const handlePickPhoto = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Request photo permissions gracefully if needed, but do not block modern photo picker
        try {
          const check = await Camera.checkPermissions();
          if (check.photos !== 'granted') {
            await Camera.requestPermissions({ permissions: ['photos'] });
          }
        } catch (_) {}

        // Use DataUrl to avoid Android WebView content URI / fetch permission issues
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          correctOrientation: true
        });

        if (photo?.dataUrl) {
          handlePhotoPicked(photo.dataUrl);
        } else if (photo?.base64String) {
          const format = photo.format || 'jpeg';
          handlePhotoPicked(`data:image/${format};base64,${photo.base64String}`);
        } else if (photo?.webPath) {
          try {
            const res = await fetch(photo.webPath);
            const blob = await res.blob();
            handlePhotoPicked(blob);
          } catch {
            fileInputRef.current?.click();
          }
        } else {
          fileInputRef.current?.click();
        }
      } catch (err: any) {
        const msg = (err?.message || '').toLowerCase();
        if (!msg.includes('cancel') && !msg.includes('dismiss')) {
          console.warn('Native camera picker note, falling back to input:', err);
          fileInputRef.current?.click();
        }
      }
    } else {
      // 2. Web / Browser: Trigger file input
      fileInputRef.current?.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoPicked(file);
    }
  };

  const drawerContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/60 backdrop-blur-xs sheet-backdrop-enter"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[var(--card-bg)] border-t border-[var(--card-border)] rounded-t-3xl p-5 pb-safe space-y-4 sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Input for Web fallback & wide format support */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileSelected}
        />

        {/* Drawer Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Share Content
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] flex items-center justify-center hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {uploadError && (
          <div className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 text-center font-medium animate-shake">
            {uploadError}
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-3 pt-1">
          {/* 1. Photo */}
          <button
            type="button"
            disabled={isCompressing}
            onClick={handlePickPhoto}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] border border-[var(--nested-border)] transition-all pressable"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-500 flex items-center justify-center">
              {isCompressing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CameraIcon className="w-5 h-5" />}
            </div>
            <span className="text-[11px] font-bold text-[var(--text-primary)]">
              {isCompressing ? 'Uploading...' : 'Photo'}
            </span>
          </button>

          {/* 2. Transit Route */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRoutePicker();
            }}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] border border-[var(--nested-border)] transition-all pressable"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
              <Bus className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[var(--text-primary)]">Route</span>
          </button>

          {/* 3. Commute Alert */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAlertPicker();
            }}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] border border-[var(--nested-border)] transition-all pressable"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <CloudRain className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[var(--text-primary)]">Alert</span>
          </button>

          {/* 4. Study Spot */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSpotPicker();
            }}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] border border-[var(--nested-border)] transition-all pressable"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[var(--text-primary)]">Spot</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : drawerContent;
};
