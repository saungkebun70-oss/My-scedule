import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  MeetingSubType,
  PriorityLevel,
  ScheduleCategory,
  ScheduleItem,
  StudentProfile,
} from '../types/schedule';
import { addDays, formatDateKey } from '../utils/dateUtils';

const LOCAL_PROFILE_PREFIX = 'my_schedule_profile_';
const LOCAL_SCHEDULES_PREFIX = 'my_schedule_items_';
const LOCAL_CHANNEL_EVENT = 'my-schedule-local-update';

function clampString(val: unknown, max: number): string {
  const str = typeof val === 'string' ? val.trim() : '';
  return str.slice(0, max);
}

function sanitizeDate(val: unknown): string {
  const str = typeof val === 'string' ? val.trim() : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : formatDateKey(new Date());
}

function sanitizeTime(val: unknown, fallback = '08:00'): string {
  const str = typeof val === 'string' ? val.trim() : '';
  return /^\d{2}:\d{2}$/.test(str) ? str : fallback;
}

function sanitizeEndTime(val: unknown): string {
  const str = typeof val === 'string' ? val.trim() : '';
  return /^\d{2}:\d{2}$/.test(str) ? str : '';
}

function sanitizeSks(val: unknown): number {
  const num = Number(val);
  if (Number.isNaN(num) || num < 0) return 0;
  if (num > 12) return 12;
  return Math.round(num);
}

export function buildDefaultProfile(
  uid: string,
  displayName?: string | null,
  photoURL?: string | null
): StudentProfile {
  return {
    uid,
    nama: clampString(displayName, 100) || 'Mahasiswa Hebat',
    universitas: 'Universitas Singaperbangsa Karawang',
    jurusan: 'Teknik Informatika',
    semester: 'Semester 5',
    mood: 'Semangat Kuliah ✨',
    photoBase64: clampString(photoURL, 150000),
  };
}

export type NewScheduleInput = Omit<ScheduleItem, 'id' | 'uid' | 'createdAt' | 'updatedAt'>;

export function buildInitialSeedItems(baseDate: Date = new Date()): NewScheduleInput[] {
  const today = formatDateKey(baseDate);
  const tomorrow = formatDateKey(addDays(baseDate, 1));
  const plus2 = formatDateKey(addDays(baseDate, 2));
  const plus3 = formatDateKey(addDays(baseDate, 3));
  const plus4 = formatDateKey(addDays(baseDate, 4));

  return [
    // Jadwal Matkul (5 items)
    {
      category: 'matkul',
      title: 'Pemrograman Web Lanjut',
      date: today,
      startTime: '08:00',
      endTime: '10:30',
      completed: false,
      room: 'Lab Komputer Fasilkom 02',
      lecturer: 'Dr. Budi Santoso, M.Kom.',
      sks: 3,
      location: '',
      notes: 'Membahas arsitektur React modern dan state realtime.',
      priority: '',
      subType: '',
    },
    {
      category: 'matkul',
      title: 'Basis Data Terdistribusi',
      date: today,
      startTime: '13:00',
      endTime: '15:30',
      completed: false,
      room: 'Gedung Kuliah B-304',
      lecturer: 'Siti Rahmawati, M.T.',
      sks: 3,
      location: '',
      notes: 'Praktikum replikasi dan partisi data NoSQL.',
      priority: '',
      subType: '',
    },
    {
      category: 'matkul',
      title: 'Kecerdasan Buatan',
      date: tomorrow,
      startTime: '09:30',
      endTime: '12:00',
      completed: false,
      room: 'Ruang Seminar A-201',
      lecturer: 'Prof. Hendra Wijaya, Ph.D.',
      sks: 3,
      location: '',
      notes: 'Studi kasus heuristic search dan evaluasi model.',
      priority: '',
      subType: '',
    },
    {
      category: 'matkul',
      title: 'Interaksi Manusia & Komputer',
      date: plus2,
      startTime: '10:00',
      endTime: '11:40',
      completed: false,
      room: 'Studio Desain UI/UX C-102',
      lecturer: 'Nadia Kusuma, M.Ds.',
      sks: 2,
      location: '',
      notes: 'Usability testing prototipe aplikasi mahasiswa.',
      priority: '',
      subType: '',
    },
    {
      category: 'matkul',
      title: 'Keamanan Jaringan Komputer',
      date: plus4,
      startTime: '13:30',
      endTime: '15:10',
      completed: false,
      room: 'Lab Jaringan Terpadu',
      lecturer: 'Rizky Pratama, M.Kom.',
      sks: 2,
      location: '',
      notes: 'Simulasi firewall dan analisis paket jaringan.',
      priority: '',
      subType: '',
    },

    // Jadwal Harian (3 items on today)
    {
      category: 'harian',
      title: 'Review Materi Kuliah Pagi',
      date: today,
      startTime: '06:30',
      endTime: '07:15',
      completed: true,
      room: '',
      lecturer: '',
      sks: 0,
      location: 'Kamar Belajar',
      notes: 'Rangkum poin penting sebelum masuk kelas.',
      priority: '',
      subType: '',
    },
    {
      category: 'harian',
      title: 'Olahraga Sore',
      date: today,
      startTime: '16:30',
      endTime: '17:15',
      completed: false,
      room: '',
      lecturer: '',
      sks: 0,
      location: 'Lapangan Kampus',
      notes: 'Jogging santai 3 km & peregangan.',
      priority: '',
      subType: '',
    },
    {
      category: 'harian',
      title: 'Persiapan Tugas Besok',
      date: today,
      startTime: '20:00',
      endTime: '21:30',
      completed: false,
      room: '',
      lecturer: '',
      sks: 0,
      location: 'Meja Belajar',
      notes: 'Cek catatan praktikum dan siapkan berkas presentasi.',
      priority: '',
      subType: '',
    },

    // Acara Hari Ini (2 items on today)
    {
      category: 'acara',
      title: 'Seminar Teknologi Kampus',
      date: today,
      startTime: '10:45',
      endTime: '12:15',
      completed: false,
      room: '',
      lecturer: '',
      sks: 0,
      location: 'Aula Utama Universitas',
      notes: 'Topik: Membangun Karier Software Engineer di Era Cloud.',
      priority: '',
      subType: '',
    },
    {
      category: 'acara',
      title: 'Kumpul Komunitas Coding',
      date: today,
      startTime: '15:45',
      endTime: '17:00',
      completed: false,
      room: '',
      lecturer: '',
      sks: 0,
      location: 'Co-Working Space Perpustakaan',
      notes: 'Diskusi mingguan open-source & persiapan hackathon.',
      priority: '',
      subType: '',
    },

    // Rapat & Deadline (3 items: today rapat, today deadline, H+2 deadline)
    {
      category: 'rapat_deadline',
      title: 'Rapat Koordinasi Panitia Kampus',
      date: today,
      startTime: '19:00',
      endTime: '20:00',
      completed: false,
      room: '',
      lecturer: '',
      sks: 0,
      location: 'https://meet.google.com/panitia-kampus',
      notes: 'Finalisasi rundown acara orientasi mahasiswa baru.',
      priority: 'sedang',
      subType: 'rapat',
    },
    {
      category: 'rapat_deadline',
      title: 'Deadline Pengumpulan Laporan Praktikum',
      date: today,
      startTime: '23:59',
      endTime: '',
      completed: false,
      room: '',
      lecturer: '',
      sks: 0,
      location: 'Portal E-Learning Kampus',
      notes: 'Upload PDF laporan Modul 4 sebelum tengah malam.',
      priority: 'tinggi',
      subType: 'deadline',
    },
    {
      category: 'rapat_deadline',
      title: 'Deadline Project UI/UX',
      date: plus2,
      startTime: '23:59',
      endTime: '',
      completed: false,
      room: '',
      lecturer: '',
      sks: 0,
      location: 'Figma & Submission Classroom',
      notes: 'Kumpulkan prototipe interaktif dan hasil usability test.',
      priority: 'tinggi',
      subType: 'deadline',
    },
    {
      category: 'matkul',
      title: 'Rekayasa Perangkat Lunak',
      date: plus3,
      startTime: '08:00',
      endTime: '10:30',
      completed: false,
      room: 'Gedung Kuliah A-105',
      lecturer: 'Dewi Anggraini, M.Kom.',
      sks: 3,
      location: '',
      notes: 'Review sprint backlog dan diagram arsitektur sistem.',
      priority: '',
      subType: '',
    },
  ];
}

// Local storage helpers
function readLocalProfile(uid: string): StudentProfile | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_PROFILE_PREFIX}${uid}`);
    return raw ? (JSON.parse(raw) as StudentProfile) : null;
  } catch {
    return null;
  }
}

function writeLocalProfile(uid: string, profile: StudentProfile) {
  localStorage.setItem(`${LOCAL_PROFILE_PREFIX}${uid}`, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(LOCAL_CHANNEL_EVENT, { detail: { uid } }));
}

function readLocalSchedules(uid: string): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_SCHEDULES_PREFIX}${uid}`);
    return raw ? (JSON.parse(raw) as ScheduleItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocalSchedules(uid: string, items: ScheduleItem[]) {
  localStorage.setItem(`${LOCAL_SCHEDULES_PREFIX}${uid}`, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(LOCAL_CHANNEL_EVENT, { detail: { uid } }));
}

let idCounter = 0;
function generateClientId(): string {
  idCounter += 1;
  return `sch_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Auto-seed initial user data if user's schedules collection is empty
export async function seedInitialUserData(
  userId: string,
  displayName: string | null,
  photoURL: string | null,
  isLocalMode: boolean
): Promise<boolean> {
  if (isLocalMode || !db) {
    const existingProfile = readLocalProfile(userId);
    const existingSchedules = readLocalSchedules(userId);

    if (!existingProfile) {
      writeLocalProfile(userId, buildDefaultProfile(userId, displayName, photoURL));
    }

    if (existingSchedules.length === 0) {
      const seedItems = buildInitialSeedItems(new Date()).map((item) => ({
        ...item,
        id: generateClientId(),
        uid: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      writeLocalSchedules(userId, seedItems);
      return true;
    }
    return false;
  }

  const schedulesPath = `users/${userId}/schedules`;
  const profileDocRef = doc(db, 'users', userId, 'profile', 'main');
  const schedulesColRef = collection(db, 'users', userId, 'schedules');

  let existingSnap;
  let profileSnap;
  try {
    [existingSnap, profileSnap] = await Promise.all([
      getDocs(query(schedulesColRef, where('uid', '==', userId))),
      getDoc(profileDocRef),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, schedulesPath);
  }

  const profileMissing = !profileSnap.exists();
  const schedulesMissing = existingSnap.empty;

  if (schedulesMissing || profileMissing) {
    try {
      const batch = writeBatch(db);
      const localProfile = readLocalProfile('local-student');
      const localSchedules = readLocalSchedules('local-student');

      if (profileMissing) {
        const baseProfile = buildDefaultProfile(userId, displayName, photoURL);
        batch.set(profileDocRef, {
          uid: userId,
          nama: clampString(localProfile?.nama || baseProfile.nama, 100) || 'Mahasiswa Hebat',
          universitas: clampString(localProfile?.universitas ?? baseProfile.universitas, 120),
          jurusan: clampString(localProfile?.jurusan ?? baseProfile.jurusan, 120),
          semester: clampString(localProfile?.semester ?? baseProfile.semester, 40),
          mood: clampString(localProfile?.mood ?? baseProfile.mood, 60),
          photoBase64: clampString(
            localProfile?.photoBase64 || baseProfile.photoBase64,
            150000
          ),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (schedulesMissing) {
        const itemsToSeed =
          localSchedules.length > 0 ? localSchedules : buildInitialSeedItems(new Date());
        for (const item of itemsToSeed) {
          const itemRef = doc(schedulesColRef, generateClientId());
          batch.set(itemRef, {
            uid: userId,
            category: item.category,
            title: clampString(item.title, 120) || 'Jadwal',
            date: sanitizeDate(item.date),
            startTime: sanitizeTime(item.startTime),
            endTime: sanitizeEndTime(item.endTime),
            completed: Boolean(item.completed),
            room: clampString(item.room, 80),
            lecturer: clampString(item.lecturer, 80),
            sks: sanitizeSks(item.sks),
            location: clampString(item.location, 150),
            notes: clampString(item.notes, 300),
            priority: item.priority || '',
            subType: item.subType || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();

      // Clean up temporary local guest data after successful cloud sync
      if (localProfile) localStorage.removeItem(`${LOCAL_PROFILE_PREFIX}local-student`);
      if (localSchedules.length > 0) {
        localStorage.removeItem(`${LOCAL_SCHEDULES_PREFIX}local-student`);
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, schedulesPath);
    }
  }

  return false;
}

export async function addSampleSchedulePack(userId: string, isLocalMode: boolean): Promise<void> {
  const items = buildInitialSeedItems(new Date());

  if (isLocalMode || !db) {
    const existing = readLocalSchedules(userId);
    const additions: ScheduleItem[] = items.map((item) => ({
      ...item,
      id: generateClientId(),
      uid: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    writeLocalSchedules(userId, [...existing, ...additions]);
    return;
  }

  const schedulesPath = `users/${userId}/schedules`;
  try {
    const batch = writeBatch(db);
    const colRef = collection(db, 'users', userId, 'schedules');
    for (const item of items) {
      const itemRef = doc(colRef, generateClientId());
      batch.set(itemRef, {
        uid: userId,
        category: item.category,
        title: clampString(item.title, 120),
        date: sanitizeDate(item.date),
        startTime: sanitizeTime(item.startTime),
        endTime: sanitizeEndTime(item.endTime),
        completed: Boolean(item.completed),
        room: clampString(item.room, 80),
        lecturer: clampString(item.lecturer, 80),
        sks: sanitizeSks(item.sks),
        location: clampString(item.location, 150),
        notes: clampString(item.notes, 300),
        priority: item.priority,
        subType: item.subType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, schedulesPath);
  }
}

export async function clearAllSchedules(userId: string, isLocalMode: boolean): Promise<void> {
  if (isLocalMode || !db) {
    writeLocalSchedules(userId, []);
    return;
  }

  const schedulesPath = `users/${userId}/schedules`;
  try {
    const colRef = collection(db, 'users', userId, 'schedules');
    const snap = await getDocs(query(colRef, where('uid', '==', userId)));
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, schedulesPath);
  }
}

export function subscribeToProfile(
  userId: string,
  isLocalMode: boolean,
  onData: (profile: StudentProfile | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (isLocalMode || !db) {
    onData(readLocalProfile(userId));
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ uid: string }>;
      if (!custom.detail || custom.detail.uid === userId) {
        onData(readLocalProfile(userId));
      }
    };
    window.addEventListener(LOCAL_CHANNEL_EVENT, handler);
    return () => window.removeEventListener(LOCAL_CHANNEL_EVENT, handler);
  }

  const path = `users/${userId}/profile/main`;
  const profileRef = doc(db, 'users', userId, 'profile', 'main');
  return onSnapshot(
    profileRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as StudentProfile);
      } else {
        onData(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    }
  );
}

export function subscribeToSchedules(
  userId: string,
  isLocalMode: boolean,
  onData: (items: ScheduleItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (isLocalMode || !db) {
    onData(readLocalSchedules(userId));
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ uid: string }>;
      if (!custom.detail || custom.detail.uid === userId) {
        onData(readLocalSchedules(userId));
      }
    };
    window.addEventListener(LOCAL_CHANNEL_EVENT, handler);
    return () => window.removeEventListener(LOCAL_CHANNEL_EVENT, handler);
  }

  const path = `users/${userId}/schedules`;
  const colRef = collection(db, 'users', userId, 'schedules');
  const schedulesQuery = query(colRef, where('uid', '==', userId));
  return onSnapshot(
    schedulesQuery,
    (snapshot) => {
      const items: ScheduleItem[] = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<ScheduleItem, 'id'>),
        id: d.id,
      }));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    }
  );
}

export async function saveStudentProfile(
  userId: string,
  updates: Partial<Omit<StudentProfile, 'uid' | 'createdAt' | 'updatedAt'>>,
  currentProfile: StudentProfile | null,
  isLocalMode: boolean
): Promise<void> {
  const base = currentProfile || buildDefaultProfile(userId);
  const sanitized = {
    nama: clampString(updates.nama ?? base.nama, 100) || 'Mahasiswa',
    universitas: clampString(updates.universitas ?? base.universitas, 120),
    jurusan: clampString(updates.jurusan ?? base.jurusan, 120),
    semester: clampString(updates.semester ?? base.semester, 40),
    mood: clampString(updates.mood ?? base.mood, 60),
    photoBase64: clampString(updates.photoBase64 ?? base.photoBase64, 150000),
  };

  if (isLocalMode || !db) {
    writeLocalProfile(userId, {
      uid: userId,
      ...sanitized,
      createdAt: base.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const path = `users/${userId}/profile/main`;
  const profileRef = doc(db, 'users', userId, 'profile', 'main');
  try {
    if (!currentProfile) {
      await setDoc(profileRef, {
        uid: userId,
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(profileRef, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createScheduleItem(
  userId: string,
  input: NewScheduleInput,
  isLocalMode: boolean
): Promise<void> {
  const payload = {
    uid: userId,
    category: input.category as ScheduleCategory,
    title: clampString(input.title, 120) || 'Jadwal Baru',
    date: sanitizeDate(input.date),
    startTime: sanitizeTime(input.startTime),
    endTime: sanitizeEndTime(input.endTime),
    completed: Boolean(input.completed),
    room: clampString(input.room, 80),
    lecturer: clampString(input.lecturer, 80),
    sks: sanitizeSks(input.sks),
    location: clampString(input.location, 150),
    notes: clampString(input.notes, 300),
    priority: (input.priority || '') as PriorityLevel,
    subType: (input.subType || '') as MeetingSubType,
  };

  if (isLocalMode || !db) {
    const existing = readLocalSchedules(userId);
    const created: ScheduleItem = {
      id: generateClientId(),
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeLocalSchedules(userId, [...existing, created]);
    return;
  }

  const id = generateClientId();
  const path = `users/${userId}/schedules/${id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'schedules', id), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateScheduleItem(
  userId: string,
  scheduleId: string,
  input: NewScheduleInput,
  isLocalMode: boolean
): Promise<void> {
  const payload = {
    category: input.category as ScheduleCategory,
    title: clampString(input.title, 120) || 'Jadwal',
    date: sanitizeDate(input.date),
    startTime: sanitizeTime(input.startTime),
    endTime: sanitizeEndTime(input.endTime),
    completed: Boolean(input.completed),
    room: clampString(input.room, 80),
    lecturer: clampString(input.lecturer, 80),
    sks: sanitizeSks(input.sks),
    location: clampString(input.location, 150),
    notes: clampString(input.notes, 300),
    priority: (input.priority || '') as PriorityLevel,
    subType: (input.subType || '') as MeetingSubType,
  };

  if (isLocalMode || !db) {
    const existing = readLocalSchedules(userId);
    const updated = existing.map((item) =>
      item.id === scheduleId
        ? { ...item, ...payload, updatedAt: new Date().toISOString() }
        : item
    );
    writeLocalSchedules(userId, updated);
    return;
  }

  const path = `users/${userId}/schedules/${scheduleId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'schedules', scheduleId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleScheduleComplete(
  userId: string,
  scheduleId: string,
  completed: boolean,
  isLocalMode: boolean
): Promise<void> {
  if (isLocalMode || !db) {
    const existing = readLocalSchedules(userId);
    const updated = existing.map((item) =>
      item.id === scheduleId
        ? { ...item, completed, updatedAt: new Date().toISOString() }
        : item
    );
    writeLocalSchedules(userId, updated);
    return;
  }

  const path = `users/${userId}/schedules/${scheduleId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'schedules', scheduleId), {
      completed,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteScheduleItem(
  userId: string,
  scheduleId: string,
  isLocalMode: boolean
): Promise<void> {
  if (isLocalMode || !db) {
    const existing = readLocalSchedules(userId);
    writeLocalSchedules(
      userId,
      existing.filter((item) => item.id !== scheduleId)
    );
    return;
  }

  const path = `users/${userId}/schedules/${scheduleId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'schedules', scheduleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
