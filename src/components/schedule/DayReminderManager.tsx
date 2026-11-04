import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Plus, Trash2, X, Clock, CalendarDays, Check, Pencil } from 'lucide-react';
import { db } from '../../db';
import { DayReminderItem, DayOfWeek } from '../../types';
import { scheduleDayReminder, cancelDayReminder } from '../../services/notificationService';
import { CustomTimePicker } from '../common/CustomTimePicker';
import { queueCloudSync } from '../../services/cloudSyncService';
import { syncRoutinesToWidgets } from '../../services/widgetService';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Everyday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const DayReminderManager: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Tuesday');
  const [time, setTime] = useState('07:00');
  const [notes, setNotes] = useState('');
  const [editingReminder, setEditingReminder] = useState<DayReminderItem | null>(null);

  const reminders = useLiveQuery(() => db.dayReminders.toArray(), []) || [];

  useEffect(() => {
    if (reminders && reminders.length >= 0) {
      syncRoutinesToWidgets(reminders);
    }
  }, [reminders]);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !time) return;

    const reminderData: DayReminderItem = {
      title: title.trim(),
      dayOfWeek: selectedDay,
      time,
      enabled: true,
      notes: notes.trim() || undefined
    };

    const reminderId = (await db.dayReminders.add(reminderData)) as number;
    await scheduleDayReminder({ ...reminderData, id: reminderId });
    queueCloudSync();

    setTitle('');
    setNotes('');
    setTime('07:00');
    setIsAdding(false);
  };

  const toggleReminder = async (reminder: DayReminderItem) => {
    if (!reminder.id) return;
    const nextEnabled = !reminder.enabled;
    await db.dayReminders.update(reminder.id, { enabled: nextEnabled });

    if (nextEnabled) {
      await scheduleDayReminder({ ...reminder, enabled: true });
    } else {
      await cancelDayReminder(reminder.id);
    }
    queueCloudSync();
  };

  const deleteReminder = async (id: number) => {
    await cancelDayReminder(id);
    await db.dayReminders.delete(id);
    queueCloudSync();
  };

  const handleOpenEditReminder = (item: DayReminderItem) => {
    setEditingReminder(item);
    setTitle(item.title);
    setSelectedDay(item.dayOfWeek);
    setTime(item.time);
    setNotes(item.notes || '');
    setIsAdding(false);
  };

  const handleSaveEditReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReminder?.id || !title.trim() || !time) return;

    const updatedData: DayReminderItem = {
      ...editingReminder,
      title: title.trim(),
      dayOfWeek: selectedDay,
      time,
      notes: notes.trim() || undefined
    };

    await db.dayReminders.update(editingReminder.id, updatedData);

    if (updatedData.enabled) {
      await scheduleDayReminder(updatedData);
    } else {
      await cancelDayReminder(editingReminder.id);
    }
    queueCloudSync();

    setEditingReminder(null);
    setTitle('');
    setNotes('');
    setTime('07:00');
  };

  const formatTimeDisplay = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time24;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : `${m}`;
    return `${displayH}:${displayM} ${period}`;
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-[var(--text-primary)]" />
            <span>Weekly Day Routine Alarms</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Recurring alarms for uniform, gear, thesis, and weekly schedules
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center gap-1.5 pressable shadow-sm"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{isAdding ? 'Cancel' : 'New Routine'}</span>
        </button>
      </div>

      {/* Edit Routine Inset Form */}
      {editingReminder && (
        <form
          onSubmit={handleSaveEditReminder}
          className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--btn-primary-bg)] space-y-3.5 animate-slide-up shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5 text-sky-400" />
              <span>Edit Weekly Routine Alarm</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setEditingReminder(null);
                setTitle('');
                setNotes('');
              }}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Routine Description *</label>
              <span className={`text-[10px] font-mono ${title.length >= 90 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                {title.length}/100
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Wear PE uniform, Bring laboratory kit"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span>Day of the Week</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 bg-[var(--nested-bg)] p-1 rounded-2xl border border-[var(--card-border)]">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
                    selectedDay === d
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {d === 'Everyday' ? 'Daily' : d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <CustomTimePicker
            label="Alarm Time"
            required
            value={time}
            outputFormat="24h"
            onChange={(newTime) => setTime(newTime)}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Notes Optional</label>
              <span className={`text-[10px] font-mono ${notes.length >= 450 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                {notes.length}/500
              </span>
            </div>
            <input
              type="text"
              maxLength={500}
              placeholder="Additional reminder note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingReminder(null);
                setTitle('');
                setNotes('');
              }}
              className="flex-1 py-2.5 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs border border-[var(--card-border)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
            >
              Update Routine
            </button>
          </div>
        </form>
      )}

      {/* Add Routine Inset Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateReminder}
          className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3.5 animate-slide-up shadow-md"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Routine Description *</label>
              <span className={`text-[10px] font-mono ${title.length >= 90 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                {title.length}/100
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Wear PE uniform, Bring laboratory kit, Rotc shoes"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] placeholder-[var(--text-secondary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              <span>Day of the Week</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 bg-[var(--nested-bg)] p-1 rounded-2xl border border-[var(--card-border)]">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
                    selectedDay === d
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {d === 'Everyday' ? 'Daily' : d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <CustomTimePicker
            label="Alarm Time"
            required
            value={time}
            outputFormat="24h"
            onChange={(newTime) => setTime(newTime)}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Notes Optional</label>
              <span className={`text-[10px] font-mono ${notes.length >= 450 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                {notes.length}/500
              </span>
            </div>
            <input
              type="text"
              maxLength={500}
              placeholder="Additional reminder note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] placeholder-[var(--text-secondary)]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
          >
            Save Routine Alarm
          </button>
        </form>
      )}

      {/* Routine Cards List */}
      <div className="space-y-2">
        {reminders.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center text-xs text-[var(--text-secondary)] space-y-1">
            <Bell className="w-5 h-5 text-[var(--text-primary)] mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-[var(--text-primary)]">No weekly routine alarms set</p>
            <p>Set a reminder like Wear PE uniform every Tuesday at 7:00 AM</p>
          </div>
        ) : (
          reminders.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] transition-all flex items-center justify-between gap-3 ${
                !item.enabled ? 'opacity-50' : ''
              }`}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--card-border)] text-[10px] font-bold">
                    {item.dayOfWeek === 'Everyday' ? 'Every Day' : `Every ${item.dayOfWeek}`}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {formatTimeDisplay(item.time)}
                  </span>
                </div>

                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {item.title}
                </p>

                {item.notes && (
                  <p className="text-xs text-[var(--text-secondary)]">{item.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleReminder(item)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors relative ${
                    item.enabled ? 'bg-[#30D158]' : 'bg-[var(--nested-bg)] border border-[var(--card-border)]'
                  }`}
                  aria-label={item.enabled ? 'Disable routine alarm' : 'Enable routine alarm'}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      item.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditReminder(item)}
                  className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable"
                  aria-label="Edit routine"
                  title="Edit routine"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={() => item.id && deleteReminder(item.id)}
                  className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[#FF453A] hover:bg-[var(--nested-bg)] transition-colors pressable"
                  aria-label="Delete routine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
