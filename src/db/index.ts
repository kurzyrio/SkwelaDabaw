import Dexie, { Table } from 'dexie';
import { ClassSchedule, TaskItem, GradeItem, ExpenseItem, ChatMessage, DayReminderItem, StudentFeedbackRecord } from '../types';

export interface UserProfile {
  id?: number;
  name: string;
  campusId: string;
  course: string;
  yearLevel: string;
  studentId?: string;
  dailyAllowance: number;
}

export interface CachedImageRecord {
  url: string;
  blob: Blob;
  mimeType: string;
  timestamp: number;
}

export class SkwelaDabawDatabase extends Dexie {
  schedules!: Table<ClassSchedule, number>;
  tasks!: Table<TaskItem, number>;
  grades!: Table<GradeItem, number>;
  expenses!: Table<ExpenseItem, number>;
  userProfile!: Table<UserProfile, number>;
  offlineChatQueue!: Table<ChatMessage, string>;
  dayReminders!: Table<DayReminderItem, number>;
  feedback!: Table<StudentFeedbackRecord, number>;
  cachedImages!: Table<CachedImageRecord, string>;

  get classes(): Table<ClassSchedule, number> {
    return this.schedules;
  }

  constructor() {
    super('SkwelaDabawDB');
    this.version(2).stores({
      schedules: '++id, ofrCode, subjectCode, startTime',
      tasks: '++id, dueDate, priority, completed, subjectCode',
      grades: '++id, subjectCode',
      expenses: '++id, date, category',
      userProfile: '++id',
      offlineChatQueue: 'id, channelId, timestamp'
    });

    this.version(3).stores({
      dayReminders: '++id, dayOfWeek, time, enabled'
    });

    this.version(4).stores({
      feedback: '++id, campus, category, rating, createdAt'
    });

    this.version(5).stores({
      tasks: '++id, &uuid, dueDate, priority, completed, is_completed, sync_status, subjectCode'
    }).upgrade(async (trans) => {
      await trans.table('tasks').toCollection().modify((task: any) => {
        if (!task.uuid) {
          task.uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : ('task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
        }
        if (task.is_completed === undefined) {
          task.is_completed = Boolean(task.completed);
        }
        if (!task.sync_status) {
          task.sync_status = 'synced';
        }
        if (!task.created_at) {
          task.created_at = new Date().toISOString();
        }
        if (!task.updated_at) {
          task.updated_at = task.created_at;
        }
      });
    });

    this.version(6).stores({
      cachedImages: '&url, timestamp'
    });
  }
}

export const db = new SkwelaDabawDatabase();

// Clean database initialization without fake made-up schedules
export async function initializeDatabaseWithSeedData() {
  const profileCount = await db.userProfile.count();
  if (profileCount === 0) {
    await db.userProfile.add({
      name: 'Student',
      campusId: 'addu-jacinto',
      course: 'Enrolled Student',
      yearLevel: '1st Year',
      dailyAllowance: 150
    });
  }
}
