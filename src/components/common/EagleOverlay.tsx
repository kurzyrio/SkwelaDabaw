import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  CloudSun, 
  BookOpen, 
  Compass, 
  Bus, 
  CheckSquare, 
  Users, 
  X, 
  Clock, 
  MapPin, 
  ChevronRight,
  ExternalLink,
  Zap
} from 'lucide-react';
import { db } from '../../db';
import { ClassSchedule, DayOfWeek } from '../../types';
import { fetchDavaoWeather, WeatherData } from '../../services/weatherService';
import { NavigationTab } from '../layout/Navbar';
import { EagleBuddy } from './EagleBuddy';
import { playEagleSound } from '../../utils/audio';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { Capacitor } from '@capacitor/core';

export const EAGLE_OVERLAY_STORAGE_KEY = 'skweladabaw_eagle_overlay_enabled';
const EAGLE_OVERLAY_POS_KEY = 'skweladabaw_eagle_overlay_position';

interface EagleOverlayProps {
  onNavigate: (tab: NavigationTab) => void;
  currentTab: NavigationTab;
}

const DAY_NAME_MAP: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

/** Safe time parser that handles "HH:MM", "H:MM AM/PM", and extra whitespace cleanly without NaN */
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const upper = timeStr.trim().toUpperCase();
  const isPm = upper.includes('PM');
  const isAm = upper.includes('AM');
  const cleaned = upper.replace('AM', '').replace('PM', '').trim();
  const [hStr, mStr] = cleaned.split(':');
  let h = parseInt(hStr, 10) || 0;
  let m = parseInt((mStr || '').replace(/\D/g, ''), 10) || 0;
  if (isPm && h < 12) h += 12;
  else if (isAm && h === 12) h = 0;
  return h * 60 + m;
}

export const EagleOverlay: React.FC<EagleOverlayProps> = ({ onNavigate, currentTab }) => {
  // Mobile Android Only: strictly never mount or render floating overlay on desktop/web browsers
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    return localStorage.getItem(EAGLE_OVERLAY_STORAGE_KEY) !== 'false';
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [upNextClass, setUpNextClass] = useState<{
    schedule: ClassSchedule;
    isOngoing: boolean;
    minutesUntil: number;
  } | null>(null);
  const [todayClassCount, setTodayClassCount] = useState<number>(0);

  // Hardware Back Button Interception for expanded quick info popover
  useBackHandler(isExpanded, () => setIsExpanded(false), BackPriority.MODAL, 'eagle_overlay_modal');

  // Dragging coordinates
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(EAGLE_OVERLAY_POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (_) {}
    // Default: Right edge, vertically centered
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 380;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 700;
    return { x: winWidth - 68, y: Math.max(120, winHeight * 0.45) };
  });

  // Track latest coordinates in a ref to avoid stale closure state during mouse/touch end
  const currentPosRef = useRef<{ x: number; y: number }>({ x: position.x, y: position.y });
  useEffect(() => {
    currentPosRef.current = position;
  }, [position]);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    moved: false
  });

  // Listen for settings toggle events and position reset
  useEffect(() => {
    const handleStorageChange = () => {
      setIsEnabled(localStorage.getItem(EAGLE_OVERLAY_STORAGE_KEY) !== 'false');
    };
    const handleResetPos = () => {
      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 380;
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 700;
      const defaultPos = { x: winWidth - 68, y: Math.max(120, winHeight * 0.45) };
      currentPosRef.current = defaultPos;
      setPosition(defaultPos);
      try {
        localStorage.setItem(EAGLE_OVERLAY_POS_KEY, JSON.stringify(defaultPos));
      } catch (_) {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('skwela_overlay_setting_changed', handleStorageChange);
    window.addEventListener('skweladabaw_eagle_overlay_toggled', handleStorageChange);
    window.addEventListener('skweladabaw_eagle_overlay_reset_pos', handleResetPos);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('skwela_overlay_setting_changed', handleStorageChange);
      window.removeEventListener('skweladabaw_eagle_overlay_toggled', handleStorageChange);
      window.removeEventListener('skweladabaw_eagle_overlay_reset_pos', handleResetPos);
    };
  }, []);

  // Fetch weather and upcoming schedule
  const refreshQuickInfo = useCallback(async () => {
    try {
      // 1. Weather
      const wData = await fetchDavaoWeather().catch(() => null);
      if (wData) setWeather(wData);

      // 2. Schedule
      const now = new Date();
      const currentDay = DAY_NAME_MAP[now.getDay()];
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTotalMin = currentHour * 60 + currentMin;

      const schedules = await db.schedules.toArray();
      // Support full day names, "Everyday", and prefix matching (e.g. "Mon" matching "Monday")
      const todayClasses = schedules.filter(s => {
        if (!Array.isArray(s.days)) return false;
        return s.days.some(d => {
          const trimmed = (d || '').trim();
          return trimmed === currentDay || trimmed === 'Everyday' || currentDay.startsWith(trimmed);
        });
      });

      // Sort today classes by start time
      todayClasses.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
      setTodayClassCount(todayClasses.length);

      let upcoming: { schedule: ClassSchedule; isOngoing: boolean; minutesUntil: number } | null = null;
      let minDiff = Infinity;

      for (const s of todayClasses) {
        const startMin = parseTimeToMinutes(s.startTime);
        const endMin = parseTimeToMinutes(s.endTime);

        // Ongoing class
        if (currentTotalMin >= startMin && currentTotalMin <= endMin) {
          upcoming = {
            schedule: s,
            isOngoing: true,
            minutesUntil: 0
          };
          break;
        }

        // Upcoming later today
        if (startMin > currentTotalMin) {
          const diff = startMin - currentTotalMin;
          if (diff < minDiff) {
            minDiff = diff;
            upcoming = {
              schedule: s,
              isOngoing: false,
              minutesUntil: diff
            };
          }
        }
      }

      setUpNextClass(upcoming);
    } catch (err) {
      console.warn('EagleOverlay refreshQuickInfo note:', err);
    }
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    refreshQuickInfo();
    const interval = setInterval(refreshQuickInfo, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isEnabled, refreshQuickInfo]);

  // Handle snapping to edge
  const snapToEdge = useCallback((x: number, y: number) => {
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const buttonSize = 54;
    const margin = 16;
    const topSafe = 80;
    const bottomSafe = winHeight - 110;

    // Clamped Y
    const clampedY = Math.min(Math.max(y, topSafe), bottomSafe);

    // Snap X to nearest horizontal edge (left or right)
    const midX = winWidth / 2;
    const clampedX = x < midX ? margin : winWidth - buttonSize - margin;

    const finalPos = { x: clampedX, y: clampedY };
    currentPosRef.current = finalPos;
    setPosition(finalPos);
    try {
      localStorage.setItem(EAGLE_OVERLAY_POS_KEY, JSON.stringify(finalPos));
    } catch (_) {}
  }, []);

  // Window resize guard
  useEffect(() => {
    const handleResize = () => {
      snapToEdge(currentPosRef.current.x, currentPosRef.current.y);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [snapToEdge]);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initX: currentPosRef.current.x,
      initY: currentPosRef.current.y,
      moved: false
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.startX;
    const dy = touch.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      dragStartRef.current.moved = true;
    }

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const buttonSize = 54;
    const newX = Math.min(Math.max(dragStartRef.current.initX + dx, 0), winWidth - buttonSize);
    const newY = Math.min(Math.max(dragStartRef.current.initY + dy, 40), winHeight - buttonSize);

    currentPosRef.current = { x: newX, y: newY };
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (!dragStartRef.current.moved) {
      // Tap detected! Open popover
      playEagleSound('chirp');
      refreshQuickInfo();
      setIsExpanded(true);
    } else {
      snapToEdge(currentPosRef.current.x, currentPosRef.current.y);
    }
  };

  // Mouse Handlers (Desktop / Dev testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentPosRef.current.x,
      initY: currentPosRef.current.y,
      moved: false
    };
    setIsDragging(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        dragStartRef.current.moved = true;
      }
      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;
      const buttonSize = 54;
      const newX = Math.min(Math.max(dragStartRef.current.initX + dx, 0), winWidth - buttonSize);
      const newY = Math.min(Math.max(dragStartRef.current.initY + dy, 40), winHeight - buttonSize);

      currentPosRef.current = { x: newX, y: newY };
      setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsDragging(false);
      if (!dragStartRef.current.moved) {
        playEagleSound('chirp');
        refreshQuickInfo();
        setIsExpanded(true);
      } else {
        snapToEdge(currentPosRef.current.x, currentPosRef.current.y);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // On native Android, the floating Eagle Overlay is rendered system-wide by the native EagleOverlayService.
  // Rendering the React bubble in the WebView would cause duplicate floating bubbles.
  if (Capacitor.isNativePlatform() || !isEnabled) return null;

  return (
    <>
      {/* Floating AssistiveTouch Eagle Pill Button */}
      {!isExpanded && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Open Eagle Quick Menu"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.2s ease',
            willChange: 'transform'
          }}
          className={`fixed top-0 left-0 z-[80] w-[54px] h-[54px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none shadow-xl border border-sky-400/40 bg-slate-900/85 dark:bg-black/85 backdrop-blur-md transition-opacity hover:opacity-100 ${
            isDragging ? 'scale-105 opacity-100 ring-2 ring-sky-400/60' : 'opacity-85 hover:opacity-100'
          }`}
        >
          {/* Subtle Ambient Pulse Ring */}
          <div className="absolute inset-0 rounded-full border border-sky-400/30 animate-pulse pointer-events-none" />

          {/* Eagle Mascot Icon */}
          <div className="w-10 h-10 pointer-events-none flex items-center justify-center">
            <EagleBuddy
              mood={upNextClass?.isOngoing ? 'focused' : 'friendly'}
              width={38}
              height={38}
              showSpeech={false}
              isAnimated={false}
              isLoading={false}
            />
          </div>

          {/* Badge indicator if class is ongoing or coming soon */}
          {upNextClass && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                upNextClass.isOngoing ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-900 ${
                upNextClass.isOngoing ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
          )}
        </div>
      )}

      {/* Expanded Quick Info Glass Popover Modal */}
      {isExpanded && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] p-5 shadow-2xl flex flex-col gap-4 animate-scale-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <EagleBuddy
                    mood="friendly"
                    width={32}
                    height={32}
                    showSpeech={false}
                    isAnimated={false}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight">
                    Eagle Quick Glance
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Davao City Student Companion
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Live Weather & Davao Temperature Card */}
            <div 
              onClick={() => {
                setIsExpanded(false);
                onNavigate('weather');
              }}
              className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-sky-500/40 transition-all cursor-pointer group space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <CloudSun className="w-4 h-4 text-sky-500" />
                  <span>Davao City Weather</span>
                </div>
                <span className="text-[10px] font-semibold text-sky-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Details <ChevronRight className="w-3 h-3" />
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-0.5">
                <div>
                  <span className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                    {weather?.current?.temp != null ? `${Math.round(weather.current.temp)}°C` : '29°C'}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-medium ml-2">
                    {weather?.current?.condition || 'Fair / Partly Cloudy'}
                  </span>
                </div>
                {(weather?.current?.heatIndex != null || weather?.advisory?.todayHeatMax != null) && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Heat Index: {Math.round(weather?.current?.heatIndex ?? weather?.advisory?.todayHeatMax ?? 32)}°C
                  </span>
                )}
              </div>
            </div>

            {/* 2. Up Next (Classes) Card */}
            <div 
              onClick={() => {
                setIsExpanded(false);
                onNavigate('schedule');
              }}
              className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-emerald-500/40 transition-all cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span>
                    {upNextClass?.isOngoing ? 'Class In Progress' : 'Up Next'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Schedule <ChevronRight className="w-3 h-3" />
                </span>
              </div>

              {upNextClass ? (
                <div className="bg-[var(--nested-bg)] rounded-xl p-2.5 space-y-1 border border-[var(--card-border)]/60">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--text-primary)]">
                      {upNextClass.schedule.subjectCode}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      upNextClass.isOngoing 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    }`}>
                      {upNextClass.isOngoing ? 'Happening Now' : `In ${upNextClass.minutesUntil} min`}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                    {upNextClass.schedule.subjectName}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {upNextClass.schedule.startTime} - {upNextClass.schedule.endTime}
                    </span>
                    {upNextClass.schedule.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        Rm {upNextClass.schedule.room}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--nested-bg)] rounded-xl p-3 text-center space-y-0.5 border border-[var(--card-border)]/60">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {todayClassCount > 0 ? 'All classes done for today!' : 'No classes scheduled today'}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Enjoy your free time or review upcoming lessons.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Quick Actions Grid */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
                Quick Actions
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('schedule');
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] transition-all pressable cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-sky-500" />
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">Classes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('tasks');
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] transition-all pressable cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">Tasks</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('jeep');
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] transition-all pressable cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">Jeepney</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('dcbus');
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] transition-all pressable cursor-pointer"
                >
                  <Bus className="w-4 h-4 text-rose-500" />
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">DC Bus</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('weather');
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] transition-all pressable cursor-pointer"
                >
                  <CloudSun className="w-4 h-4 text-indigo-500" />
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">Weather</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onNavigate('community');
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] transition-all pressable cursor-pointer"
                >
                  <Users className="w-4 h-4 text-purple-500" />
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">Community</span>
                </button>
              </div>
            </div>

            {/* Bottom Dismiss Tip */}
            <div className="pt-1 text-center">
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Drag the Eagle icon anytime to reposition along screen edges
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EagleOverlay;
