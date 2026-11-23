import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ProcessingOverlay } from '../components/common/ProcessingOverlay';

export interface ProcessingOptions {
  message: string;
  submessage?: string;
  timeoutMs?: number;
  minVisibleMs?: number;
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

interface ActiveOverlayEntry {
  message: string;
  submessage?: string;
}

const ProcessingOverlayContext = createContext<ProcessingOverlayContextType | null>(null);

const DEFAULT_TIMEOUT_MS = 12000; // 12-second safety timeout for mobile network connections
const MAX_ERROR_MIN_VISIBLE_MS = 150;

export const ProcessingOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Processing • Please wait');
  const [submessage, setSubmessage] = useState<string | undefined>('Connecting securely to SkwelaDabaw cloud');

  const activeTokensRef = useRef<Map<string, ActiveOverlayEntry>>(new Map());
  const manualTokenStackRef = useRef<string[]>([]);
  const tokenCounterRef = useRef<number>(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
      activeTokensRef.current.clear();
      manualTokenStackRef.current = [];
    };
  }, []);

  const syncOverlayFromTokens = useCallback(() => {
    const entries = Array.from(activeTokensRef.current.values());
    if (entries.length === 0) {
      setIsOpen(false);
      return;
    }
    const latest = entries[entries.length - 1];
    setMessage(latest.message);
    setSubmessage(latest.submessage);
    setIsOpen(true);
  }, []);

  const acquireToken = useCallback((token: string, newMsg: string, newSub?: string) => {
    activeTokensRef.current.set(token, { message: newMsg, submessage: newSub });
    syncOverlayFromTokens();
  }, [syncOverlayFromTokens]);

  const releaseToken = useCallback((token: string) => {
    if (activeTokensRef.current.delete(token)) {
      syncOverlayFromTokens();
    }
  }, [syncOverlayFromTokens]);

  const hideProcessing = useCallback(() => {
    const token = manualTokenStackRef.current.pop();
    if (token) {
      releaseToken(token);
    }
  }, [releaseToken]);

  const showProcessing = useCallback((newMsg: string, newSub?: string) => {
    tokenCounterRef.current += 1;
    const token = `manual_${tokenCounterRef.current}`;
    manualTokenStackRef.current.push(token);
    acquireToken(token, newMsg, newSub);
  }, [acquireToken]);

  const updateProcessingMessage = useCallback((newMsg: string, newSub?: string) => {
    const keys = Array.from(activeTokensRef.current.keys());
    if (keys.length > 0) {
      const topKey = keys[keys.length - 1];
      const current = activeTokensRef.current.get(topKey);
      activeTokensRef.current.set(topKey, {
        message: newMsg,
        submessage: newSub !== undefined ? newSub : current?.submessage
      });
    }
    setMessage(newMsg);
    if (newSub !== undefined) {
      setSubmessage(newSub);
    }
  }, []);

  const withProcessing = useCallback(<T,>(
    options: ProcessingOptions,
    action: () => Promise<T>
  ): Promise<T> => {
    const timeoutDuration = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const minVisibleMs = Math.max(0, options.minVisibleMs ?? 0);
    tokenCounterRef.current += 1;
    const token = `with_${tokenCounterRef.current}`;
    const startedAt = Date.now();

    acquireToken(token, options.message, options.submessage);

    let isCompleted = false;

    return new Promise<T>((resolve, reject) => {
      const scheduleTimer = (fn: () => void, ms: number) => {
        const id = setTimeout(() => {
          timersRef.current.delete(id);
          fn();
        }, ms);
        timersRef.current.add(id);
        return id;
      };

      const clearTimer = (id: ReturnType<typeof setTimeout> | null) => {
        if (id !== null) {
          clearTimeout(id);
          timersRef.current.delete(id);
        }
      };

      const finishWithDelay = (waitTargetMs: number, done: () => void) => {
        const elapsed = Date.now() - startedAt;
        const remaining = waitTargetMs - elapsed;
        if (remaining > 0) {
          scheduleTimer(() => {
            releaseToken(token);
            done();
          }, remaining);
        } else {
          releaseToken(token);
          done();
        }
      };

      // Per-call safety guard timer
      const timeoutId = scheduleTimer(() => {
        if (!isCompleted) {
          isCompleted = true;
          releaseToken(token);
          reject(new Error('Connection timed out. Please check your internet connection and try again.'));
        }
      }, timeoutDuration);

      // Execute target network or database action
      Promise.resolve()
        .then(() => action())
        .then((result) => {
          if (!isCompleted) {
            isCompleted = true;
            clearTimer(timeoutId);
            finishWithDelay(minVisibleMs, () => resolve(result));
          }
        })
        .catch((error) => {
          if (!isCompleted) {
            isCompleted = true;
            clearTimer(timeoutId);
            const errorWaitMs = Math.min(minVisibleMs, MAX_ERROR_MIN_VISIBLE_MS);
            finishWithDelay(errorWaitMs, () => reject(error));
          }
        });
    });
  }, [acquireToken, releaseToken]);

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
