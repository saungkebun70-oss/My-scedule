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
    bgClass: 'bg-[#E8DFF5]',
    softBgClass: 'bg-[#F5F0FC]',
    textClass: 'text-[#5B21B6]',
    borderClass: 'border-[#DDD6FE]',
    dotColor: '#8B5CF6',
    hexBg: '#E8DFF5',
  },
  harian: {
    id: 'harian',
    label: 'Jadwal Harian',
    shortLabel: 'Harian',
    bgClass: 'bg-[#E2ECE9]',
    softBgClass: 'bg-[#F1F8F6]',
    textClass: 'text-[#065F46]',
    borderClass: 'border-[#B7E1D5]',
    dotColor: '#10B981',
    hexBg: '#E2ECE9',
  },
  acara: {
    id: 'acara',
    label: 'Acara Hari Ini',
    shortLabel: 'Acara',
    bgClass: 'bg-[#FCE1E4]',
    softBgClass: 'bg-[#FFF3F5]',
    textClass: 'text-[#9D174D]',
    borderClass: 'border-[#FBCFE8]',
    dotColor: '#EC4899',
    hexBg: '#FCE1E4',
  },
  rapat_deadline: {
    id: 'rapat_deadline',
    label: 'Rapat & Deadline',
    shortLabel: 'Rapat & Deadline',
    bgClass: 'bg-[#DAEAF6]',
    softBgClass: 'bg-[#F0F7FD]',
    textClass: 'text-[#1E40AF]',
    borderClass: 'border-[#BFDBFE]',
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
