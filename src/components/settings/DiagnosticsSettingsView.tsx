import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Trash2, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Lock,
  Smartphone
} from 'lucide-react';
import {
  isTelemetryEnabled,
  setTelemetryEnabled,
  isAllowCellularEnabled,
  setAllowCellularEnabled,
  getPendingLogsCount,
  clearAllLocalLogs,
  flushOfflineLogs,
  checkAndFlushOnlineLogs,
  getNetworkConnectionType
} from '../../services/errorTelemetryService';

export const DiagnosticsSettingsView: React.FC = () => {
  const [telemetryEnabled, setTelemetryEnabledState] = useState<boolean>(() => isTelemetryEnabled());
  const [allowCellular, setAllowCellularState] = useState<boolean>(() => isAllowCellularEnabled());
  const [counts, setCounts] = useState<{ offline: number; online: number }>({ offline: 0, online: 0 });
  const [currentNet, setCurrentNet] = useState<string>('unknown');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);

  const refreshState = () => {
    setCounts(getPendingLogsCount());
    setCurrentNet(getNetworkConnectionType());
  };

  useEffect(() => {
    refreshState();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleTelemetry = (newVal: boolean) => {
    setTelemetryEnabledState(newVal);
    setTelemetryEnabled(newVal);
    showToast(newVal ? 'Crash reporting enabled' : 'Crash reporting disabled');
  };

  const handleToggleCellular = (newVal: boolean) => {
    setAllowCellularState(newVal);
    setAllowCellularEnabled(newVal);
    showToast(newVal ? 'Mobile data upload allowed' : 'Set to Wi-Fi only (saves data)');
  };

  const handleClearLogs = () => {
    clearAllLocalLogs();
    refreshState();
    showToast('Local error logs cleared');
  };

  const handleManualFlush = async () => {
    setIsFlushing(true);
    try {
      const offResult = await flushOfflineLogs();
      const onResult = await checkAndFlushOnlineLogs(true);
      refreshState();
      if (offResult || onResult) {
        showToast('Successfully synced diagnostic logs');
      } else {
        showToast('No logs to upload or network blocked');
      }
    } catch {
      showToast('Log upload failed. Check connection.');
    } finally {
      setIsFlushing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--card-bg)] text-xs font-bold shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SECTION 1: DEVELOPER ASSURANCE & PRIVACY CARD */}
      <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2.5 text-emerald-500">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Privacy &amp; Developer Assurance
          </h3>
        </div>

        {/* Emphasized Anti-PII Guarantee */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          <span>
            No user personal information or data is used to improve the app.
          </span>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          SkwelaDabaw only collects anonymous technical crash logs (such as error stack traces, device model, and Android OS version) solely to allow the Developer to fix bugs, route errors, and app freezes.
        </p>

        <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Developer Access Only
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Zero Tracking IDs or Cookies
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            No Personal Chat/Schedule Data
          </span>
        </div>
      </div>

      {/* SECTION 2: TELEMETRY & NETWORK CONTROLS */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-2">
          Diagnostic Preferences
        </div>

        <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden divide-y divide-[var(--card-border)] shadow-xs">
          {/* Toggle: Automatic Crash Reporting */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0 pr-2">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                Anonymous Crash Reporting
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Automatically save unhandled crashes and errors so they can be reviewed and patched.
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleTelemetry(!telemetryEnabled)}
              className={`w-12 h-7 rounded-full p-1 transition-colors pressable cursor-pointer shrink-0 ${
                telemetryEnabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  telemetryEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle: Send Over Mobile / Cellular Data (Default: OFF) */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  Send on Cellular / Mobile Data
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Data Saver
                </span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Default is <strong className="text-[var(--text-primary)]">OFF (Wi-Fi only)</strong> to preserve your commuter mobile data package. Logs will wait until you connect to Wi-Fi.
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleCellular(!allowCellular)}
              className={`w-12 h-7 rounded-full p-1 transition-colors pressable cursor-pointer shrink-0 ${
                allowCellular ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  allowCellular ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: QUEUE DIAGNOSTICS & MANAGEMENT */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-2">
          Local Storage &amp; Sync Status
        </div>

        <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 shadow-xs">
          <div className="grid grid-cols-2 gap-3">
            {/* Offline logs box */}
            <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Pending Offline Logs</span>
              </div>
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {counts.offline}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">
                Uploaded as soon as back online
              </div>
            </div>

            {/* Online 24h batch box */}
            <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-blue-500" />
                <span>Pending Online Logs</span>
              </div>
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {counts.online}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">
                Batched every 24 hours
              </div>
            </div>
          </div>

          {/* Current Network Indicator */}
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Current Connection:</span>
            </span>
            <span className="font-semibold text-[var(--text-primary)] capitalize">
              {currentNet === 'none' ? 'Offline' : currentNet}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleManualFlush}
              disabled={isFlushing || (!counts.offline && !counts.online)}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] hover:bg-[var(--card-border)] transition-colors text-xs font-bold text-[var(--text-primary)] flex items-center justify-center gap-2 pressable disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFlushing ? 'animate-spin' : ''}`} />
              <span>{isFlushing ? 'Uploading...' : 'Sync Logs Now'}</span>
            </button>

            <button
              type="button"
              onClick={handleClearLogs}
              disabled={!counts.offline && !counts.online}
              className="py-2.5 px-3 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-bold text-red-500 flex items-center justify-center gap-1.5 pressable disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Clear all pending logs stored on device"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
