import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Clock, 
  ListTodo, 
  Flame, 
  Check, 
  Coffee,
  Zap,
  X,
  Bell,
  Pencil,
  Calendar as CalendarIcon
} from 'lucide-react';
import { db } from '../../db';
import { TaskItem } from '../../types';
import { playEagleSound } from '../../utils/audio';
import { 
  toggleTaskDone, 
  createTask, 
  updateTask, 
  deleteTask 
} from '../../services/taskSyncService';
import { syncTasksToWidgets } from '../../services/widgetService';
import { SelectWithOther } from '../common/SelectWithOther';
import { CustomDatePickerModal } from '../common/CustomDatePickerModal';
import { CustomTimePickerModal } from '../common/CustomTimePickerModal';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { EagleBuddy } from '../common/EagleBuddy';
import confetti from 'canvas-confetti';

const formatTime12h = (t24?: string) => {
  if (!t24) return '';
  const parts = t24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return t24;
  const p = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m} ${p}`;
};

export const TaskTrackerPage: React.FC = () => {
  const liveTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const liveSchedules = useLiveQuery(() => db.schedules.toArray(), []) || [];

  const tasks = [...liveTasks]
    .filter((t) => t.sync_status !== 'pending_delete')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const enrolledSubjects = Array.from(new Set(liveSchedules.map(s => s.subjectCode))).filter(Boolean);

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed' | 'urgent'>('all');

  // New Task Modal / Inline State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskSubject, setTaskSubject] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [taskDueTime, setTaskDueTime] = useState<string>('23:59');
  const [taskReminderEnabled, setTaskReminderEnabled] = useState<boolean>(true);
  const [taskReminderDate, setTaskReminderDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [taskReminderTime, setTaskReminderTime] = useState<string>('08:00');
  const [datePickerTarget, setDatePickerTarget] = useState<'due' | 'reminder' | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<'due' | 'reminder' | null>(null);
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskNotes, setTaskNotes] = useState<string>('');

  // Edit Task State
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<TaskItem | null>(null);

  // Hardware Back Button Interception for Task Modals
  useBackHandler(Boolean(taskPendingDelete), () => setTaskPendingDelete(null), BackPriority.MODAL, 'task_delete_modal');
  useBackHandler(Boolean(timePickerTarget), () => setTimePickerTarget(null), BackPriority.POPUP, 'task_time_picker');
  useBackHandler(Boolean(datePickerTarget), () => setDatePickerTarget(null), BackPriority.POPUP, 'task_date_picker');
  useBackHandler(showAddModal, () => setShowAddModal(false), BackPriority.MODAL, 'task_add_modal');
  useBackHandler(showEditModal, () => {
    setShowEditModal(false);
    setEditingTask(null);
  }, BackPriority.MODAL, 'task_edit_modal');



  useEffect(() => {
    if (enrolledSubjects.length > 0 && !taskSubject) {
      setTaskSubject(enrolledSubjects[0]);
    }
  }, [enrolledSubjects, taskSubject]);

  useEffect(() => {
    const handleOpenAdd = () => {
      setShowAddModal(true);
    };
    window.addEventListener('skweladabaw_open_add_task', handleOpenAdd);
    return () => window.removeEventListener('skweladabaw_open_add_task', handleOpenAdd);
  }, []);

  useEffect(() => {
    if (tasks) {
      syncTasksToWidgets(tasks);
    }
  }, [tasks]);



  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const finalSubject = taskSubject.trim().toUpperCase();

    try {
      await createTask({
        title: taskTitle.trim(),
        subjectCode: finalSubject || undefined,
        dueDate: taskDueDate,
        dueTime: taskDueTime || '23:59',
        reminderDate: taskReminderEnabled ? (taskReminderDate || taskDueDate) : undefined,
        reminderTime: taskReminderEnabled ? (taskReminderTime || '08:00') : undefined,
        reminderOption: taskReminderEnabled ? 'custom' : 'none',
        priority: taskPriority,
        notes: taskNotes.trim() || undefined
      });

      if (taskPriority === 'high') {
        playEagleSound('alert');
      } else {
        playEagleSound('success');
      }

      setTaskTitle('');
      setTaskSubject('');
      setTaskNotes('');
      setShowAddModal(false);
      confetti({ particleCount: 30, spread: 50 });
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const handleToggleTask = async (task: TaskItem) => {
    try {
      const willBeCompleted = !Boolean(task.is_completed ?? task.completed);
      await toggleTaskDone(task);

      if (willBeCompleted) {
        playEagleSound('success');
        confetti({ particleCount: 35, spread: 60 });
      }
    } catch (localErr) {
      console.error('Failed to toggle task:', localErr);
    }
  };

  const handleDeleteTask = async (taskOrId: TaskItem | number | undefined) => {
    if (!taskOrId) return;
    try {
      if (typeof taskOrId === 'number') {
        const found = tasks.find((t) => t.id === taskOrId);
        if (found) {
          await deleteTask(found);
        } else {
          await db.tasks.delete(taskOrId);
        }
      } else {
        await deleteTask(taskOrId);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskSubject(task.subjectCode || '');
    setTaskDueDate(task.dueDate);
    setTaskDueTime(task.dueTime || '23:59');
    setTaskPriority(task.priority || 'medium');
    setTaskNotes(task.notes || '');
    const hasReminder = Boolean(task.reminderDate || (task.reminderOption && task.reminderOption !== 'none'));
    setTaskReminderEnabled(hasReminder);
    setTaskReminderDate(task.reminderDate || task.dueDate);
    setTaskReminderTime(task.reminderTime || '08:00');
    setShowEditModal(true);
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskTitle.trim()) return;

    const finalSubject = taskSubject.trim().toUpperCase();

    try {
      await updateTask(editingTask, {
        title: taskTitle.trim(),
        subjectCode: finalSubject || undefined,
        dueDate: taskDueDate,
        dueTime: taskDueTime || '23:59',
        reminderDate: taskReminderEnabled ? (taskReminderDate || taskDueDate) : undefined,
        reminderTime: taskReminderEnabled ? (taskReminderTime || '08:00') : undefined,
        reminderOption: taskReminderEnabled ? 'custom' : 'none',
        priority: taskPriority,
        notes: taskNotes.trim() || undefined
      });

      playEagleSound('success');
      setShowEditModal(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Helper to format days remaining
  const getDaysRemainingBadge = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="px-2 py-0.5 rounded-md bg-[#FF453A]/20 text-[#FF453A] text-[10px] font-bold">Overdue • {Math.abs(diffDays)}d ago</span>;
    } else if (diffDays === 0) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF9F0A]/20 text-[#FF9F0A] text-[10px] font-bold"><Flame className="w-3 h-3 fill-current" /><span>DUE TODAY</span></span>;
    } else if (diffDays === 1) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#282828] text-white border border-[#38383A] text-[10px] font-semibold"><Zap className="w-3 h-3 text-white" /><span>Due Tomorrow</span></span>;
    } else {
      return <span className="px-2 py-0.5 rounded-md bg-[#282828] text-[#8E8E93] text-[10px] font-medium">In {diffDays} days</span>;
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'pending') return !t.completed;
    if (activeFilter === 'completed') return t.completed;
    if (activeFilter === 'urgent') return !t.completed && t.priority === 'high';
    return true;
  });

  return (
    <div className="space-y-4 pb-24 animate-fade-in">

      {/* TASK LIST HEADER & ACTIONS */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--card-border)]">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CheckSquare className="w-4.5 h-4.5 text-[var(--text-primary)]" />
              <span>Assignments &amp; Deliverables</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Track quizzes, midterms, projects, and deliverables per subject.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center gap-1.5 self-start sm:self-auto pressable"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--btn-primary-text)]" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `All (${tasks.length})` },
            { id: 'pending', label: `Pending (${tasks.filter(t => !t.completed).length})` },
            { id: 'urgent', label: `Urgent (${tasks.filter(t => !t.completed && t.priority === 'high').length})` },
            { id: 'completed', label: `Done (${tasks.filter(t => t.completed).length})` }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all pressable ${
                activeFilter === f.id
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--card-border)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Inset Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="p-6 text-center rounded-3xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2 animate-fade-in">
            <div className="flex justify-center">
              <EagleBuddy
                mood={activeFilter === 'completed' ? 'celebrating' : 'friendly'}
                width={105}
                height={115}
                showSpeech={false}
                isAnimated={true}
              />
            </div>
            <h4 className="font-bold text-sm text-[var(--text-primary)]">
              {activeFilter === 'completed' ? 'No completed tasks yet' : 'No tasks in this view'}
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              {activeFilter === 'completed'
                ? 'Finish upcoming assignments and check them off here!'
                : 'Mabuhay! Tap "Add Task" to record your upcoming deliverables.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 pressable ${
                  task.completed
                    ? 'border-[var(--card-border)] bg-[var(--nested-bg)] opacity-60'
                    : 'border-[var(--card-border)] bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)]'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task)}
                    className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                      task.completed
                        ? 'bg-[#30D158] border-[#30D158] text-black'
                        : 'border-[var(--card-border)] hover:border-[var(--text-primary)]'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3] text-black" />}
                  </button>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-sm font-bold text-[var(--text-primary)] truncate ${task.completed ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                        {task.title}
                      </h4>
                      {task.subjectCode && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] text-[10px] font-bold">
                          {task.subjectCode}
                        </span>
                      )}
                      {getDaysRemainingBadge(task.dueDate)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <CalendarIcon className="w-3 h-3 text-[var(--text-secondary)]" />
                        <span>Deadline: {task.dueDate}{task.dueTime ? ` • ${formatTime12h(task.dueTime)}` : ''}</span>
                      </span>
                      {task.reminderDate && !task.completed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#3B82F6]/15 text-[#3B82F6] dark:text-[#60A5FA] font-bold text-[10px]">
                          <Bell className="w-2.5 h-2.5" />
                          <span>Reminding {task.reminderDate === task.dueDate ? 'Same Day' : task.reminderDate} at {task.reminderTime ? formatTime12h(task.reminderTime) : '8:00 AM'}</span>
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditTask(task)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-colors pressable"
                    title="Edit Task"
                    aria-label="Edit Task"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskPendingDelete(task)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[#FF453A] hover:bg-[var(--card-bg)] transition-colors pressable"
                    title="Delete Task"
                    aria-label="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD TASK MODAL */}
      {showAddModal && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl p-6 space-y-4 sheet-enter-spring max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Add Academic Deadline
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Task / Exam Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value.slice(0, 120))}
                  placeholder="e.g. Midterm Exam Review, Lab Report 2"
                  className="w-full p-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>

              {/* Course / Subject Picker with SelectWithOther */}
              <SelectWithOther
                label="Course / Subject"
                options={[
                  { value: '', label: 'General / None' },
                  ...enrolledSubjects.map((s) => ({ value: s, label: s }))
                ]}
                value={taskSubject}
                onChange={(val) => setTaskSubject(val)}
                otherPlaceholder="Type subject code e.g. PE 101, NSTP, THESIS"
                otherOptionLabel="Other Subject"
                selectClassName="bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-primary)]"
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'high', label: 'High', sub: 'Exam / Major', icon: Flame },
                    { id: 'medium', label: 'Medium', sub: 'Quiz / Project', icon: Zap },
                    { id: 'low', label: 'Low', sub: 'Reading', icon: Coffee },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = taskPriority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTaskPriority(p.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          isSelected
                            ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                            : 'border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-xs font-bold">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{p.label}</span>
                        </div>
                        <div className="text-[10px] opacity-75">{p.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. DEADLINE SECTION */}
              <div className="space-y-2 pt-2 border-t border-[var(--card-border)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>Task Deadline</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">When it must be submitted</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDatePickerTarget('due')}
                    className="w-full p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between text-left pressable"
                  >
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>{taskDueDate || 'Due Date'}</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Change</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimePickerTarget('due')}
                    className="w-full p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between text-left pressable hover:border-[var(--text-secondary)] transition-all"
                    title="Deadline Time"
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span className="font-bold">{formatTime12h(taskDueTime) || '11:59 PM'}</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Change</span>
                  </button>
                </div>

                {/* Deadline Time Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: '11:59 PM', val: '23:59' },
                    { label: '5:00 PM', val: '17:00' },
                    { label: '12:00 PM', val: '12:00' },
                    { label: '8:00 AM', val: '08:00' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setTaskDueTime(preset.val)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                        taskDueTime === preset.val
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent'
                          : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. SEPARATED NOTIFICATION & REMINDER SECTION */}
              <div className="space-y-2 pt-2 border-t border-[var(--card-border)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" />
                    <span>Notification &amp; Reminders</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskReminderEnabled}
                      onChange={(e) => setTaskReminderEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Remind Me</span>
                  </label>
                </div>

                {taskReminderEnabled && (
                  <div className="space-y-2 p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] animate-fade-in">
                    <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                      Reminder Alarm Schedule
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDatePickerTarget('reminder')}
                        className="w-full p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between text-left pressable"
                      >
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span>{taskReminderDate || 'Remind Date'}</span>
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Change</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTimePickerTarget('reminder')}
                        className="w-full p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between text-left pressable hover:border-[var(--text-secondary)] transition-all"
                        title="Reminder Notification Time"
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-bold">{formatTime12h(taskReminderTime) || '08:00 AM'}</span>
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Change</span>
                      </button>
                    </div>

                    {/* Quick Date Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const due = new Date(taskDueDate);
                          due.setDate(due.getDate() - 1);
                          setTaskReminderDate(due.toISOString().split('T')[0]);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        1 Day Before
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTaskReminderDate(taskDueDate);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Same Day
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const due = new Date(taskDueDate);
                          due.setDate(due.getDate() - 2);
                          setTaskReminderDate(due.toISOString().split('T')[0]);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        2 Days Before
                      </button>
                    </div>

                    {/* Priority Alert Behavior Banner */}
                    <div className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[10px] text-[var(--text-secondary)] space-y-0.5">
                      <div className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                        <span>⚡ Priority Near-Hour Alerts:</span>
                        <span className="uppercase text-[var(--btn-primary-bg)]">{taskPriority}</span>
                      </div>
                      <p>
                        {taskPriority === 'high' && 'Fires at reminder time + recurring near-hour alarms: 24h, 12h, 4h, 2h, and 1h before deadline.'}
                        {taskPriority === 'medium' && 'Fires at reminder time + recurring near-hour alarms: 24h, 6h, and 2h before deadline.'}
                        {taskPriority === 'low' && 'Fires at reminder time + 24h and 3h before deadline.'}
                      </p>
                      <p className="opacity-75 italic text-[9px]">
                        Marking this task as completed will immediately cancel all alarms.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Notes / Instructions • Optional
                  </label>
                  <span className={`text-[10px] font-mono ${taskNotes.length >= 450 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                    {taskNotes.length}/500
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value.slice(0, 500))}
                  placeholder="Additional details..."
                  className="w-full p-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] resize-none focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT TASK MODAL */}
      {showEditModal && editingTask && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => {
            setShowEditModal(false);
            setEditingTask(null);
          }}
        >
          <div 
            className="w-full max-w-md bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl p-6 space-y-4 sheet-enter-spring max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Pencil className="w-4 h-4 text-sky-400" />
                <span>Edit Academic Task</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTask(null);
                }}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="space-y-3.5 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Task / Exam Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value.slice(0, 120))}
                  placeholder="e.g. Midterm Exam Review, Lab Report 2"
                  className="w-full p-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>

              {/* Course / Subject Picker with SelectWithOther */}
              <SelectWithOther
                label="Course / Subject"
                options={[
                  { value: '', label: 'General / None' },
                  ...enrolledSubjects.map((s) => ({ value: s, label: s }))
                ]}
                value={taskSubject}
                onChange={(val) => setTaskSubject(val)}
                otherPlaceholder="Type subject code e.g. PE 101, NSTP, THESIS"
                otherOptionLabel="Other Subject"
                selectClassName="bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-primary)]"
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'high', label: 'High', sub: 'Exam / Major', icon: Flame },
                    { id: 'medium', label: 'Medium', sub: 'Quiz / Project', icon: Zap },
                    { id: 'low', label: 'Low', sub: 'Reading', icon: Coffee },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = taskPriority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTaskPriority(p.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          isSelected
                            ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                            : 'border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-xs font-bold">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{p.label}</span>
                        </div>
                        <div className="text-[10px] opacity-75">{p.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DEADLINE SECTION */}
              <div className="space-y-2 pt-2 border-t border-[var(--card-border)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>Task Deadline</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">When it must be submitted</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDatePickerTarget('due')}
                    className="w-full p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between text-left pressable"
                  >
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>{taskDueDate || 'Due Date'}</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Change</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimePickerTarget('due')}
                    className="w-full p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between text-left pressable hover:border-[var(--text-secondary)] transition-all"
                    title="Deadline Time"
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>{formatTime12h(taskDueTime) || '11:59 PM'}</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Change</span>
                  </button>
                </div>
              </div>

              {/* REMINDER SECTION */}
              <div className="space-y-2 pt-2 border-t border-[var(--card-border)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" />
                    <span>Notification &amp; Reminders</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskReminderEnabled}
                      onChange={(e) => setTaskReminderEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Remind Me</span>
                  </label>
                </div>

                {taskReminderEnabled && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDatePickerTarget('reminder')}
                        className="w-full p-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between text-left pressable"
                      >
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                          <span>{taskReminderDate || taskDueDate}</span>
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Date</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTimePickerTarget('reminder')}
                        className="w-full p-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between text-left pressable hover:border-[var(--text-secondary)] transition-all"
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span>{formatTime12h(taskReminderTime) || '08:00 AM'}</span>
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">Time</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Notes / Instructions • Optional
                  </label>
                  <span className={`text-[10px] font-mono ${taskNotes.length >= 450 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                    {taskNotes.length}/500
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value.slice(0, 500))}
                  placeholder="Additional details..."
                  className="w-full p-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] resize-none focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Touch-Friendly Task Deletion Confirmation Modal */}
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
                  await handleDeleteTask(toDelete);
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

      {/* Touch-Friendly Custom Date Picker Modal */}
      <CustomDatePickerModal
        isOpen={Boolean(datePickerTarget)}
        onClose={() => setDatePickerTarget(null)}
        initialDate={datePickerTarget === 'reminder' ? taskReminderDate : taskDueDate}
        onSelectDate={(date) => {
          if (datePickerTarget === 'reminder') {
            setTaskReminderDate(date);
          } else {
            setTaskDueDate(date);
          }
        }}
        title={datePickerTarget === 'reminder' ? 'Select Reminder Date' : 'Select Task Due Date'}
      />

      {/* Touch-Friendly Custom Time Picker Modal */}
      <CustomTimePickerModal
        isOpen={Boolean(timePickerTarget)}
        onClose={() => setTimePickerTarget(null)}
        initialTime={timePickerTarget === 'reminder' ? taskReminderTime : taskDueTime}
        onSelectTime={(time24) => {
          if (timePickerTarget === 'reminder') {
            setTaskReminderTime(time24);
          } else {
            setTaskDueTime(time24);
          }
          setTimePickerTarget(null);
        }}
        title={timePickerTarget === 'reminder' ? 'Select Reminder Time' : 'Select Task Due Time'}
      />

    </div>
  );
};
