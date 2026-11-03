export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | 'Everyday';

export interface ClassSchedule {
  id?: number;
  ofrCode?: string;     // e.g. "1048", "CS-A1", "SEC-01", "OFR-994"
  subjectCode: string;  // e.g. "CS 101", "ENG 10", "MATH 21"
  subjectName: string;  // e.g. "Data Structures and Algorithms"
  room?: string;        // e.g. "Finster 402", "Room 304", or empty
  building?: string;    // e.g. "Finster Hall", or empty
  instructor?: string;  // e.g. "Prof. Dela Cruz", or empty
  days: DayOfWeek[];    // e.g. ['Monday', 'Wednesday', 'Friday']
  startTime: string;    // "08:00"
  endTime: string;      // "09:30"
  color: string;        // Hex or Tailwind color class
  units?: number;       // e.g. 3
  notes?: string;
  reminderMinutes?: number; // 0 = none, 15 = 15m before, 30 = 30m before, 60 = 1h before
}

export type TaskSyncStatus = 'pending_create' | 'pending_update' | 'pending_delete' | 'synced';

export interface TaskItem {
  id?: number;
  uuid: string;
  title: string;
  subjectCode?: string;
  dueDate: string;        // YYYY-MM-DD (Deadline Date)
  dueTime?: string;       // HH:MM (Deadline Time)
  reminderDate?: string;  // YYYY-MM-DD (Separated Reminder Notification Date)
  reminderTime?: string;  // HH:MM (Separated Reminder Notification Time)
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  sync_status: TaskSyncStatus;
  notes?: string;
  reminderOption?: 'none' | 'custom' | '15m' | '1h' | '1d' | 'due_date';
}


export interface GradeItem {
  id?: number;
  subjectCode: string;
  subjectName: string;
  units: number;
  targetGrade?: string;
  prelim?: number;
  midterm?: number;
  prefinal?: number;
  finals?: number;
  rawAverage?: number;
  transmutedGrade?: string; // e.g. "1.25", "A", "94"
  gradingScale: '1.0-5.0' | 'qpi-4.0' | 'percentage';
}

export interface DavaoJeepRoute {
  id: string;
  routeCode: string;       // e.g. "Route 4", "Toril", "Mintal", "Buhangin"
  routeName: string;       // e.g. "Toril to Claveria / Roxas"
  color: string;           // Visual badge color
  origin: string;
  destination: string;
  campusesServed: string[];// List of campus IDs or names
  landmarks: string[];     // e.g. ["Toril Gaisano", "Ulas", "Matina Crossing", "Bangkerohan", "Aldevinco", "Roxas"]
  estimatedTravelTime: string;
  baseFareStudent: number; // ₱10.50
  regularBaseFare: number; // ₱13.00
  tags: string[];          // e.g. ["Matina Highway", "Downtown", "Southbound"]
  directionsNotes: string; // Practical commuter tips
  peakHours: string;       // e.g. "6:30 AM - 8:30 AM, 4:30 PM - 7:00 PM"
}

export interface DavaoCampus {
  id: string;
  name: string;
  shortName: string;       // "AdDU Jacinto", "USEP Obrero", "UM Matina"
  address: string;
  nearestLandmark: string;
  recommendedJeeps: string[]; // jeep route IDs
  dropOffPoints: string[];
  lat: number;
  lng: number;
  website?: string;
  contactEmergency?: string;
  primaryColor?: string;
  type?: string;
  area?: string;
  googleMapsUrl?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  agency: string;
  phoneNumber: string;
  altPhone?: string;
  category: 'national' | 'davao_911' | 'police' | 'medical' | 'campus';
  description: string;
  isQuickDial: boolean;
}

export type EmergencyFacilityType = 'police' | 'hospital' | 'davao_911';

export type DavaoSector = 
  | 'Poblacion / Downtown'
  | 'South Davao (Talomo / Toril)'
  | 'North Davao (Buhangin / Bunawan)'
  | 'West Davao (Tugbok / Calinan / Marilog)';

export interface EmergencyLocation {
  id: string;
  name: string;
  type: EmergencyFacilityType;
  typeLabel: string;
  stationCode?: string; // e.g. "PS1", "PS2", ..., "PS20", "DCPO HQ"
  sector: DavaoSector;
  address: string;
  area: string;
  lat: number;
  lng: number;
  nearestLandmark: string;
  phonePrimary: string;
  phoneAlt?: string;
  mobile?: string;
  is24Hours: boolean;
  servicesOrCoverage: string;
  recommendedJeeps?: string[];
  isApex?: boolean;
}

export interface StudySpot {
  id: string;
  name: string;
  area: string;            // "Obrero", "Jacinto / Roxas", "Matina", "Toril", "Bajada"
  nearCampuses: string[];
  hasWifi: boolean;
  hasOutlets: boolean;
  is24Hours: boolean;
  priceRange: '₱' | '₱₱' | '₱₱₱';
  hours: string;
  address: string;
  specialty: string;
  rating: number;
  tips: string;
}

export interface ExpenseItem {
  id?: number;
  date: string;            // YYYY-MM-DD
  category: 'jeep' | 'food' | 'supplies' | 'photocopy' | 'coffee' | 'other';
  amount: number;
  note: string;
}

export interface ChatMessage {
  id: string;
  senderUid?: string;
  senderUsername?: string;
  senderName: string;
  senderSchool: string;
  senderRole?: 'student' | 'teacher' | 'admin';
  senderAvatar: string;
  channelId: string;
  content: string;
  timestamp: string;
  createdMillis?: number;
  isOwn?: boolean;
  isOfflineQueued?: boolean;
  isVerified?: boolean;
  presetTag?: string;
  customTag?: string;
  customTagBg?: string;
  customTagColor?: string;
  messageType?: 'text' | 'image' | 'gif' | 'route' | 'traffic_alert' | 'study_spot';
  mediaUrl?: string;
  payloadJson?: string;
  replyToId?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  category: 'city' | 'campuses' | 'campus' | 'utility' | 'spots';
}

export interface DayReminderItem {
  id?: number;
  title: string;
  dayOfWeek: DayOfWeek;
  time: string; // "HH:mm" 24h format
  enabled: boolean;
  notes?: string;
}

export interface StudentFeedbackRecord {
  id?: number;
  name: string;
  email?: string;
  campus: string;
  category: string;
  rating: number;
  subject?: string;
  message: string;
  status?: string;
  createdAt: string;
}
