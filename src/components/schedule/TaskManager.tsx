import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Calendar, 
  ListTodo, 
  Bell,
  X,
  BookOpen,
  Pencil
} from 'lucide-react';
import { db } from '../../db';
import { TaskItem } from '../../types';
import { CustomDatePickerModal } from '../common/CustomDatePickerModal';
import { CustomSelect } from '../common/CustomSelect';
import { syncTasksToWidgets } from '../../services/widgetService';
import { 
  toggleTaskDone, 
  createTask, 
  updateTask, 
  deleteTask as deleteTaskFromSync 
} from '../../services/taskSyncService';
import { playEagleSound } from '../../utils/audio';
import { EagleBuddy } from '../common/EagleBuddy';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

export const TaskManager: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedSubjectMode, setSelectedSubjectMode] = useState<'enrolled' | 'custom'>('enrolled');
  const [newSubject, setNewSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [newDueDate, setNewDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newReminderOption, setNewReminderOption] = useState<'none' | '15m' | '1h' | '1d'>('1h');
  const [newNotes, setNewNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<TaskItem | null>(null);

  useBackHandler(Boolean(taskPendingDelete), () => setTaskPendingDelete(null), BackPriority.MODAL, 'task_delete_modal');

  // Live queries
  const rawTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const tasks = rawTasks.filter((t) => t.sync_status !== 'pending_delete');
  const schedules = useLiveQuery(() => db.schedules.toArray(), []) || [];

  // Synchronize tasks with Android Home Screen Widget
  React.useEffect(() => {
    if (tasks) {
      syncTasksToWidgets(tasks);
    }
  }, [tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const finalSubjectCode = selectedSubjectMode === 'custom' 
      ? customSubject.trim().toUpperCase() 
      : newSubject.trim().toUpperCase();

    await createTask({
      title: newTitle.trim(),
      subjectCode: finalSubjectCode || undefined,
      dueDate: newDueDate,
      priority: newPriority,
      notes: newNotes.trim() || undefined,
      reminderOption: newReminderOption
    });

    setNewTitle('');
    setNewSubject('');
    setCustomSubject('');
    setNewNotes('');
    setNewReminderOption('1h');
    setIsAdding(false);
  };

  const toggleTask = async (task: TaskItem) => {
    try {
      const willBeCompleted = !Boolean(task.is_completed ?? task.completed);
      await toggleTaskDone(task);

      if (willBeCompleted) {
        playEagleSound('success');
      }
    } catch (localErr) {
      console.error('Failed to update local task state:', localErr);
    }
  };

  const deleteTask = async (taskOrId: TaskItem | number) => {
    try {
      if (typeof taskOrId === 'number') {
        const found = tasks.find((t) => t.id === taskOrId);
        if (found) {
          await deleteTaskFromSync(found);
        } else {
          await db.tasks.delete(taskOrId);
        }
      } else {
        await deleteTaskFromSync(taskOrId);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setNewTitle(task.title);
    if (task.subjectCode && schedules.some(s => s.subjectCode === task.subjectCode)) {
      setSelectedSubjectMode('enrolled');
      setNewSubject(task.subjectCode);
      setCustomSubject('');
    } else if (task.subjectCode) {
      setSelectedSubjectMode('custom');
      setCustomSubject(task.subjectCode);
      setNewSubject('');
    } else {
      setSelectedSubjectMode('enrolled');
      setNewSubject('');
      setCustomSubject('');
    }
    setNewDueDate(task.dueDate);
    setNewPriority(task.priority || 'medium');
    setNewReminderOption(task.reminderOption === '15m' || task.reminderOption === '1d' ? task.reminderOption : (task.reminderOption === 'none' ? 'none' : '1h'));
    setNewNotes(task.notes || '');
    setIsAdding(false);
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newTitle.trim()) return;

    const finalSubjectCode = selectedSubjectMode === 'custom' 
      ? customSubject.trim().toUpperCase() 
      : newSubject.trim().toUpperCase();

    await updateTask(editingTask, {
      title: newTitle.trim(),
      subjectCode: finalSubjectCode || undefined,
      dueDate: newDueDate,
      priority: newPriority,
      notes: newNotes.trim() || undefined,
      reminderOption: newReminderOption
    });

    setEditingTask(null);
    setNewTitle('');
    setNewSubject('');
    setCustomSubject('');
    setNewNotes('');
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;

  const formatDateDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* Header Controls & Filter (Zero Parentheses Directive) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--nested-bg)] p-1 rounded-2xl border border-[var(--card-border)]">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Pending {pendingCount}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'completed'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Done {tasks.length - pendingCount}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All {tasks.length}
          </button>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center gap-1.5 pressable shadow-sm"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{isAdding ? 'Close' : 'Add Task'}</span>
        </button>
      </div>

      {/* Edit Task Inset Form */}
      {editingTask && (
        <form 
          onSubmit={handleSaveEditTask} 
          className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--btn-primary-bg)] space-y-3.5 animate-slide-up shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5 text-sky-400" />
              <span>Edit Task</span>
            </span>
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Task Title *</label>
            <input
              type="text"
              required
              maxLength={120}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value.slice(0, 120))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]"
            />
          </div>

          {/* Subject selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>Specify Subject</span>
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectMode('enrolled')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                    selectedSubjectMode === 'enrolled'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  From Enrolled
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectMode('custom')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                    selectedSubjectMode === 'custom'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Type Custom
                </button>
              </div>
            </div>

            {selectedSubjectMode === 'enrolled' ? (
              <CustomSelect
                value={newSubject}
                onChange={(val) => setNewSubject(val)}
                placeholder="General / No Specific Subject"
                options={[
                  { value: '', label: 'General / No Specific Subject' },
                  ...schedules.map((s) => ({
                    value: s.subjectCode,
                    label: `${s.subjectCode} - ${s.subjectName}`
                  }))
                ]}
                triggerClassName="bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)]"
              />
            ) : (
              <input
                type="text"
                maxLength={25}
                placeholder="Type course code e.g. PE 101, NSTP 2"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value.slice(0, 25))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] uppercase"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Due Date</label>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(true)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] flex items-center justify-between text-left pressable"
              >
                <span>{formatDateDisplay(newDueDate)}</span>
                <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                <Bell className="w-3 h-3 text-[var(--text-primary)]" />
                <span>Reminder Alarm</span>
              </label>
              <CustomSelect
                value={newReminderOption}
                onChange={(val) => setNewReminderOption(val as any)}
                options={[
                  { value: 'none', label: 'No Reminder' },
                  { value: '15m', label: '15 minutes before' },
                  { value: '1h', label: '1 hour before' },
                  { value: '1d', label: '1 day before 9 AM' }
                ]}
                triggerClassName="bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Priority Level</label>
            <div className="grid grid-cols-3 gap-1 bg-[var(--nested-bg)] p-1 rounded-xl border border-[var(--card-border)]">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPriority(p)}
                  className={`py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    newPriority === p
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Notes Optional</label>
              <span className={`text-[10px] font-mono ${newNotes.length >= 450 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                {newNotes.length}/500
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={500}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value.slice(0, 500))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="flex-1 py-2.5 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs border border-[var(--card-border)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
            >
              Update Task
            </button>
          </div>
        </form>
      )}

      {/* Add Task Inset Form */}
      {isAdding && (
        <form 
          onSubmit={handleCreateTask} 
          className="p-4 sm:p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3.5 animate-slide-up shadow-md"
        >
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Task Title *</label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Read Chapters 1 to 3, Prepare Lab Exercise"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value.slice(0, 120))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] placeholder-[var(--text-secondary)]"
            />
          </div>

          {/* EXPLICIT SUBJECT SPECIFICATION */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>Specify Subject</span>
              </label>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectMode('enrolled')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                    selectedSubjectMode === 'enrolled'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  From Enrolled
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectMode('custom')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                    selectedSubjectMode === 'custom'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Type Custom
                </button>
              </div>
            </div>

            {selectedSubjectMode === 'enrolled' ? (
              <CustomSelect
                value={newSubject}
                onChange={(val) => setNewSubject(val)}
                placeholder="General / No Specific Subject"
                options={[
                  { value: '', label: 'General / No Specific Subject' },
                  ...schedules.map((s) => ({
                    value: s.subjectCode,
                    label: `${s.subjectCode} - ${s.subjectName}`
                  }))
                ]}
                triggerClassName="bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)]"
              />
            ) : (
              <input
                type="text"
                maxLength={25}
                placeholder="Type course code e.g. PE 101, NSTP 2, THESIS"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value.slice(0, 25))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] uppercase placeholder:normal-case placeholder-[var(--text-secondary)]"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Due Date</label>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(true)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] flex items-center justify-between text-left pressable"
              >
                <span>{formatDateDisplay(newDueDate)}</span>
                <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                <Bell className="w-3 h-3 text-[var(--text-primary)]" />
                <span>Reminder Alarm</span>
              </label>
              <CustomSelect
                value={newReminderOption}
                onChange={(val) => setNewReminderOption(val as any)}
                options={[
                  { value: 'none', label: 'No Reminder' },
                  { value: '15m', label: '15 minutes before' },
                  { value: '1h', label: '1 hour before' },
                  { value: '1d', label: '1 day before 9 AM' }
                ]}
                triggerClassName="bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Priority Level</label>
            <div className="grid grid-cols-3 gap-1 bg-[var(--nested-bg)] p-1 rounded-xl border border-[var(--card-border)]">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPriority(p)}
                  className={`py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    newPriority === p
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Notes Optional</label>
              <span className={`text-[10px] font-mono ${newNotes.length >= 450 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                {newNotes.length}/500
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Additional details or instructions..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value.slice(0, 500))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] resize-none placeholder-[var(--text-secondary)]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
          >
            Save Task
          </button>
        </form>
      )}

      {/* Inset Tasks List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center text-xs text-[var(--text-secondary)] space-y-2">
            <div className="flex justify-center">
              <EagleBuddy
                mood="celebrating"
                width={100}
                height={110}
                showSpeech={false}
                isAnimated={true}
              />
            </div>
            <p className="font-semibold text-sm text-[var(--text-primary)]">No tasks in this view</p>
            <p>Mabuhay! You are all caught up, Dabawenyo!</p>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border)] transition-all flex items-start justify-between gap-3 pressable ${
                t.completed ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleTask(t)}
                  className="mt-0.5 text-[var(--text-primary)] hover:opacity-80 transition-opacity"
                >
                  {t.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#30D158]" />
                  ) : (
                    <Circle className="w-5 h-5 text-[var(--text-secondary)]" />
                  )}
                </button>

                <div className="space-y-1 min-w-0 flex-1">
                  <p className={`text-sm font-semibold text-[var(--text-primary)] truncate ${t.completed ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-secondary)]">
                    {t.subjectCode && (
                      <span className="px-2 py-0.5 rounded-md bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--card-border)] text-[10px] font-bold uppercase">
                        {t.subjectCode}
                      </span>
                    )}
                    <span>Due {formatDateDisplay(t.dueDate)}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      t.priority === 'high' ? 'bg-[#FF453A]/20 text-[#FF453A]' :
                      t.priority === 'medium' ? 'bg-[#FF9F0A]/20 text-[#FF9F0A]' : 'bg-[var(--nested-bg)] text-[var(--text-secondary)]'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  {t.notes && (
                    <p className="text-xs text-[var(--text-secondary)] pt-0.5">{t.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEditTask(t)}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable"
                  title="Edit Task"
                  aria-label="Edit Task"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTaskPendingDelete(t)}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[#FF453A] hover:bg-[var(--nested-bg)] transition-colors pressable"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Date Picker Modal */}
      <CustomDatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        initialDate={newDueDate}
        onSelectDate={(d) => setNewDueDate(d)}
        title="Select Due Date"
      />

      {/* Task Deletion Confirmation Modal */}
      {taskPendingDelete && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setTaskPendingDelete(null)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl p-5 bg-[var(--card-bg)] border border-[var(--border-color)] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-[#FF453A] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Delete Task?</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-primary)] leading-relaxed bg-[var(--nested-bg)] p-3 rounded-xl border border-[var(--border-color)] font-medium line-clamp-2">
              "{taskPendingDelete.title}"
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTaskPendingDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const toDelete = taskPendingDelete;
                  setTaskPendingDelete(null);
                  if (toDelete.id) {
                    await deleteTask(toDelete);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#FF453A] hover:bg-red-600 text-white font-bold text-xs shadow-sm transition-colors pressable flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Task
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
