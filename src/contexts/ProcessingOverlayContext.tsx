import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ProcessingOverlay } from '../components/common/ProcessingOverlay';

export interface ProcessingOptions {
  message: string;
  submessage?: string;
  timeoutMs?: number;
}

export interface ProcessingOverlayContextType {
  isOpen: boolean;
  message: string;
  submessage?: string;
  showProcessing: (message: string, submessage?: string) => void;
  hideProcessing: () => void;
  updateProcessingMessage: (message: string, submessage?: string) => void;
  withProcessing: <T>(options: ProcessingOptions, action: () => Promise<T>) => Promise<T>;
}

const ProcessingOverlayContext = createContext<ProcessingOverlayContextType | null>(null);

const DEFAULT_TIMEOUT_MS = 12000; // 12-second safety timeout for mobile network connections

export const ProcessingOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Processing • Please wait');
  const [submessage, setSubmessage] = useState<string | undefined>('Connecting securely to SkwelaDabaw cloud');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearActiveTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hideProcessing = useCallback(() => {
    clearActiveTimeout();
    setIsOpen(false);
  }, [clearActiveTimeout]);

  const showProcessing = useCallback((newMsg: string, newSub?: string) => {
    clearActiveTimeout();
    setMessage(newMsg);
    setSubmessage(newSub);
    setIsOpen(true);
  }, [clearActiveTimeout]);

  const updateProcessingMessage = useCallback((newMsg: string, newSub?: string) => {
    setMessage(newMsg);
    if (newSub !== undefined) {
      setSubmessage(newSub);
    }
  }, []);

  const withProcessing = useCallback(async <T,>(
    options: ProcessingOptions,
    action: () => Promise<T>
  ): Promise<T> => {
    const timeoutDuration = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    showProcessing(options.message, options.submessage);

    let isCompleted = false;

    return new Promise<T>((resolve, reject) => {
      // 12-second safety guard timer
      timeoutRef.current = setTimeout(() => {
        if (!isCompleted) {
          isCompleted = true;
          hideProcessing();
          reject(new Error('Connection timed out. Please check your internet connection and try again.'));
        }
      }, timeoutDuration);

      // Execute target network or database action
      Promise.resolve()
        .then(() => action())
        .then((result) => {
          if (!isCompleted) {
            isCompleted = true;
            hideProcessing();
            resolve(result);
          }
        })
        .catch((error) => {
          if (!isCompleted) {
            isCompleted = true;
            hideProcessing();
            reject(error);
          }
        });
    });
  }, [showProcessing, hideProcessing]);

  return (
    <ProcessingOverlayContext.Provider
      value={{
        isOpen,
        message,
        submessage,
        showProcessing,
        hideProcessing,
        updateProcessingMessage,
        withProcessing
      }}
    >
      {children}
      <ProcessingOverlay
        isOpen={isOpen}
        message={message}
        submessage={submessage}
      />
    </ProcessingOverlayContext.Provider>
  );
};

export const useProcessingOverlay = (): ProcessingOverlayContextType => {
  const context = useContext(ProcessingOverlayContext);
  if (!context) {
    throw new Error('useProcessingOverlay must be used within a ProcessingOverlayProvider');
  }
  return context;
};
