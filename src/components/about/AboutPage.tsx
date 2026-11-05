import React, { useState } from 'react';
import { 
  ArrowLeft, 
  History, 
  RefreshCw, 
  Smartphone, 
  Code, 
  Layers, 
  Scale, 
  ShieldCheck, 
  ChevronRight, 
  Heart, 
  Mail, 
  Globe, 
  ShieldAlert, 
  Bus, 
  Calendar, 
  PhoneCall, 
  Bell, 
  ExternalLink 
} from 'lucide-react';
import { checkForAppUpdate, CURRENT_APP_VERSION, UpdateCheckResult } from '../../services/updateService';
import { AppUpdateModal } from '../common/AppUpdateModal';
import { LegalModal } from '../common/LegalModal';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

interface AboutPageProps {
  onBack: () => void;
  onOpenChangelog?: () => void;
}

type AboutView = 'hub' | 'app' | 'developer' | 'sources';

export const AboutPage: React.FC<AboutPageProps> = ({ onBack, onOpenChangelog }) => {
  const [currentView, setCurrentView] = useState<AboutView>('hub');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [foundUpdate, setFoundUpdate] = useState<UpdateCheckResult | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalInitialTab, setLegalModalInitialTab] = useState<'terms' | 'privacy'>('terms');

  // Return to About Hub on Android back press when in a sub-view
  useBackHandler(currentView !== 'hub', () => setCurrentView('hub'), BackPriority.SUBVIEW, 'about_subview');

  const handleManualCheck = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const res = await checkForAppUpdate();
      if (res.hasUpdate) {
        setFoundUpdate(res);
        setUpdateStatus(`Version ${res.latestVersion} is available!`);
      } else {
        setUpdateStatus(`You are on the latest version (v${CURRENT_APP_VERSION})`);
      }
    } catch {
      setUpdateStatus('Could not check updates. Check internet connection.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const hubItems = [
    {
      id: 'app' as AboutView,
      title: 'The App',
      desc: 'What SkwelaDabaw is, offline features, and timetable alarms',
      icon: Smartphone,
      badge: 'Offline Guide'
    },
    {
      id: 'developer' as AboutView,
      title: 'The Developer',
      desc: 'Meet Kurzyrio, Davao student story, and direct contact',
      icon: Code,
      badge: 'Kurzyrio'
    },
    {
      id: 'sources' as AboutView,
      title: 'Data Sources',
      desc: 'Where jeep routes, schedules, weather, and 911 numbers come from',
      icon: Layers,
      badge: 'Transparency'
    },
    {
      id: 'legal' as const,
      title: 'Legal & Privacy Policies',
      desc: 'Terms of Service, Data Privacy Act R.A. 10173, and student rights',
      icon: Scale,
      badge: 'Compliance'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col animate-fade-in select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--card-border)] px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentView !== 'hub') {
                  setCurrentView('hub');
                } else {
                  onBack();
                }
              }}
              className="p-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--nested-bg)] transition-all pressable cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                {currentView === 'hub' && 'About'}
                {currentView === 'app' && 'The App'}
                {currentView === 'developer' && 'The Developer'}
                {currentView === 'sources' && 'Data Sources'}
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                {currentView === 'hub' ? 'SkwelaDabaw Information' : 'About SkwelaDabaw'}
              </p>
            </div>
          </div>

          {currentView === 'hub' && onOpenChangelog && (
            <button
              onClick={onOpenChangelog}
              className="px-3.5 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs hover:opacity-90 transition-all pressable flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>What's New</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* ==================== HUB VIEW ==================== */}
        {currentView === 'hub' && (
          <div className="space-y-4 animate-fade-in">
            {/* Hero Summary Card */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl overflow-hidden shadow-md border border-[var(--nested-border)] flex items-center justify-center bg-black">
                <img src="/app-icon.png" alt="SkwelaDabaw Icon" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  SkwelaDabaw
                </h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
                    Version {CURRENT_APP_VERSION}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30">
                    Beta
                  </span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                An offline student companion created by a Davao college student to help you stay organized and travel easier around the city.
              </p>

              <div className="pt-1 flex flex-col items-center gap-2">
                <button
                  onClick={handleManualCheck}
                  disabled={isCheckingUpdate}
                  className="px-5 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs inline-flex items-center gap-2 pressable shadow-sm cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'Checking for updates...' : 'Check for Updates'}</span>
                </button>

                {updateStatus && (
                  <p className="text-xs text-[var(--text-secondary)] animate-fade-in">
                    {updateStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Hub Button Grid (Modeled after StudentHubPage) */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
                Explore Information
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hubItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'legal') {
                          setLegalModalInitialTab('terms');
                          setIsLegalModalOpen(true);
                        } else {
                          setCurrentView(item.id as AboutView);
                        }
                      }}
                      className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] text-left transition-all duration-200 pressable flex items-center justify-between group shadow-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-[var(--text-primary)]">
                              {item.title}
                            </h3>
                            {item.badge && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Dedication Pill */}
            <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center">
              <p className="text-xs text-[var(--text-secondary)] flex items-center justify-center gap-1.5 font-medium">
                <span>Built for every student in Davao City</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
              </p>
            </div>
          </div>
        )}

        {/* ==================== THE APP SUB-VIEW ==================== */}
        {currentView === 'app' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  About SkwelaDabaw
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  SkwelaDabaw is a fast, lightweight companion built specifically for college and senior high school students across Davao City. It works 100% offline so you never get stuck when campus Wi-Fi or mobile data is down.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Class Timetable Alarms</h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Automatically reminds you before your next class starts and tells you the room assignment.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-start gap-3">
                  <Bus className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Jeepney &amp; Bus Transit Guides</h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Find which Davao PUJ or DC Bus to ride, where to transfer, and how much the student discount fare costs.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">100% Offline-First</h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Your schedule, tasks, baon budget, and routes stay saved on your phone. No internet needed to view your day.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-start gap-3">
                  <Heart className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Zero Ads &amp; Free Forever</h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Created as a free community utility. No advertisements, no paywalls, and no tracking.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('hub')}
                  className="w-full py-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  &larr; Back to About
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== THE DEVELOPER SUB-VIEW ==================== */}
        {currentView === 'developer' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] font-bold text-lg">
                  K
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    Kurzyrio
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">Davao Student &amp; Independent Developer</p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Hi! I am a college student living and commuting right here in Davao City. I created SkwelaDabaw because memorizing jeep routes, rushing to find classrooms, and computing daily student fares is something we all deal with.
              </p>

              <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2">
                <h3 className="text-xs font-bold text-[var(--text-primary)]">My Promise to Students:</h3>
                <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Keep the app 100% free with zero pop-up advertisements.</li>
                  <li>Never sell or lease your student data to any company.</li>
                  <li>Keep it working offline so you can always rely on it.</li>
                </ul>
              </div>

              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Get in Touch / Suggestions:</h3>
                <a
                  href="mailto:jerriviencenatad@gmail.com"
                  className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between transition-colors pressable"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sky-500" />
                    <span>jerriviencenatad@gmail.com</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </a>

                <a
                  href="https://skweladabaw.kurzyrio.site"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between transition-colors pressable"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span>skweladabaw.kurzyrio.site</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </a>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('hub')}
                  className="w-full py-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  &larr; Back to About
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== DATA SOURCES SUB-VIEW ==================== */}
        {currentView === 'sources' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Where Our Data Comes From
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  We believe in 100% transparency. Here is the exact origin of all information shown inside SkwelaDabaw:
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <Bus className="w-4 h-4 text-emerald-500" />
                    <span>Jeepney &amp; Bus Transit Data</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Collected from public Davao City transport guides and LTFRB Region XI official fare matrices. Verified by real student commuters across Davao streets.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Class Schedules &amp; Timetables</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Provided directly by you when you scan your Certificate of Registration (COR) or type your schedule. The app never accesses or hacks your university portal.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span>Weather Advisories &amp; Suspensions</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Based on public announcements from the City Government of Davao / CDRRMO and official campus communications.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <PhoneCall className="w-4 h-4 text-rose-500" />
                    <span>Emergency Contacts</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Speed dials connect directly to Davao Central 911, DCPO, and SPMC hotlines using your device's native phone dialer.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                <span className="font-bold">Disclaimer:</span> SkwelaDabaw is an independent student companion project. It is not an official agency of the City Government of Davao or any university.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('hub')}
                  className="w-full py-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  &larr; Back to About
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Unified Legal & Privacy Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalInitialTab}
      />

      {/* In-App Update Modal */}
      {foundUpdate && (
        <AppUpdateModal
          updateInfo={foundUpdate}
          onClose={() => setFoundUpdate(null)}
        />
      )}
    </div>
  );
};

export default AboutPage;
