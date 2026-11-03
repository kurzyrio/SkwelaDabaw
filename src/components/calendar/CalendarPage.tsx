import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  Circle, 
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { db } from '../../db';
import { DayOfWeek, TaskItem } from '../../types';
import { PageIntroGuide } from '../common/PageIntroGuide';
import { toggleTaskDone } from '../../services/taskSyncService';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const schedules = useLiveQuery(() => db.schedules.toArray(), []) || [];
  const rawTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const tasks = rawTasks.filter((t) => t.sync_status !== 'pending_delete');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayOfWeekNames: Record<number, DayOfWeek> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday'
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; dateString: string }[] = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: formatLocalDate(d)
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateString: formatLocalDate(d)
      });
    }

    // Next month filler days to complete grid (up to 42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: formatLocalDate(d)
      });
    }

    return days;
  }, [year, month]);

  const selectedDateStr = formatLocalDate(selectedDate);
  const selectedDayOfWeek = dayOfWeekNames[selectedDate.getDay()];

  // Filter classes for selected day
  const classesOnSelectedDay = schedules.filter((s) => s.days.includes(selectedDayOfWeek));

  // Filter tasks for selected date
  const tasksOnSelectedDay = tasks.filter((t) => t.dueDate === selectedDateStr);

  const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let hours = parseInt(hStr, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mStr} ${suffix}`;
  };

  const toggleTask = async (task: TaskItem) => {
    try {
      await toggleTaskDone(task);
    } catch (localErr) {
      console.error('Failed to toggle task in calendar:', localErr);
    }
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in select-none">
      <PageIntroGuide
        pageKey="calendar"
        icon={<CalendarIcon className="w-6 h-6 text-[var(--text-primary)]" />}
        title="Academic Calendar &amp; Agenda"
        description="Unified calendar agenda combining weekly class schedules and assignment due dates."
        tips={[
          'Tap any day to preview that day’s classes and pending assignments.',
          'Dots underneath dates indicate scheduled classes and active deliverables.'
        ]}
      />

      {/* Month Header & Controls Inset Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {schedules.length} enrolled subjects • {tasks.length} active tasks
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToday}
              className="px-3.5 py-1.5 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] text-xs font-semibold hover:opacity-90 pressable"
            >
              Today
            </button>
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysOfWeek.map((d) => (
            <div key={d} className="text-xs font-semibold text-[var(--text-secondary)] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((d, idx) => {
            const hasClasses = schedules.some((s) => s.days.includes(dayOfWeekNames[d.date.getDay()]));
            const hasTasks = tasks.some((t) => t.dueDate === d.dateString);
            const active = isSelected(d.date);
            const today = isToday(d.date);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(d.date)}
                className={`h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                  active
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-sm'
                    : today
                    ? 'bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--card-border)]'
                    : d.isCurrentMonth
                    ? 'text-[var(--text-primary)] hover:bg-[var(--nested-bg)]'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--nested-bg)]/50'
                }`}
              >
                <span className="text-xs">{d.date.getDate()}</span>

                {/* Event Dots */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {hasClasses && d.isCurrentMonth && (
                    <span className={`w-1 h-1 rounded-full ${active ? 'bg-[var(--btn-primary-text)]' : 'bg-emerald-500'}`} />
                  )}
                  {hasTasks && d.isCurrentMonth && (
                    <span className={`w-1 h-1 rounded-full ${active ? 'bg-[var(--btn-primary-text)]' : 'bg-[#FF9F0A]'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Inset Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="border-b border-[var(--card-border)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Agenda for {selectedDayOfWeek}, {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {classesOnSelectedDay.length} lectures scheduled • {tasksOnSelectedDay.length} deadlines due
          </p>
        </div>

        {/* Classes Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Classes Scheduled
          </h4>

          {classesOnSelectedDay.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-xs text-[var(--text-secondary)] text-center">
              No classes scheduled for {selectedDayOfWeek}.
            </div>
          ) : (
            classesOnSelectedDay.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-start justify-between gap-3"
                style={{ borderLeftColor: item.color, borderLeftWidth: '3px' }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-bold text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.subjectCode}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {item.subjectName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime12h(item.startTime)} - {formatTime12h(item.endTime)}
                    </span>
                    {item.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.room}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tasks Due Section */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Deadlines Due
          </h4>

          {tasksOnSelectedDay.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-xs text-[var(--text-secondary)] text-center">
              No assignment deadlines due on this day.
            </div>
          ) : (
            tasksOnSelectedDay.map((task) => (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] flex items-center justify-between gap-3 ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTask(task)}
                    className="text-[var(--text-primary)] hover:opacity-80"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#30D158]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[var(--text-secondary)]" />
                    )}
                  </button>
                  <div>
                    <h5 className={`text-xs font-bold text-[var(--text-primary)] ${task.completed ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                      {task.title}
                    </h5>
                    {task.subjectCode && (
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {task.subjectCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
