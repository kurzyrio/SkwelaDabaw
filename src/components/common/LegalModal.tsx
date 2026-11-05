import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { X, ShieldCheck, Scale, FileText, ExternalLink, ShieldAlert, Users, Bus, Smartphone, Calendar, Lock } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms'
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  const handleOpenWeb = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = activeTab === 'terms'
      ? 'https://skweladabaw.kurzyrio.site/terms.php'
      : 'https://skweladabaw.kurzyrio.site/privacy.php';
    if (Capacitor.isNativePlatform()) {
      try {
        window.open(url, '_system');
      } catch {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Dismiss modal on Android back press
  useBackHandler(isOpen, onClose, BackPriority.MODAL);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none sheet-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--modal-bg)] w-full max-w-xl max-h-[85vh] rounded-3xl border border-[var(--card-border)] flex flex-col shadow-2xl overflow-hidden sheet-enter-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[var(--text-primary)]" />
            <h2 id="legal-modal-title" className="font-bold text-sm text-[var(--text-primary)]">
              Legal, Privacy & Compliance
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable"
            aria-label="Close legal modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[var(--card-border)] bg-[var(--nested-bg)] p-1.5 gap-1 shrink-0" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'terms'}
            onClick={() => setActiveTab('terms')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'terms'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'privacy'}
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'privacy'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy (DPA)</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed scrollbar-thin">
          {activeTab === 'terms' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)]">
                <h3 className="font-bold text-[var(--text-primary)] mb-1">Independent Student Companion</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  SkwelaDabaw is an independent, non-commercial offline student companion created by <strong>Kurzyrio</strong> for Davao City college and senior high school students. It is <strong>not</strong> an official agency of the City Government of Davao, LTFRB, CHED, DepEd, or any university.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#0A84FF]" />
                  <span>Multi-Device Academic &amp; Commute Continuity</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  The app safely stores and synchronizes your class timetables, semester grades, GWA computations, saved commute locations (Home, Campus, Dorm), and app preferences to encrypted MySQL so you never have to re-enter your data when switching phones, tablets, or using desktop web browsers.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Bilateral Responsibility Framework</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  <strong>App's Responsibility:</strong> Strict cryptographic user isolation, offline-first reliability, zero commercial monetization, and active harassment moderation.<br />
                  <strong>User's Responsibility:</strong> Account credential custody, duty to verify official grades and schedules against university registrar portals, situational commuter road safety, and respectful campus community conduct.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>20% Student Fare Discount (R.A. 11314) &amp; Transit</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Under Republic Act No. 11314, enrolled students in the Philippines are legally entitled to a 20% fare discount on Davao City public utility jeeps (PUJ) and buses upon presenting a valid student ID. Fare estimates in SkwelaDabaw reflect official LTFRB Region XI guidelines and are for planning purposes.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#FF9F0A]" />
                  <span>Safe Spaces Act (R.A. 11313) &amp; Davao Anti-Discrimination</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Gender-based online sexual harassment, cyberstalking, offensive comments, misogynistic or homophobic slurs, and doxxing are strictly prohibited in community channels. Davao City Ordinance No. 0417-12 guarantees equal respect across all campuses regardless of gender identity, sexual orientation, race, or religion.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#BF5AF2]" />
                  <span>Emergency Directory (Davao Central 911)</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Emergency buttons route speed-dial calls directly to official Davao Central 911, DCPO, and SPMC hotlines via your device's native telephone dialer. SkwelaDabaw does not operate an independent dispatch service.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)]">
                <h3 className="font-bold text-[var(--text-primary)] mb-1">R.A. 10173 Data Privacy Act Compliance</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  SkwelaDabaw complies with the principles of Transparency, Legitimate Purpose, and Proportionality set forth by the National Privacy Commission of the Philippines.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0A84FF]" />
                  <span>Google Login is the Only External Provider</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Google Sign-In is the only external service connected to SkwelaDabaw. We use it strictly to verify your student identity so nobody can claim your account or username.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Schedules, Grades &amp; Commute Data on Secure MySQL</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Your class timetables, tasks, semester grades, saved commute pins (Home, Campus, Dorm), bulletin bookmarks, and profile details are safely stored on our secure MySQL host at <strong>kurzyrio.site</strong> with strict cryptographic user isolation. This preserves your complete student setup across all devices.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#32D74B]" />
                  <span>100% Offline-First Local Storage</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Your timetable, GWA grades, and baon budget are also cached directly on your phone (IndexedDB). They remain completely under your control and operate instantly with 0ms delay without cellular data.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF9F0A]" />
                  <span>Certificate of Registration (COR) Scanning</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  When you scan your COR to import classes, the image is processed in memory solely to read subject names and room schedules. Your image is never permanently stored or shared.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#32D74B]" />
                  <span>Your Data Rights Under R.A. 10173</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  You have the right to view, export, or completely delete your account and timetable data at any time directly in the app. For support, contact <a href="mailto:jerriviencenatad@gmail.com" className="text-[var(--text-primary)] underline">jerriviencenatad@gmail.com</a>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-between shrink-0">
          <a
            href={activeTab === 'terms' ? 'https://skweladabaw.kurzyrio.site/terms.php' : 'https://skweladabaw.kurzyrio.site/privacy.php'}
            onClick={handleOpenWeb}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 pressable cursor-pointer"
          >
            <span>View web version</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs pressable shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
