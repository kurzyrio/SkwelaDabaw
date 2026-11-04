import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Trash2, 
  Edit3, 
  X, 
  CalendarCheck, 
  AlertCircle,
  ListTodo,
  Upload,
  Bell,
  Share2,
  Sun,
  Shield,
  Wallet,
  Smartphone,
  Check,
  RefreshCw,
  MoreHorizontal,
  QrCode
} from 'lucide-react';
import { db } from '../../db';
import { ClassSchedule, DayOfWeek } from '../../types';
import { DayReminderManager } from './DayReminderManager';
import { PageIntroGuide } from '../common/PageIntroGuide';
import { ScheduleImportModal } from './ScheduleImportModal';
import { ScheduleShareModal } from './ScheduleShareModal';
import { CustomTimePickerModal } from '../common/CustomTimePickerModal';
import { 
  scheduleClassScheduleReminder, 
  scheduleAllClassSchedulesReminders,
  cancelScheduleReminder,
  scheduleFirstClassDailyReminder,
  scheduleCommuteAndEasterNotifications,
  refreshUnremovableClassNotification
} from '../../services/notificationService';
import { syncScheduleToWidgets } from '../../services/widgetService';
import { getSavedSession } from '../../services/authService';
import { backupSchedulesToCloud, syncUserSchedules } from '../../services/userService';
import { syncCloudDataBiDirectional } from '../../services/cloudSyncService';
import { playEagleSound } from '../../utils/audio';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { EagleBuddy } from '../common/EagleBuddy';


const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#ea580c', // Orange
  '#7c3aed', // Purple
  '#e11d48', // Rose
  '#0891b2', // Cyan
  '#d97706', // Amber
  '#4f46e5', // Indigo
];

export const formatTime12h = (t24: string) => {
  if (!t24) return '08:00 AM';
  const parts = t24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return t24;
  const p = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m} ${p}`;
};

interface ScheduleManagerProps {
  onOpenImport?: () => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({ onOpenImport }) => {
  const [activeSubTab, setActiveSubTab] = useState<'today' | 'weekly' | 'reminders'>(() => {
    const pref = localStorage.getItem('skweladabaw_default_view');
    if (pref === 'grid' || pref === 'weekly') return 'weekly';
    return 'today';
  });
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleTriggerImport = () => {
    if (onOpenImport) {
      onOpenImport();
    } else {
      window.dispatchEvent(new CustomEvent('skweladabaw_open_import'));
    }
  };
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<ClassSchedule | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);

  // Delete All Schedules Safety Modal State
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);

  // Manual Cloud Sync State
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [cloudSyncFeedback, setCloudSyncFeedback] = useState<string | null>(null);

  // Android Widget Customizer State
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState<boolean>(false);
  const [selectedWidgetSize, setSelectedWidgetSize] = useState<'small' | 'medium' | 'large' | 'tasks'>('medium');

  // Cloud Schedule Sync Conflict State
  const [conflictData, setConflictData] = useState<{
    localSchedules: ClassSchedule[];
    cloudSchedules: ClassSchedule[];
    uid: string;
  } | null>(null);
  const [overlapWarningItems, setOverlapWarningItems] = useState<{
    local: ClassSchedule;
    cloud: ClassSchedule;
  }[] | null>(null);
  const [individualOverlapChoices, setIndividualOverlapChoices] = useState<Record<number, 'local' | 'cloud' | 'both'>>({});

  // Hardware Back Button Interception for Modals in ScheduleManager (LIFO)
  useBackHandler(isMoreMenuOpen, () => setIsMoreMenuOpen(false), BackPriority.POPUP, 'sch_more_menu');
  useBackHandler(Boolean(timePickerTarget), () => setTimePickerTarget(null), BackPriority.POPUP, 'sch_time_picker');
  useBackHandler(Boolean(scheduleToDelete), () => setScheduleToDelete(null), BackPriority.MODAL, 'sch_delete_confirm');
  useBackHandler(isDeleteAllModalOpen, () => setIsDeleteAllModalOpen(false), BackPriority.MODAL, 'sch_delete_all');
  useBackHandler(isWidgetModalOpen, () => setIsWidgetModalOpen(false), BackPriority.MODAL, 'sch_widget_modal');
  useBackHandler(isShareModalOpen, () => setIsShareModalOpen(false), BackPriority.MODAL, 'sch_share_modal');
  useBackHandler(isImportModalOpen, () => setIsImportModalOpen(false), BackPriority.MODAL, 'sch_import_modal');
  useBackHandler(Boolean(conflictData), () => setConflictData(null), BackPriority.MODAL, 'sch_conflict_modal');
  useBackHandler(Boolean(editingSchedule), () => setEditingSchedule(null), BackPriority.MODAL, 'sch_edit_modal');
  useBackHandler(isModalOpen, () => setIsModalOpen(false), BackPriority.MODAL, 'sch_add_modal');

  // Allowance Connection State
  const [connectAllowance, setConnectAllowance] = useState<boolean>(() => {
    return localStorage.getItem('skweladabaw_connect_allowance') === 'true';
  });
  const dailyBaonBudget = Number(localStorage.getItem('skweladabaw_baon_budget')) || 150;

  useEffect(() => {
    const handleAllowanceToggle = (e: any) => {
      if (typeof e?.detail?.enabled === 'boolean') {
        setConnectAllowance(e.detail.enabled);
      } else {
        setConnectAllowance(localStorage.getItem('skweladabaw_connect_allowance') === 'true');
      }
    };
    window.addEventListener('skweladabaw_allowance_toggled', handleAllowanceToggle);
    window.addEventListener('storage', handleAllowanceToggle);
    return () => {
      window.removeEventListener('skweladabaw_allowance_toggled', handleAllowanceToggle);
      window.removeEventListener('storage', handleAllowanceToggle);
    };
  }, []);

  // Listen for Cloud Schedule Sync Conflicts
  useEffect(() => {
    const handleConflict = (e: any) => {
      if (e?.detail?.localSchedules && e?.detail?.cloudSchedules && e?.detail?.uid) {
        setConflictData(e.detail);
      }
    };
    window.addEventListener('skweladabaw_schedule_conflict', handleConflict);
    return () => {
      window.removeEventListener('skweladabaw_schedule_conflict', handleConflict);
    };
  }, []);

  // Conflict Resolution Handlers
  const handleResolveReplaceLocal = async () => {
    if (!conflictData) return;
    try {
      await db.schedules.clear();
      await db.schedules.bulkAdd(conflictData.cloudSchedules);
      setConflictData(null);
      setOverlapWarningItems(null);
    } catch (err) {
      console.warn('Error replacing local schedules:', err);
    }
  };

  const handleResolveKeepLocal = async () => {
    if (!conflictData) return;
    try {
      await backupSchedulesToCloud(conflictData.uid, conflictData.localSchedules);
      setConflictData(null);
      setOverlapWarningItems(null);
    } catch (err) {
      console.warn('Error keeping local schedules:', err);
    }
  };

  const handleResolveCombine = async () => {
    if (!conflictData) return;
    const { localSchedules, cloudSchedules, uid } = conflictData;
    const overlaps: { local: ClassSchedule; cloud: ClassSchedule }[] = [];
    const mergedList: ClassSchedule[] = [...localSchedules];

    cloudSchedules.forEach((cloudItem) => {
      const existingExact = mergedList.find(
        (m) => m.subjectCode.toLowerCase() === cloudItem.subjectCode.toLowerCase() && m.startTime === cloudItem.startTime
      );
      if (existingExact) return;

      const collision = mergedList.find((m) => {
        const sharedDay = m.days.some((d) => cloudItem.days.includes(d));
        if (!sharedDay) return false;
        return m.startTime < cloudItem.endTime && m.endTime > cloudItem.startTime;
      });

      if (collision) {
        overlaps.push({ local: collision, cloud: cloudItem });
      } else {
        const { id, ...rest } = cloudItem;
        mergedList.push(rest as ClassSchedule);
      }
    });

    if (overlaps.length > 0) {
      setOverlapWarningItems(overlaps);
      return;
    }

    try {
      await db.schedules.clear();
      await db.schedules.bulkAdd(mergedList);
      await backupSchedulesToCloud(uid, mergedList);
      setConflictData(null);
      setOverlapWarningItems(null);
    } catch (err) {
      console.warn('Error combining schedules:', err);
    }
  };

  const handleResolveOverlapKeepLocal = async () => {
    if (!conflictData) return;
    const { localSchedules, cloudSchedules, uid } = conflictData;
    const nonCollidingCloud = cloudSchedules.filter((c) => {
      return !overlapWarningItems?.some((ov) => ov.cloud.subjectCode === c.subjectCode && ov.cloud.startTime === c.startTime);
    });
    const merged = [...localSchedules, ...nonCollidingCloud.map(({ id, ...rest }) => rest as ClassSchedule)];
    try {
      await db.schedules.clear();
      await db.schedules.bulkAdd(merged);
      await backupSchedulesToCloud(uid, merged);
      setConflictData(null);
      setOverlapWarningItems(null);
    } catch (err) {
      console.warn('Error resolving overlap keep local:', err);
    }
  };

  const handleResolveOverlapKeepCloud = async () => {
    if (!conflictData) return;
    const { localSchedules, cloudSchedules, uid } = conflictData;
    const filteredLocal = localSchedules.filter((l) => {
      return !overlapWarningItems?.some((ov) => ov.local.subjectCode === l.subjectCode && ov.local.startTime === l.startTime);
    });
    const merged = [...filteredLocal, ...cloudSchedules.map(({ id, ...rest }) => rest as ClassSchedule)];
    try {
      await db.schedules.clear();
      await db.schedules.bulkAdd(merged);
      await backupSchedulesToCloud(uid, merged);
      setConflictData(null);
      setOverlapWarningItems(null);
    } catch (err) {
      console.warn('Error resolving overlap keep cloud:', err);
    }
  };

  const handleResolveOverlapKeepBoth = async () => {
    if (!conflictData) return;
    const { localSchedules, cloudSchedules, uid } = conflictData;
    const merged = [...localSchedules, ...cloudSchedules.map(({ id, ...rest }) => rest as ClassSchedule)];
    try {
      await db.schedules.clear();
      await db.schedules.bulkAdd(merged);
      await backupSchedulesToCloud(uid, merged);
      setConflictData(null);
      setOverlapWarningItems(null);
    } catch (err) {
      console.warn('Error resolving overlap keep both:', err);
    }
  };

  // Granular Selective Conflict Overlap Resolution
  const handleResolveIndividualOverlaps = async () => {
    if (!conflictData || !overlapWarningItems) return;
    const { localSchedules, cloudSchedules, uid } = conflictData;
    
    // Non-colliding cloud items
    const nonCollidingCloud = cloudSchedules.filter((c) => {
      return !overlapWarningItems.some((ov) => ov.cloud.subjectCode === c.subjectCode && ov.cloud.startTime === c.startTime);
    });

    // Non-colliding local items
    const nonCollidingLocal = localSchedules.filter((l) => {
      return !overlapWarningItems.some((ov) => ov.local.subjectCode === l.subjectCode && ov.local.startTime === l.startTime);
    });

    const resolvedItems: ClassSchedule[] = [
      ...nonCollidingLocal, 
      ...nonCollidingCloud.map(({ id, ...rest }) => rest as ClassSchedule)
    ];

    overlapWarningItems.forEach((item, idx) => {
      const choice = individualOverlapChoices[idx] || 'local';
      if (choice === 'local') {
        resolvedItems.push(item.local);
      } else if (choice === 'cloud') {
        const { id, ...rest } = item.cloud;
        resolvedItems.push(rest as ClassSchedule);
      } else {
        resolvedItems.push(item.local);
        const { id, ...rest } = item.cloud;
        resolvedItems.push(rest as ClassSchedule);
      }
    });

    try {
      await db.schedules.clear();
      await db.schedules.bulkAdd(resolvedItems);
      await backupSchedulesToCloud(uid, resolvedItems);
      setConflictData(null);
      setOverlapWarningItems(null);
      setIndividualOverlapChoices({});
      playEagleSound('success');
    } catch (err) {
      console.warn('Error applying selective overlap choices:', err);
    }
  };

  // Manual Cloud Sync Trigger
  const handleManualCloudSync = async () => {
    const session = getSavedSession();
    if (!session.isLoggedIn || !session.uid) {
      setCloudSyncFeedback('Sign in with Google in Settings to sync with cloud.');
      setTimeout(() => setCloudSyncFeedback(null), 3500);
      return;
    }

    setIsSyncingCloud(true);
    setCloudSyncFeedback(null);
    try {
      const res = await syncCloudDataBiDirectional();
      if (res.success) {
        setCloudSyncFeedback(`Synced! (${res.scheduleCount} classes up to date)`);
      } else {
        setCloudSyncFeedback(res.message || 'Sync check completed.');
      }
    } catch (err: any) {
      console.warn('Manual cloud sync note:', err);
      setCloudSyncFeedback('Sync check completed.');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setCloudSyncFeedback(null), 3500);
    }
  };

  // Delete All Schedules Handler
  const handleConfirmDeleteAll = async () => {
    try {
      for (const s of schedules) {
        if (s.id) cancelScheduleReminder(s.id);
      }
      await db.schedules.clear();

      const userSession = getSavedSession();
      const cacheKey = userSession.isLoggedIn && userSession.uid
        ? `skweladabaw_cached_schedules_${userSession.uid}`
        : 'skweladabaw_cached_schedules_guest';
      localStorage.setItem(cacheKey, JSON.stringify([]));

      refreshUnremovableClassNotification([]);
      syncScheduleToWidgets([]);

      if (userSession.isLoggedIn && userSession.uid) {
        await backupSchedulesToCloud(userSession.uid, []);
      }
      playEagleSound('alert');
    } catch (err) {
      console.warn('Error deleting all schedules:', err);
    }
    setIsDeleteAllModalOpen(false);
  };

  // Form State
  const [ofrCode, setOfrCode] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [room, setRoom] = useState('');
  const [building, setBuilding] = useState('');
  const [instructor, setInstructor] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Monday', 'Wednesday', 'Friday']);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [units, setUnits] = useState(3);
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(0);
  const [isCustomReminder, setIsCustomReminder] = useState<boolean>(false);

  // Live Query from IndexedDB
  const schedules = useLiveQuery(() => db.schedules.toArray(), []) || [];

  // Register class reminder alarms for all subjects, commute greetings, unremovable notification & home screen widgets
  useEffect(() => {
    if (schedules) {
      if (schedules.length > 0) {
        scheduleAllClassSchedulesReminders(schedules);
        scheduleCommuteAndEasterNotifications(schedules);
      }
      refreshUnremovableClassNotification(schedules);
      syncScheduleToWidgets(schedules);
    }
  }, [schedules]);

  // Determine current day of week
  useEffect(() => {
    const dayIndex = new Date().getDay();
    const dayMap: Record<number, DayOfWeek> = {
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
      0: 'Sunday'
    };
    if (dayMap[dayIndex]) {
      setSelectedDay(dayMap[dayIndex]);
    }
  }, []);

  const openAddModal = () => {
    setEditingSchedule(null);
    setOfrCode('');
    setSubjectCode('');
    setSubjectName('');
    setRoom('');
    setBuilding('');
    setInstructor('');
    setSelectedDays([selectedDay]);
    setStartTime('08:00');
    setEndTime('09:30');
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setUnits(3);
    setNotes('');
    setReminderMinutes(0);
    setIsCustomReminder(false);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleOpenAdd = () => {
      openAddModal();
    };
    window.addEventListener('skweladabaw_open_add_class', handleOpenAdd);
    return () => window.removeEventListener('skweladabaw_open_add_class', handleOpenAdd);
  }, []);

  const openEditModal = (item: ClassSchedule) => {
    setEditingSchedule(item);
    setOfrCode(item.ofrCode || '');
    setSubjectCode(item.subjectCode);
    setSubjectName(item.subjectName);
    setRoom(item.room || '');
    setBuilding(item.building || '');
    setInstructor(item.instructor || '');
    setSelectedDays(item.days);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setColor(item.color);
    setUnits(item.units || 3);
    setNotes(item.notes || '');
    const rem = item.reminderMinutes !== undefined && item.reminderMinutes !== null ? item.reminderMinutes : 0;
    setReminderMinutes(rem);
    setIsCustomReminder(![0, 10, 15, 30, 60].includes(rem));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCode.trim() || selectedDays.length === 0) return;

    const data: ClassSchedule = {
      ofrCode: ofrCode.trim(),
      subjectCode: subjectCode.toUpperCase().trim(),
      subjectName: subjectName.trim() || subjectCode.toUpperCase().trim(),
      room: room.trim(),
      building: building.trim(),
      instructor: instructor.trim(),
      days: selectedDays,
      startTime,
      endTime,
      color,
      units: Number(units) || 3,
      notes: notes.trim(),
      reminderMinutes: reminderMinutes || 0
    };

    if (editingSchedule?.id) {
      await db.schedules.update(editingSchedule.id, data as any);
      if (reminderMinutes && reminderMinutes > 0) {
        scheduleClassScheduleReminder({ ...data, id: editingSchedule.id });
      } else {
        cancelScheduleReminder(editingSchedule.id);
      }
    } else {
      const id = await db.schedules.add(data);
      if (reminderMinutes && reminderMinutes > 0) {
        scheduleClassScheduleReminder({ ...data, id: Number(id) });
      }
    }

    // Sync to account-scoped local cache & cloud
    try {
      const allNow = await db.schedules.toArray();
      const userSession = getSavedSession();
      const cacheKey = userSession.isLoggedIn && userSession.uid
        ? `skweladabaw_cached_schedules_${userSession.uid}`
        : 'skweladabaw_cached_schedules_guest';
      localStorage.setItem(cacheKey, JSON.stringify(allNow));
      refreshUnremovableClassNotification(allNow);
      syncScheduleToWidgets(allNow);
      if (userSession.isLoggedIn && userSession.uid) {
        backupSchedulesToCloud(userSession.uid, allNow, false, userSession);
      }
    } catch (_) {}

    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete?.id) return;
    await db.schedules.delete(scheduleToDelete.id);
    cancelScheduleReminder(scheduleToDelete.id);
    setScheduleToDelete(null);

    // Sync to account-scoped local cache & cloud
    try {
      const allNow = await db.schedules.toArray();
      const userSession = getSavedSession();
      const cacheKey = userSession.isLoggedIn && userSession.uid
        ? `skweladabaw_cached_schedules_${userSession.uid}`
        : 'skweladabaw_cached_schedules_guest';
      localStorage.setItem(cacheKey, JSON.stringify(allNow));
      refreshUnremovableClassNotification(allNow);
      syncScheduleToWidgets(allNow);
      if (userSession.isLoggedIn && userSession.uid) {
        backupSchedulesToCloud(userSession.uid, allNow, false, userSession);
      }
    } catch (_) {}
  };

  const toggleDaySelection = (day: DayOfWeek) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Filter schedules for the selected day
  const todaySchedules = schedules
    .filter((s) => s.days.includes(selectedDay))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Calculate total enrolled units
  const totalUnits = schedules.reduce((acc, curr) => acc + (curr.units || 0), 0);

  return (
    <div className="space-y-4 pb-16 md:pb-6 animate-fade-in">
      <PageIntroGuide
        pageKey="schedule"
        icon={<CalendarIcon className="w-6 h-6 text-white" />}
        title="Class Schedule &amp; Timetable"
        description="Manage lecture periods, room assignments, weekly schedules, and semester unit loads."
        tips={[
          'Switch between Today, Weekly Timetable, and Day Routine Reminders.',
          'Schedule data is stored solely for easily porting between devices and lecture alarms.'
        ]}
      />

      {/* Header & Inset Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--card-border)]">
        
        {/* iOS Segmented Subtabs */}
        <div className="flex items-center gap-1 p-1 bg-[var(--nested-bg)] border border-[var(--card-border)] rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('today');
              localStorage.setItem('skweladabaw_default_view', 'today');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all pressable ${
              activeSubTab === 'today'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Today's Classes"
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('weekly');
              localStorage.setItem('skweladabaw_default_view', 'weekly');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all pressable ${
              activeSubTab === 'weekly'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Weekly Timetable"
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Weekly</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reminders')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all pressable ${
              activeSubTab === 'reminders'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Weekly Day Routine Alarms"
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span>Routines</span>
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        {(activeSubTab === 'today' || activeSubTab === 'weekly') && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto relative">
            {/* Primary Add Class Button */}
            <button
              type="button"
              onClick={openAddModal}
              className="px-3.5 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center justify-center gap-1.5 pressable shadow-xs transition-all"
              title="Add Course"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--btn-primary-text)]" />
              <span>Add Class</span>
            </button>

            {/* More Options Dropdown (Share, Import, Widgets, Cloud Sync, Delete All) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(prev => !prev)}
                className={`p-2 rounded-xl border text-xs font-bold transition-all pressable ${
                  isMoreMenuOpen 
                    ? 'border-[var(--card-hover-border)] bg-[var(--card-bg)] text-[var(--text-primary)]' 
                    : 'border-[var(--card-border)] bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="More Schedule Options"
                aria-label="More Schedule Options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsMoreMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-40 w-52 p-1.5 rounded-2xl bg-[var(--card-bg)]/95 backdrop-blur-xl border border-[var(--card-border)] shadow-xl animate-fade-in space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsShareModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors text-left pressable"
                    >
                      <QrCode className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Share QR Schedule</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleTriggerImport();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors text-left pressable"
                    >
                      <Upload className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Import Schedule</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsWidgetModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors text-left pressable"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Home Screen Widgets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleManualCloudSync();
                      }}
                      disabled={isSyncingCloud}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors text-left pressable disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 text-blue-500 shrink-0 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                      <span>{isSyncingCloud ? 'Syncing...' : 'Sync to Cloud Backup'}</span>
                    </button>

                    {schedules.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsDeleteAllModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors text-left pressable border-t border-[var(--card-border)]/50 pt-2"
                      >
                        <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>Delete All Classes</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cloud Sync Status Feedback */}
      {cloudSyncFeedback && (
        <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-center text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 animate-fade-in shadow-xs">
          <span>{cloudSyncFeedback}</span>
        </div>
      )}

      {/* RENDER DAY ROUTINE REMINDERS SUBTAB */}
      {activeSubTab === 'reminders' && <DayReminderManager />}

      {/* RENDER TODAY / AGENDA SUBTAB */}
      {activeSubTab === 'today' && (
        <div className="space-y-4 animate-fade-in">
          {/* Optional Connected Daily Allowance Widget */}
          {connectAllowance && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Today's Allowance Budget</span>
                  <span className="text-xs font-black text-[var(--text-primary)]">₱{dailyBaonBudget.toFixed(2)} Available</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('skweladabaw_navigate_tab', { detail: 'budget' }));
                }}
                className="px-3 py-1.5 rounded-full bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-xs font-bold text-[var(--text-primary)] transition-all pressable border border-[var(--card-border)]"
              >
                Open Baon Tracker
              </button>
            </div>
          )}

          {/* Day Selector Inset Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {DAYS.map((day) => {
              const isSelected = selectedDay === day;
              const dayClassesCount = schedules.filter((s) => s.days.includes(day)).length;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex flex-col items-center px-4 py-2 rounded-2xl text-xs font-semibold border transition-all min-w-[76px] pressable ${
                    isSelected
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-bg)] shadow-sm'
                      : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{day.substring(0, 3)}</span>
                  <span className={`text-[10px] font-normal mt-0.5 ${isSelected ? 'text-[var(--btn-primary-text)]/75' : 'text-[var(--text-secondary)]'}`}>
                    {dayClassesCount} {dayClassesCount === 1 ? 'class' : 'classes'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Today Overview Header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>{selectedDay} Classes</span>
              <span className="text-xs font-normal text-[var(--text-secondary)]">
                • {todaySchedules.length} {todaySchedules.length === 1 ? 'subject' : 'subjects'}
              </span>
            </h2>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Total Enrolled: <strong className="text-[var(--text-primary)]">{totalUnits} units</strong>
            </span>
          </div>

          {/* Schedule List in Grouped Inset Cards */}
          {todaySchedules.length === 0 ? (
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 text-center space-y-3">
              <div className="flex justify-center">
                <EagleBuddy
                  mood={selectedDay === 'Sunday' || selectedDay === 'Saturday' ? 'sleepy' : 'friendly'}
                  width={110}
                  height={120}
                  showSpeech={false}
                  isAnimated={true}
                />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-sm">No classes on {selectedDay}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {selectedDay === 'Sunday' || selectedDay === 'Saturday' 
                    ? 'Day off! Rest well or review your upcoming lessons, Dabawenyo.'
                    : 'Add your subjects or import your university schedule.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                <button
                  onClick={handleTriggerImport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-full text-xs font-semibold pressable"
                >
                  <Upload className="w-3.5 h-3.5" /> Import Schedule
                </button>
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-full text-xs font-bold pressable"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Class
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todaySchedules.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] shadow-sm relative overflow-hidden group transition-all pressable"
                  style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.ofrCode && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]">
                            OFR: {item.ofrCode}
                          </span>
                        )}
                        <span 
                          className="px-2 py-0.5 rounded-md text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.subjectCode}
                        </span>
                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                          {item.units || 3} Units
                        </span>

                        {item.reminderMinutes && item.reminderMinutes > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--card-border)] flex items-center gap-1">
                            <Bell className="w-3 h-3 text-[#FF9F0A]" />
                            <span>{item.reminderMinutes}m</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-[var(--text-primary)] text-sm line-clamp-1">
                        {item.subjectName}
                      </h4>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors cursor-pointer"
                        title="Edit Subject"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setScheduleToDelete(item)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[#FF453A] hover:bg-[var(--nested-bg)] transition-colors cursor-pointer"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="mt-3 pt-3 border-t border-[var(--card-border)] grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                      <span className="font-medium text-[var(--text-primary)]">
                        {formatTime12h(item.startTime)} - {formatTime12h(item.endTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                      <span className="truncate">
                        {item.room || 'TBA'}{item.building ? ` • ${item.building}` : ''}
                      </span>
                    </div>

                    {item.instructor && (
                      <div className="flex items-center gap-1.5 col-span-2 truncate">
                        <User className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                        <span className="truncate">{item.instructor}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RENDER WEEKLY TIMETABLE GRID SUBTAB */}
      {activeSubTab === 'weekly' && (
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Weekly Grid Overview</h3>
            <span className="text-xs text-[var(--text-secondary)]">
              {schedules.length} enrolled subjects
            </span>
          </div>

          <div className="overflow-x-auto pb-4 overscroll-x-contain scroll-smooth rounded-2xl p-1">
            <div className="min-w-[1050px]">
              {/* Day Header Row (Sticky) */}
              <div className="grid grid-cols-7 gap-3 pb-3 border-b border-[var(--card-border)] sticky top-0 z-20 bg-[var(--modal-bg)]/95 backdrop-blur-md pt-1">
                {DAYS.map((day) => {
                  const dayCount = schedules.filter((s) => s.days.includes(day)).length;
                  return (
                    <div 
                      key={day} 
                      className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center space-y-0.5 shadow-sm"
                    >
                      <div className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">
                        {day.substring(0, 3)}
                      </div>
                      <div className="text-[10px] font-medium text-[var(--text-secondary)]">
                        {dayCount} {dayCount === 1 ? 'class' : 'classes'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Schedule Columns Grid */}
              <div className="grid grid-cols-7 gap-3 pt-3 min-h-[420px]">
                {DAYS.map((day) => {
                  const dayItems = schedules
                    .filter((s) => s.days.includes(day))
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div 
                      key={day} 
                      className="space-y-2.5 bg-[var(--card-bg)] p-2.5 rounded-2xl border border-[var(--card-border)] flex flex-col min-w-0"
                    >
                      {dayItems.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-[var(--card-border)]">
                        <Sun className="w-4 h-4 mb-1 text-[var(--text-secondary)]" />
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">Free Day</span>
                      </div>
                    ) : (
                      dayItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => openEditModal(item)}
                          className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] transition-all cursor-pointer space-y-2 relative group pressable"
                          style={{ borderBottom: `3px solid ${item.color}` }}
                        >
                          {/* Time Badge */}
                          <div className="flex items-center justify-between gap-1">
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white truncate"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.subjectCode}
                            </span>

                            {item.reminderMinutes && item.reminderMinutes > 0 && (
                              <span className="text-[#FF9F0A]" title={`Alarm ${item.reminderMinutes}m before`}>
                                <Bell className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          {/* Time & Title */}
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-[var(--text-primary)] line-clamp-2 leading-tight">
                              {item.subjectName}
                            </p>
                            <p className="text-[10px] font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{formatTime12h(item.startTime)} - {formatTime12h(item.endTime)}</span>
                            </p>
                          </div>

                          {/* Room Chip */}
                          {item.room && (
                            <div className="pt-1 border-t border-[var(--card-border)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                              <span className="truncate flex items-center gap-1 font-medium">
                                <MapPin className="w-2.5 h-2.5 text-[var(--text-secondary)] shrink-0" />
                                <span className="truncate">{item.room}</span>
                              </span>
                              <span className="text-[9px] font-bold opacity-80 shrink-0">
                                {item.units || 3}u
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ADD / EDIT SUBJECT MODAL */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl shadow-2xl border border-[var(--card-border)] overflow-hidden sheet-enter-spring"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--nested-bg)] shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--text-primary)]" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm">
                  {editingSchedule ? 'Edit Class Schedule' : 'Add New Subject'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 flex-1 overflow-y-auto overscroll-contain">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    OFRCODE / Section
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. 1048"
                    value={ofrCode}
                    onChange={(e) => setOfrCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] font-mono focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="e.g. CS 101"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Subject Title
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Data Structures & Algorithms"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Days Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Days of Week *</span>
                  <span className="text-[11px] font-normal text-[var(--text-secondary)]">Select applicable days</span>
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS.map((day) => {
                    const isChecked = selectedDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDaySelection(day)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          isChecked
                            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-bg)] font-bold shadow-sm'
                            : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Start Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setTimePickerTarget('start')}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-between hover:border-[var(--text-secondary)] transition-all text-left"
                  >
                    <span className="font-bold">{formatTime12h(startTime)}</span>
                    <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    End Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setTimePickerTarget('end')}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-between hover:border-[var(--text-secondary)] transition-all text-left"
                  >
                    <span className="font-bold">{formatTime12h(endTime)}</span>
                    <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  </button>
                </div>
              </div>

              {/* Room & Building */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="e.g. Finster 402"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Building
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="e.g. Finster Hall"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Instructor & Units */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Instructor
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="e.g. Prof. Santos"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Credit Units
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Color Tag */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Card Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-offset-2 ring-[var(--text-primary)] ring-offset-[var(--modal-bg)]' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Class Alarm Reminder Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                    <span>Class Reminder Alarm</span>
                  </span>
                  {reminderMinutes > 0 && (
                    <span className="text-[11px] text-[var(--text-primary)] font-medium">
                      {reminderMinutes}m before start
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-6 gap-1 p-1 bg-[var(--nested-bg)] rounded-xl border border-[var(--card-border)]">
                  {[
                    { val: 0, label: 'None' },
                    { val: 10, label: '10m' },
                    { val: 15, label: '15m' },
                    { val: 30, label: '30m' },
                    { val: 60, label: '1h' }
                  ].map((opt) => {
                    const isSelected = !isCustomReminder && reminderMinutes === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          setIsCustomReminder(false);
                          setReminderMinutes(opt.val);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                          isSelected
                            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomReminder(true);
                      if ([0, 10, 15, 30, 60].includes(reminderMinutes)) {
                        setReminderMinutes(10);
                      }
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold text-center transition-all ${
                      isCustomReminder
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>Custom</span>
                  </button>
                </div>

                {isCustomReminder && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] animate-fade-in">
                    <span className="text-xs text-[var(--text-secondary)] shrink-0">Notify me</span>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={reminderMinutes || 10}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(180, Number(e.target.value) || 1));
                        setReminderMinutes(val);
                      }}
                      className="w-20 px-2 py-1 text-xs font-bold text-center rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] focus:outline-hidden"
                    />
                    <span className="text-xs text-[var(--text-secondary)]">minutes before class</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Notes / Reminders
                  </label>
                  <span className={`text-[10px] font-mono ${notes.length >= 450 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                    {notes.length}/500
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Bring lab gown, submit problem set"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] resize-none focus:outline-hidden"
                />
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--card-border)] bg-[var(--nested-bg)] shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary-ios px-5 py-2 rounded-full text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-sm pressable"
              >
                {editingSchedule ? 'Update Subject' : 'Save Subject'}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )}

      {/* CUSTOM TIME PICKER MODAL */}
      <CustomTimePickerModal
        isOpen={timePickerTarget !== null}
        onClose={() => setTimePickerTarget(null)}
        title={timePickerTarget === 'start' ? 'Select Start Time' : 'Select End Time'}
        initialTime={timePickerTarget === 'start' ? startTime : endTime}
        onSelectTime={(time24) => {
          if (timePickerTarget === 'start') {
            setStartTime(time24);
          } else {
            setEndTime(time24);
          }
        }}
      />

      {/* SCHEDULE IMPORT MODAL (ERC & JSON) */}
      <ScheduleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          setIsImportModalOpen(false);
          db.schedules.toArray().then((items) => {
            scheduleAllClassSchedulesReminders(items);
            syncScheduleToWidgets(items);
            refreshUnremovableClassNotification(items);
          });
        }}
      />

      {/* SCHEDULE SHARE & WALLPAPER EXPORT MODAL */}
      <ScheduleShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        schedules={schedules}
      />

      {/* CUSTOM IN-APP DELETE SUBJECT CONFIRMATION MODAL */}
      {scheduleToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setScheduleToDelete(null)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-[var(--card-border)] space-y-4 sheet-enter-spring"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] text-[#FF453A] border border-[var(--card-border)] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                  Remove Subject?
                </h3>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {scheduleToDelete.subjectCode} - {scheduleToDelete.subjectName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Are you sure you want to remove this class from your timetable? This will not affect other subjects.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[#FF453A] text-white shadow-sm pressable"
              >
                Delete Subject
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ANDROID WIDGET CUSTOMIZER & PREVIEW MODAL */}
      {isWidgetModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setIsWidgetModalOpen(false)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-3xl p-5 shadow-2xl border border-[var(--card-border)] space-y-4 sheet-enter-spring"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Home Screen Widgets</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">Live timetable widget preview</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWidgetModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Widget Size Selector */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[var(--nested-bg)] rounded-xl border border-[var(--card-border)]">
              {[
                { id: 'small' as const, label: 'Small 2x2' },
                { id: 'medium' as const, label: 'Medium 4x2' },
                { id: 'large' as const, label: 'Large 4x4' },
                { id: 'tasks' as const, label: 'Tasks 4x2' }
              ].map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => setSelectedWidgetSize(sz.id)}
                  className={`py-1.5 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                    selectedWidgetSize === sz.id
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>

            {/* Interactive Live Widget Surface */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 overflow-y-auto flex-1">
              <div className="text-[10px] uppercase font-bold text-[#8E8E93] tracking-wider flex items-center justify-between">
                <span>Android Launcher Preview</span>
                <span className="text-blue-400 font-semibold">{selectedWidgetSize.toUpperCase()}</span>
              </div>

              {/* SMALL 2x2 WIDGET */}
              {selectedWidgetSize === 'small' && (
                <div className="w-44 h-44 mx-auto p-4 rounded-3xl bg-black border border-[#2C2C2E] shadow-xl flex flex-col justify-between select-none">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wide">
                      Next Class
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">
                      {schedules[0] ? formatTime12h(schedules[0].startTime) : '09:00 AM'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-white truncate">
                      {schedules[0] ? schedules[0].subjectCode : 'IT 311'}
                    </h4>
                    <p className="text-xs text-neutral-400 truncate">
                      {schedules[0] ? `${schedules[0].room || 'Room'} ${schedules[0].building || ''}` : 'Room 402 Finster'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span className="text-emerald-400 font-bold">SkwelaDabaw</span>
                    <span>Classroom</span>
                  </div>
                </div>
              )}

              {/* MEDIUM 4x2 WIDGET */}
              {selectedWidgetSize === 'medium' && (
                <div className="w-full max-w-xs mx-auto p-3.5 rounded-3xl bg-black border border-[#2C2C2E] shadow-xl space-y-2 select-none">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wide">
                      Active Class
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {schedules.length} Classes Today
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-white truncate">
                        {schedules[0] ? schedules[0].subjectCode : 'IT 311'}
                      </h4>
                      <span className="text-[10px] font-bold text-blue-400">
                        {schedules[0] ? formatTime12h(schedules[0].startTime) : '08:00 AM'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      {schedules[0] ? `${schedules[0].subjectName}` : 'Systems Architecture'}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {schedules[0] ? `${schedules[0].room || 'Room'} • ${schedules[0].building || ''}` : 'Room 402 • Finster Hall'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-900">
                    <span className="truncate">
                      Next: {schedules[1] ? `${schedules[1].subjectCode} • ${formatTime12h(schedules[1].startTime)}` : 'No further classes'}
                    </span>
                    <span className="text-neutral-600 font-bold shrink-0 ml-2">SkwelaDabaw</span>
                  </div>
                </div>
              )}

              {/* LARGE 4x4 WIDGET */}
              {selectedWidgetSize === 'large' && (
                <div className="w-full max-w-sm mx-auto p-4 rounded-3xl bg-black border border-[#2C2C2E] shadow-xl space-y-3 select-none">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wide">
                      Full Day Timetable
                    </span>
                    <span className="text-xs font-bold text-white">{selectedDay}</span>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(schedules.length > 0 ? schedules.slice(0, 3) : [
                      { subjectCode: 'IT 311', startTime: '08:00', endTime: '09:30', room: 'Lab 402', building: 'Finster Hall' },
                      { subjectCode: 'CS 202', startTime: '10:00', endTime: '11:30', room: 'Room 205', building: 'Bellarmine' },
                      { subjectCode: 'GE 114', startTime: '13:00', endTime: '14:30', room: 'Room 304', building: 'Bapst' }
                    ]).map((item, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-[#141414] border border-neutral-800 flex items-center justify-between text-left">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-white truncate">{item.subjectCode}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{item.room} • {item.building}</p>
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 shrink-0">
                          {formatTime12h(item.startTime)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-[11px] text-neutral-400">
                    <span>Tap to view bus lines</span>
                    <span className="text-[10px] text-neutral-600 font-bold">SkwelaDabaw</span>
                  </div>
                </div>
              )}

              {/* TASKS 4x2 WIDGET */}
              {selectedWidgetSize === 'tasks' && (
                <div className="w-full max-w-sm mx-auto p-4 rounded-3xl bg-black border border-[#2C2C2E] shadow-xl space-y-2.5 select-none">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                      Pending Tasks
                    </span>
                    <span className="text-[11px] font-bold text-neutral-400">
                      2 Tasks Due Soon
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-[#141414] border border-neutral-800 space-y-1.5">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">
                          • Lab Exercise 3 Submission
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-400">Due Today</span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        IT 311 • High Priority
                      </p>
                    </div>

                    <div className="pt-1 border-t border-neutral-900">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">
                          • Problem Set 4 Calculus
                        </h4>
                        <span className="text-[10px] text-neutral-400">Tomorrow</span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Math 21 • Medium Priority
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                    <span>Tap to view assignments</span>
                    <span className="text-[10px] text-neutral-600 font-bold shrink-0 ml-2">SkwelaDabaw</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] text-center">
              Add widget by touching and holding an empty spot on your home screen and choosing SkwelaDabaw.
            </p>

            <button
              type="button"
              onClick={() => setIsWidgetModalOpen(false)}
              className="btn-primary-ios w-full py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* CLOUD SCHEDULE SYNC CONFLICT RESOLUTION MODAL */}
      {conflictData && !overlapWarningItems && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setConflictData(null)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-[var(--card-border)] space-y-4 sheet-enter-spring max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Schedule Sync Resolution</h3>
                <p className="text-xs text-[var(--text-secondary)]">Differences detected with cloud backup</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Your device timetable has {conflictData.localSchedules.length} subjects, while your cloud backup contains {conflictData.cloudSchedules.length} subjects. Choose how you want to synchronize.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleResolveCombine}
                className="w-full p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-left hover:border-[var(--text-primary)] transition-all cursor-pointer"
              >
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Combine Schedules</span>
                  <span className="text-[10px] text-blue-400">Recommended</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Merge local and cloud subjects together into one timetable.
                </p>
              </button>

              <button
                type="button"
                onClick={handleResolveReplaceLocal}
                className="w-full p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-left hover:border-[var(--text-primary)] transition-all cursor-pointer"
              >
                <div className="text-xs font-bold text-[var(--text-primary)]">Replace Local</div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Overwrite device timetable with your cloud backup.
                </p>
              </button>

              <button
                type="button"
                onClick={handleResolveKeepLocal}
                className="w-full p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-left hover:border-[var(--text-primary)] transition-all cursor-pointer"
              >
                <div className="text-xs font-bold text-[var(--text-primary)]">Keep Local</div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Keep device timetable and overwrite cloud backup.
                </p>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* OVERLAP COLLISION WARNING MODAL */}
      {overlapWarningItems && overlapWarningItems.length > 0 && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setOverlapWarningItems(null)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-amber-500/40 space-y-4 sheet-enter-spring max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Time Overlap Detected</h3>
                <p className="text-xs text-amber-500 font-medium">Subjects occupy the same time slot</p>
              </div>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {overlapWarningItems.map((item, i) => (
                <div key={i} className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                    <span>{item.local.subjectCode} vs {item.cloud.subjectCode}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">{item.local.days.join(', ')}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] space-y-0.5">
                    <div>Device: {item.local.startTime} - {item.local.endTime}</div>
                    <div className="text-blue-400">Cloud: {item.cloud.startTime} - {item.cloud.endTime}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setIndividualOverlapChoices(prev => ({ ...prev, [i]: 'local' }))}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all ${
                        (individualOverlapChoices[i] || 'local') === 'local'
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-xs'
                          : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]'
                      }`}
                    >
                      Keep Device
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndividualOverlapChoices(prev => ({ ...prev, [i]: 'cloud' }))}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all ${
                        individualOverlapChoices[i] === 'cloud'
                          ? 'bg-blue-500 text-white shadow-xs'
                          : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]'
                      }`}
                    >
                      Keep Cloud
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndividualOverlapChoices(prev => ({ ...prev, [i]: 'both' }))}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all ${
                        individualOverlapChoices[i] === 'both'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]'
                      }`}
                    >
                      Keep Both
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={handleResolveIndividualOverlaps}
                className="w-full py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
              >
                Apply Selected Choices
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResolveOverlapKeepLocal}
                  className="py-2 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-[11px] pressable"
                >
                  All Device
                </button>
                <button
                  type="button"
                  onClick={handleResolveOverlapKeepCloud}
                  className="py-2 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-[11px] pressable"
                >
                  All Cloud
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE ALL CONFIRMATION MODAL */}
      {isDeleteAllModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setIsDeleteAllModalOpen(false)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-rose-500/30 space-y-4 sheet-enter-spring"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Delete All Classes</h3>
                <p className="text-xs text-[var(--text-secondary)]">Clear entire schedule</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to delete all {schedules.length} enrolled subjects from your schedule? This action cannot be undone.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="flex-1 py-2.5 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all pressable"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="flex-1 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all pressable shadow-sm"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
