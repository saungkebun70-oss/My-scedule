import { useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  Camera,
  Check,
  Cloud,
  Edit3,
  GraduationCap,
  HardDrive,
  Home,
  ListTodo,
  LogOut,
  Plus,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type {
  BrowserNotificationPermission,
  ReminderSettings,
} from '../hooks/useScheduleReminders';
import { MOOD_OPTIONS, type StudentProfile } from '../types/schedule';
import { compressImageToBase64 } from '../utils/dateUtils';
import type { MobileTab } from './MobileNav';

interface SidebarProfileProps {
  profile: StudentProfile | null;
  userEmail: string | null;
  isLocalMode: boolean;
  isFirebaseAvailable: boolean;
  activePage: MobileTab;
  totalSchedulesCount: number;
  todaySchedulesCount: number;
  onSelectPage: (page: MobileTab) => void;
  onOpenAuth: () => void;
  onUpdateProfile: (updates: Partial<StudentProfile>) => Promise<void>;
  onSeedSamplePack: () => Promise<void>;
  onRequestClearAll: () => void;
  onAddSchedule: () => void;
  onLogout: () => void;
  reminderSettings: ReminderSettings;
  notificationPermission: BrowserNotificationPermission;
  onToggleReminders: () => void;
  onChangeLeadMinutes: (mins: 15 | 30 | 60) => void;
  onTestNotification: () => void;
}

export default function SidebarProfile({
  profile,
  userEmail,
  isLocalMode,
  isFirebaseAvailable,
  activePage,
  totalSchedulesCount,
  todaySchedulesCount,
  onSelectPage,
  onOpenAuth,
  onUpdateProfile,
  onSeedSamplePack,
  onRequestClearAll,
  onAddSchedule,
  onLogout,
  reminderSettings,
  notificationPermission,
  onToggleReminders,
  onChangeLeadMinutes,
  onTestNotification,
}: SidebarProfileProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [nama, setNama] = useState(profile?.nama || '');
  const [universitas, setUniversitas] = useState(profile?.universitas || '');
  const [jurusan, setJurusan] = useState(profile?.jurusan || '');
  const [semester, setSemester] = useState(profile?.semester || '');

  const startEdit = () => {
    setNama(profile?.nama || '');
    setUniversitas(profile?.universitas || '');
    setJurusan(profile?.jurusan || '');
    setSemester(profile?.semester || '');
    setEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile({
        nama: nama.trim() || 'Mahasiswa',
        universitas: universitas.trim(),
        jurusan: jurusan.trim(),
        semester: semester.trim(),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    try {
      const compressed = await compressImageToBase64(file, 300, 0.7);
      if (compressed.length > 145000) {
        setPhotoError('Ukuran foto masih terlalu besar setelah kompresi. Pilih gambar lain.');
        return;
      }
      await onUpdateProfile({ photoBase64: compressed });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      e.target.value = '';
    }
  };

  const handleMoodSelect = async (mood: string) => {
    await onUpdateProfile({ mood });
  };

  const handleSeedClick = async () => {
    setSeeding(true);
    try {
      await onSeedSamplePack();
    } finally {
      setSeeding(false);
    }
  };

  const displayName = profile?.nama || 'Mahasiswa';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="flex flex-col gap-5">
      {/* Brand Header */}
      <div className="hidden lg:flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#E8DFF5] border border-[#DDD6FE] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true">
              <rect x="4" y="6" width="24" height="21" rx="6" fill="#FFFFFF" stroke="#5B21B6" strokeWidth="2" />
              <path d="M4 12.5h24" stroke="#5B21B6" strokeWidth="2" />
              <path d="M10 3.5v4.5M22 3.5v4.5" stroke="#5B21B6" strokeWidth="2.2" strokeLinecap="round" />
              <path
                d="M16 15.5l1.1 2.2 2.4.3-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.3z"
                fill="#EC4899"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-[#2D3748] font-display leading-tight truncate">
              My Schedule
            </h1>
            <p className="text-xs text-slate-500 truncate">Academic &amp; Daily Planner</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap ${
            isLocalMode
              ? 'bg-[#FFF8E7] text-amber-800 border border-[#FDE68A]'
              : 'bg-[#E2ECE9] text-[#065F46] border border-[#B7E1D5]'
          }`}
        >
          {isLocalMode ? <HardDrive className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
          <span>{isLocalMode ? 'Local Mode' : 'Cloud Synced'}</span>
        </span>
      </div>

      {/* Primary Add Schedule CTA (Desktop) */}
      <button
        type="button"
        onClick={onAddSchedule}
        className="hidden lg:flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#2D3748] hover:bg-[#1E293B] text-white text-sm font-bold shadow-[0_6px_20px_rgba(45,55,72,0.16)] transition-all active:scale-[0.98] cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Tambah Jadwal</span>
      </button>

      {/* Desktop Page Navigation Menu */}
      <nav
        aria-label="Navigasi Halaman"
        className="hidden lg:flex flex-col gap-1 rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-2.5 shadow-[0_4px_24px_rgba(45,55,72,0.04)]"
      >
        {[
          { id: 'beranda' as const, label: 'Beranda', icon: Home, count: todaySchedulesCount },
          { id: 'kalender' as const, label: 'Kalender', icon: CalendarDays, count: null },
          { id: 'jadwal' as const, label: 'Semua Jadwal', icon: ListTodo, count: totalSchedulesCount },
          { id: 'profil' as const, label: 'Profil & Statistik', icon: User, count: null },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPage(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#E8DFF5] text-[#4C1D95] shadow-xs'
                  : 'text-slate-600 hover:bg-[#FAF9F6] hover:text-[#2D3748]'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.count !== null && (
                <span
                  className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-lg ${
                    isActive
                      ? 'bg-white/80 text-[#4C1D95]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Student Profile Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-5 shadow-[0_4px_24px_rgba(45,55,72,0.04)]">
        <div className="flex items-start gap-3.5">
          {/* Clickable Avatar Upload */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-16 h-16 rounded-2xl overflow-hidden bg-[#E8DFF5] border-2 border-white shadow-sm flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              title="Klik untuk unggah foto profil"
              aria-label="Unggah foto profil"
            >
              {profile?.photoBase64 ? (
                <img
                  src={profile.photoBase64}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-extrabold text-[#5B21B6] font-display">
                  {initials || 'M'}
                </span>
              )}
              <span className="absolute inset-0 bg-[#2D3748]/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#2D3748] font-display truncate">
                  {displayName}
                </h2>
                {userEmail && (
                  <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                )}
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-[#5B21B6] hover:bg-[#F5F0FC] transition-colors cursor-pointer shrink-0"
                  aria-label="Edit profil mahasiswa"
                  title="Edit profil"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>

            {!editing && (
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-1.5 font-semibold text-[#2D3748] truncate">
                  <GraduationCap className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                  <span className="truncate">
                    {profile?.universitas || 'Tambahkan nama universitas'}
                  </span>
                </p>
                <p className="text-slate-500 truncate">
                  {[profile?.jurusan, profile?.semester].filter(Boolean).join(' · ') ||
                    'Jurusan & Semester'}
                </p>
              </div>
            )}
          </div>
        </div>

        {photoError && (
          <p className="mt-2.5 text-xs font-semibold text-[#9D174D] bg-[#FFF3F5] rounded-xl px-3 py-2">
            {photoError}
          </p>
        )}

        <p className="mt-2.5 text-[11px] text-slate-400">
          Klik foto untuk mengganti avatar (otomatis dikompres ringan).
        </p>

        {/* Inline Edit Form */}
        {editing && (
          <form onSubmit={handleSaveEdit} className="mt-4 space-y-2.5 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-slate-200 text-xs font-semibold text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Nama Universitas
              </label>
              <input
                type="text"
                maxLength={120}
                value={universitas}
                onChange={(e) => setUniversitas(e.target.value)}
                placeholder="Ketik nama universitas..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-slate-200 text-xs font-semibold text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Jurusan / Prodi
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={jurusan}
                  onChange={(e) => setJurusan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-slate-200 text-xs font-semibold text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Semester
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="Semester 5"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-slate-200 text-xs font-semibold text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 min-h-[36px] rounded-xl text-xs font-bold bg-[#5B21B6] text-white hover:bg-[#4C1D95] cursor-pointer disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Mood Selector */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 mb-2">Mood Hari Ini</p>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map((mood) => {
              const active = profile?.mood === mood;
              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() => handleMoodSelect(mood)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#E8DFF5] text-[#4C1D95] ring-1 ring-[#C4B5FD]'
                      : 'bg-[#FAF9F6] text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-4 shadow-[0_4px_24px_rgba(45,55,72,0.04)] space-y-2">
        <p className="px-1 text-xs font-bold text-slate-500 mb-1">Pengaturan Cepat</p>

        {isLocalMode && isFirebaseAvailable && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#E2ECE9] hover:bg-[#CEE3DD] text-[#065F46] text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Cloud className="w-4 h-4 shrink-0" />
            <span className="truncate">Login Google / Sync Cloud</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSeedClick}
          disabled={seeding}
          className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#F5F0FC] hover:bg-[#E8DFF5] text-[#5B21B6] text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {seeding ? 'Menambahkan jadwal...' : '✨ Isi Jadwal Otomatis'}
          </span>
        </button>

        <button
          type="button"
          onClick={onRequestClearAll}
          className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#FFF3F5] hover:bg-[#FCE1E4] text-[#9D174D] text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span className="truncate">🗑️ Bersihkan Semua Jadwal</span>
        </button>

        {!isLocalMode && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Keluar Akun</span>
          </button>
        )}
      </div>

      {/* Browser Notification Reminders Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-4 shadow-[0_4px_24px_rgba(45,55,72,0.04)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#DAEAF6] text-[#1E40AF] flex items-center justify-center shrink-0">
              {reminderSettings.enabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#2D3748] truncate">
                Pengingat Browser
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {notificationPermission === 'granted'
                  ? 'Izin notifikasi aktif'
                  : notificationPermission === 'denied'
                  ? 'Notifikasi OS diblokir'
                  : notificationPermission === 'unsupported'
                  ? 'Pengingat dalam aplikasi'
                  : 'Klik aktifkan untuk izin'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleReminders}
            aria-pressed={reminderSettings.enabled}
            className={`px-3 py-1.5 min-h-[34px] rounded-xl text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              reminderSettings.enabled
                ? 'bg-[#E2ECE9] text-[#065F46]'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {reminderSettings.enabled ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>

        {reminderSettings.enabled && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold text-slate-500">
              Ingatkan sebelum matkul / deadline:
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {([15, 30, 60] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeLeadMinutes(mins)}
                  className={`min-h-[34px] rounded-xl text-[11px] font-bold tabular-nums transition-colors cursor-pointer ${
                    reminderSettings.leadMinutes === mins
                      ? 'bg-[#2D3748] text-white'
                      : 'bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {mins} mnt
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onTestNotification}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F0F7FD] hover:bg-[#DAEAF6] text-[#1E40AF] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Uji Pengingat Sekarang</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
