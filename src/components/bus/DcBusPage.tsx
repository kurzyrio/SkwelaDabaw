import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldCheck, 
  Heart, 
  ArrowRight, 
  Users, 
  Volume2, 
  Trash2, 
  Ban, 
  Backpack, 
  Bell, 
  MapPin, 
  X, 
  Clock, 
  Info,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Bus,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { DcBusLiveMap } from './DcBusLiveMap';
import { PageIntroGuide } from '../common/PageIntroGuide';
import { 
  getDibsServiceStatus, 
  DIBS_OFFICIAL_SCHEDULE_RULES, 
  DIBS_OFFICIAL_DISCLAIMER 
} from '../../utils/dibsSchedule';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

interface DcBusPageProps {
  onNavigateToJeep?: () => void;
}

// 14 Official DC Bus Etiquette Rules (Zero parentheses)
const ETIQUETTE_RULES = [
  {
    num: 1,
    title: 'Pumila Nang Maayos',
    desc: 'Pumila sa designated bus stop. Huwag sumingit o sumakay sa gitna ng kalsada.',
    icon: Users
  },
  {
    num: 2,
    title: 'Pababain Muna ang Iba',
    desc: 'Magbigay daan sa mga bumababang pasahero bago pumasok sa bus.',
    icon: ArrowRight
  },
  {
    num: 3,
    title: 'Huwag Magtulakan',
    desc: 'Ihanda ang sarili sa pagsakay. Maging mahinahon at iwasan ang pagmamadali.',
    icon: ShieldCheck
  },
  {
    num: 4,
    title: 'Priority Seating',
    desc: 'Ipaubaya ang unahang upuan sa Senior Citizens, PWDs, buntis, at may bitbit na bata.',
    icon: Heart
  },
  {
    num: 5,
    title: 'Umusog Paloob',
    desc: 'Huwag manatili sa bungad. Umusog sa gitna o dulo upang makapasok ang iba.',
    icon: ArrowRight
  },
  {
    num: 6,
    title: 'Huwag Harangan ang Pintuan',
    desc: 'Panatilihing maluwag ang daanan at emergency exits sa lahat ng oras.',
    icon: Ban
  },
  {
    num: 7,
    title: 'Bawal Magkalat CLAYGO',
    desc: 'Clean as you go. Huwag mag-iwan ng ticket, balat ng kendi, o anumang basura.',
    icon: Trash2
  },
  {
    num: 8,
    title: 'Iwasan ang Pagkain sa Loob',
    desc: 'Bawal kumain ng pagkaing may masangsang na amoy o madaling matapon sa biyahe.',
    icon: Ban
  },
  {
    num: 9,
    title: 'Bawal Manigarilyo at Mag-vape',
    desc: 'Mahigpit na ipinagbabawal ang paninigarilyo at pag-vape sa loob ng bus.',
    icon: Ban
  },
  {
    num: 10,
    title: 'Gumamit ng Earphones',
    desc: 'Respetuhin ang kapwa pasahero. Mag-earphones kapag nanonood o nakikinig ng musika.',
    icon: Volume2
  },
  {
    num: 11,
    title: 'Ingatan ang Gamit',
    desc: 'Panatilihing nasa harap ang bag at bantayan ang wallet, telepono, at gamit.',
    icon: Backpack
  },
  {
    num: 12,
    title: 'Huwag Sakupin ang Upuan',
    desc: 'Huwag ipatong ang bag o gamit sa bakanteng upuan kapag may nakatayong pasahero.',
    icon: Backpack
  },
  {
    num: 13,
    title: 'Pindutin ang Bell Nang Maaga',
    desc: 'Pindutin ang stop bell bago sumapit sa iyong hintuan upang makahinto nang maayos.',
    icon: Bell
  },
  {
    num: 14,
    title: 'Bumaba sa Tamang Hintuan',
    desc: 'Bumaba lamang sa mga opisyal at itinalagang bus stop para sa kaligtasan ng lahat.',
    icon: MapPin
  }
];

export const DcBusPage: React.FC<DcBusPageProps> = ({ onNavigateToJeep }) => {
  const [isNoticeOpen, setIsNoticeOpen] = useState<boolean>(true);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const scheduleStatus = getDibsServiceStatus();

  // Hardware Back Button Interception for DC Bus Modals
  useBackHandler(isNoticeOpen, () => setIsNoticeOpen(false), BackPriority.MODAL, 'dcbus_notice');
  useBackHandler(isRulesOpen, () => setIsRulesOpen(false), BackPriority.MODAL, 'dcbus_rules');
  useBackHandler(isScheduleOpen, () => setIsScheduleOpen(false), BackPriority.MODAL, 'dcbus_schedule');
  useBackHandler(isGuideOpen, () => setIsGuideOpen(false), BackPriority.MODAL, 'dcbus_guide');

  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden select-none">
      {/* Cloudflare Security Warning Banner */}
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-[var(--text-primary)] truncate font-medium">
            Live bus tracking paused: Cloudflare security on original server.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.open('https://davaobus.davaocity.gov.ph/dibs/', '_blank')}
          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0 pressable"
        >
          <span>Visit Official Site</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      {/* QUICK FEATURE GUIDE MODAL */}
      <PageIntroGuide
        pageKey="dcbus"
        isOpenControlled={isGuideOpen}
        onCloseControlled={() => setIsGuideOpen(false)}
        icon={<Bus className="w-6 h-6 text-white" />}
        title="Davao City Interim Bus Service DIBS"
        description="Official real-time bus telemetry, live road speeds, route corridors, and Davao City transit schedules."
        tips={[
          'Tap any bus on the map to inspect live speed, heading bearing, and route family.',
          'Buses animate smoothly as they drive between GPS coordinate fixes.',
          'Service operates Monday to Saturday 6:00 AM - 10:00 AM and 4:00 PM - 9:00 PM.',
          'Official zero-fare public transit for students and all Dabawenyos.'
        ]}
      />

      {/* INNER VIEWPORT FLEX MAP CONTAINER */}
      <div className="flex-1 min-h-0 relative w-full overflow-hidden">
        <DcBusLiveMap 
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenSchedule={() => setIsScheduleOpen(true)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onNavigateToJeep={onNavigateToJeep}
        />
      </div>

      {/* OFFICIAL DIBS OPERATING SCHEDULE & SERVICE ALERT MODAL */}
      {isScheduleOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-fade-in"
          onClick={() => setIsScheduleOpen(false)}
        >
          <div 
            className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] shadow-2xl flex flex-col animate-modal-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between gap-3 bg-[var(--nested-bg)]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    scheduleStatus.isOperational 
                      ? 'bg-[#30D158]/20 text-[#30D158]' 
                      : 'bg-[#FF9F0A]/20 text-[#FF9F0A]'
                  }`}>
                    {scheduleStatus.statusLabel}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">{scheduleStatus.manilaTimeFormatted}</span>
                </div>
                <h3 className="text-base font-black text-[var(--text-primary)]">
                  Official DIBS Operating Timetable
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all pressable"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Current Status Callout */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                scheduleStatus.isOperational
                  ? 'bg-[#30D158]/10 border-[#30D158]/30'
                  : 'bg-[#FF9F0A]/10 border-[#FF9F0A]/30'
              }`}>
                {scheduleStatus.isOperational ? (
                  <CheckCircle2 className="w-5 h-5 text-[#30D158] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[#FF9F0A] shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    {scheduleStatus.detailMessage}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {scheduleStatus.nextServiceTime}
                  </p>
                </div>
              </div>

              {/* Authentic DIBS Timetable List */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Regular Service Shifts
                </h5>

                <div className="space-y-2">
                  {DIBS_OFFICIAL_SCHEDULE_RULES.map((rule, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)]">{rule.shift}</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">{rule.days}</span>
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-secondary)]">{rule.hours}</p>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#30D158]/15 text-[#30D158] shrink-0">
                        Zero Fare
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Non-Affiliation Legal Disclaimer Box */}
              <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Info className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                  <span>Independent Non-Affiliation Notice</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {DIBS_OFFICIAL_DISCLAIMER}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--card-border)] bg-[var(--nested-bg)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Official Zero Fare Transit</span>
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs hover:opacity-90 transition-all pressable"
              >
                Close Timetable
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 14 DABAWENYO DCPLINADO RULES MODAL SHEET */}
      {isRulesOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-fade-in"
          onClick={() => setIsRulesOpen(false)}
        >
          <div 
            className="w-full max-w-xl max-h-[85vh] overflow-hidden rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] shadow-2xl flex flex-col animate-modal-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between gap-3 bg-[var(--nested-bg)]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#30D158]/20 text-[#30D158]">
                    100% Zero Fare Public Transit
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-semibold">₱0.00 Fare</span>
                </div>
                <h3 className="text-base font-black text-[var(--text-primary)]">
                  Dabawenyo DCPlinado 14 Official Rules
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all pressable"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                <Clock className="w-4 h-4 text-[var(--text-primary)] shrink-0" />
                <span>Operating Shifts: <strong>6:00 AM – 10:00 AM</strong> and <strong>4:00 PM – 9:00 PM</strong> Monday to Saturday across Toril, Mintal, Bangkal, Buhangin, and Panacan.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ETIQUETTE_RULES.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div
                      key={rule.num}
                      className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--card-bg)] text-[var(--text-primary)] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[var(--card-border)]">
                          {rule.num}
                        </span>
                        <Icon className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                        <h4 className="font-bold text-xs text-[var(--text-primary)]">
                          {rule.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                        {rule.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Disclaimer */}
              <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {DIBS_OFFICIAL_DISCLAIMER}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--card-border)] bg-[var(--nested-bg)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Official Davao City Interim Bus Service</span>
              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs hover:opacity-90 transition-all pressable"
              >
                Understood
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CLOUDFLARE TURNSTILE NOTICE MODAL */}
      {isNoticeOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-fade-in"
          onClick={() => setIsNoticeOpen(false)}
        >
          <div 
            className="w-full max-w-md overflow-hidden rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] shadow-2xl p-6 space-y-4 animate-modal-pop-in text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Live Bus Tracking Notice
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Live bus telemetry in the app is temporarily unavailable because the original website where data is sourced is protected by Cloudflare Turnstile security. Visit the original website directly to view real-time buses.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-left flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Original Website</p>
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">davaobus.davaocity.gov.ph/dibs</p>
              </div>
              <button
                type="button"
                onClick={() => window.open('https://davaobus.davaocity.gov.ph/dibs/', '_blank')}
                className="px-3.5 py-1.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center gap-1.5 shrink-0 pressable shadow-xs"
              >
                <span>Visit Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsNoticeOpen(false)}
                className="w-full py-2.5 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable"
              >
                Continue to Schedules &amp; Routes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
