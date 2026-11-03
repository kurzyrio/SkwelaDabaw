import React from 'react';
import { X, Download } from 'lucide-react';

interface ChatImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ChatImageViewerModal: React.FC<ChatImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  onClose
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md sheet-backdrop-enter select-none"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <a
          href={imageUrl}
          download="skweladabaw_photo.webp"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image container */}
      <div 
        className="max-w-4xl max-h-[85vh] w-auto h-auto flex items-center justify-center sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Chat Media"
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
        />
      </div>
    </div>
  );
};
