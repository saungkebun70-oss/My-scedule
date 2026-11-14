export type ScheduleCategory = 'matkul' | 'harian' | 'acara' | 'rapat_deadline';

export type PriorityLevel = 'tinggi' | 'sedang' | 'rendah' | '';

export type MeetingSubType = 'rapat' | 'deadline' | '';

export interface StudentProfile {
  uid: string;
  nama: string;
  universitas: string;
  jurusan: string;
  semester: string;
  mood: string;
  photoBase64: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ScheduleItem {
  id: string;
  uid: string;
  category: ScheduleCategory;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm or ''
  completed: boolean;
  room: string;
  lecturer: string;
  sks: number;
  location: string;
  notes: string;
  priority: PriorityLevel;
  subType: MeetingSubType;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isLocal?: boolean;
}

export interface CategoryMeta {
  id: ScheduleCategory;
  label: string;
  shortLabel: string;
  bgClass: string;
  softBgClass: string;
  textClass: string;
  borderClass: string;
  dotColor: string;
  hexBg: string;
}

export const CATEGORY_META: Record<ScheduleCategory, CategoryMeta> = {
  matkul: {
    id: 'matkul',
    label: 'Jadwal Matkul',
    shortLabel: 'Matkul',
    bgClass: 'bg-[#E8DFF5] dark:bg-violet-950/70',
    softBgClass: 'bg-[#F5F0FC] dark:bg-violet-950/40',
    textClass: 'text-[#5B21B6] dark:text-violet-300',
    borderClass: 'border-[#DDD6FE] dark:border-violet-800/70',
    dotColor: '#8B5CF6',
    hexBg: '#E8DFF5',
  },
  harian: {
    id: 'harian',
    label: 'Jadwal Harian',
    shortLabel: 'Harian',
    bgClass: 'bg-[#E2ECE9] dark:bg-emerald-950/70',
    softBgClass: 'bg-[#F1F8F6] dark:bg-emerald-950/40',
    textClass: 'text-[#065F46] dark:text-emerald-300',
    borderClass: 'border-[#B7E1D5] dark:border-emerald-800/70',
    dotColor: '#10B981',
    hexBg: '#E2ECE9',
  },
  acara: {
    id: 'acara',
    label: 'Acara Hari Ini',
    shortLabel: 'Acara',
    bgClass: 'bg-[#FCE1E4] dark:bg-pink-950/70',
    softBgClass: 'bg-[#FFF3F5] dark:bg-pink-950/40',
    textClass: 'text-[#9D174D] dark:text-pink-300',
    borderClass: 'border-[#FBCFE8] dark:border-pink-800/70',
    dotColor: '#EC4899',
    hexBg: '#FCE1E4',
  },
  rapat_deadline: {
    id: 'rapat_deadline',
    label: 'Rapat & Deadline',
    shortLabel: 'Rapat & Deadline',
    bgClass: 'bg-[#DAEAF6] dark:bg-sky-950/70',
    softBgClass: 'bg-[#F0F7FD] dark:bg-sky-950/40',
    textClass: 'text-[#1E40AF] dark:text-sky-300',
    borderClass: 'border-[#BFDBFE] dark:border-sky-800/70',
    dotColor: '#3B82F6',
    hexBg: '#DAEAF6',
  },
};

export const MOOD_OPTIONS: string[] = [
  'Semangat Kuliah ✨',
  'Fokus Tugas 📚',
  'Nugas Mode 💻',
  'Butuh Kopi ☕',
  'Siap Presentasi 🎤',
  'Mode Santai 🌿',
];
