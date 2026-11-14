import { useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Edit3,
  ExternalLink,
  GraduationCap,
  HardDrive,
  Home,
  ListTodo,
  LogOut,
  MessageCircle,
  Moon,
  Plus,
  Send,
  Sparkles,
  Sun,
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
import {
  CALLMEBOT_ACTIVATION_URL,
  CALLMEBOT_GUIDE_URL,
  type ServerWaGatewayStatus,
  type WhatsAppProvider,
  type WhatsAppSettings,
} from '../utils/whatsappUtils';
import type { MobileTab } from './MobileNav';

interface SidebarProfileProps {
  profile: StudentProfile | null;
  userEmail: string | null;
  isLocalMode: boolean;
  isFirebaseAvailable: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
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
  waSettings: WhatsAppSettings;
  serverWaStatus: ServerWaGatewayStatus;
  notificationsAllowed: boolean;
  notificationPermission: BrowserNotificationPermission;
  onRequestPermission: () => Promise<void> | void;
  onToggleReminders: () => void;
  onChangeLeadMinutes: (mins: number) => void;
  onUpdateWhatsAppSettings: (updates: Partial<WhatsAppSettings>) => void;
  onTestNotification: () => void;
  onTestWhatsApp: () => Promise<{ ok: boolean; detail: string; waUrl: string }>;
  onSendDailyWhatsApp: () => void;
}

export default function SidebarProfile({
  profile,
  userEmail,
  isLocalMode,
  isFirebaseAvailable,
  isDark,
  onToggleTheme,
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
  waSettings,
  serverWaStatus,
  notificationsAllowed,
  notificationPermission,
  onRequestPermission,
  onToggleReminders,
  onChangeLeadMinutes,
  onUpdateWhatsAppSettings,
  onTestNotification,
  onTestWhatsApp,
  onSendDailyWhatsApp,
}: SidebarProfileProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [waFeedback, setWaFeedback] = useState<{
    ok: boolean;
    text: string;
    waUrl?: string;
  } | null>(null);
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

  const handleTestWaClick = async () => {
    setTestingWa(true);
    setWaFeedback(null);
    try {
      const res = await onTestWhatsApp();
      setWaFeedback({
        ok: res.ok,
        text: res.detail,
        waUrl: res.waUrl,
      });
    } finally {
      setTestingWa(false);
    }
  };

  const needsApiKey =
    (waSettings.provider === 'callmebot' || waSettings.provider === 'fonnte') &&
    waSettings.autoEnabled &&
    !waSettings.apiKey.trim();

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
          <div className="w-10 h-10 rounded-2xl bg-[#E8DFF5] dark:bg-violet-950/80 border border-[#DDD6FE] dark:border-violet-800/70 flex items-center justify-center shrink-0">
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
            <h1 className="text-lg font-extrabold text-[#2D3748] dark:text-slate-100 font-display leading-tight truncate">
              My Schedule
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Academic &amp; Daily Planner</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap ${
              isLocalMode
                ? 'bg-[#FFF8E7] text-amber-800 border border-[#FDE68A] dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/70'
                : 'bg-[#E2ECE9] text-[#065F46] border border-[#B7E1D5] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70'
            }`}
          >
            {isLocalMode ? <HardDrive className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
            <span>{isLocalMode ? 'Local' : 'Cloud'}</span>
          </span>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
            className="min-w-[36px] min-h-[36px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Primary Add Schedule CTA (Desktop) */}
      <button
        type="button"
        onClick={onAddSchedule}
        className="hidden lg:flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#2D3748] hover:bg-[#1E293B] dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-sm font-bold shadow-[0_6px_20px_rgba(45,55,72,0.16)] dark:shadow-[0_6px_20px_rgba(109,40,217,0.3)] transition-all active:scale-[0.98] cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Tambah Jadwal</span>
      </button>

      {/* Desktop Page Navigation Menu */}
      <nav
        aria-label="Navigasi Halaman"
        className="hidden lg:flex flex-col gap-1 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-2.5 shadow-[0_4px_24px_rgba(45,55,72,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
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
                  ? 'bg-[#E8DFF5] text-[#4C1D95] shadow-xs dark:bg-violet-950/80 dark:text-violet-200'
                  : 'text-slate-600 hover:bg-[#FAF9F6] hover:text-[#2D3748] dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100'
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
                      ? 'bg-white/80 text-[#4C1D95] dark:bg-violet-900/80 dark:text-violet-100'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
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
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_4px_24px_rgba(45,55,72,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
        <div className="flex items-start gap-3.5">
          {/* Clickable Avatar Upload */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-16 h-16 rounded-2xl overflow-hidden bg-[#E8DFF5] dark:bg-violet-950/80 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
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
                <span className="text-lg font-extrabold text-[#5B21B6] dark:text-violet-300 font-display">
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
                <h2 className="text-base font-bold text-[#2D3748] dark:text-slate-100 font-display truncate">
                  {displayName}
                </h2>
                {userEmail && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{userEmail}</p>
                )}
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-[#5B21B6] hover:bg-[#F5F0FC] dark:hover:text-violet-300 dark:hover:bg-violet-950/70 transition-colors cursor-pointer shrink-0"
                  aria-label="Edit profil mahasiswa"
                  title="Edit profil"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>

            {!editing && (
              <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-1.5 font-semibold text-[#2D3748] dark:text-slate-200 truncate">
                  <GraduationCap className="w-3.5 h-3.5 text-[#7C3AED] dark:text-violet-400 shrink-0" />
                  <span className="truncate">
                    {profile?.universitas || 'Tambahkan nama universitas'}
                  </span>
                </p>
                <p className="text-slate-500 dark:text-slate-400 truncate">
                  {[profile?.jurusan, profile?.semester].filter(Boolean).join(' · ') ||
                    'Jurusan & Semester'}
                </p>
              </div>
            )}
          </div>
        </div>

        {photoError && (
          <p className="mt-2.5 text-xs font-semibold text-[#9D174D] dark:text-pink-300 bg-[#FFF3F5] dark:bg-pink-950/70 rounded-xl px-3 py-2">
            {photoError}
          </p>
        )}

        <p className="mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
          Klik foto untuk mengganti avatar (otomatis dikompres ringan).
        </p>

        {/* Inline Edit Form */}
        {editing && (
          <form onSubmit={handleSaveEdit} className="mt-4 space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#2D3748] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Nama Universitas
              </label>
              <input
                type="text"
                maxLength={120}
                value={universitas}
                onChange={(e) => setUniversitas(e.target.value)}
                placeholder="Ketik nama universitas..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Jurusan / Prodi
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={jurusan}
                  onChange={(e) => setJurusan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#2D3748] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Semester
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="Semester 5"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Mood Hari Ini</p>
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
                      ? 'bg-[#E8DFF5] text-[#4C1D95] ring-1 ring-[#C4B5FD] dark:bg-violet-950/80 dark:text-violet-200 dark:ring-violet-700'
                      : 'bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_4px_24px_rgba(45,55,72,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] space-y-2">
        <p className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Pengaturan Cepat</p>

        {/* Dark / Light Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-pressed={isDark}
          className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#FAF9F6] hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-[#2D3748] dark:text-slate-100 text-xs font-bold flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            {isDark ? (
              <Moon className="w-4 h-4 text-violet-300 shrink-0" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate">Tema Tampilan</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold shrink-0 ${
              isDark
                ? 'bg-violet-950/90 text-violet-200 border border-violet-800/70'
                : 'bg-[#FFF8E7] text-amber-800 border border-[#FDE68A]'
            }`}
          >
            {isDark ? 'Mode Gelap' : 'Mode Terang'}
          </span>
        </button>

        {isLocalMode && isFirebaseAvailable && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#E2ECE9] hover:bg-[#CEE3DD] dark:bg-emerald-950/70 dark:hover:bg-emerald-900/70 text-[#065F46] dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Cloud className="w-4 h-4 shrink-0" />
            <span className="truncate">Login Google / Sync Cloud</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSeedClick}
          disabled={seeding}
          className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#F5F0FC] hover:bg-[#E8DFF5] dark:bg-violet-950/70 dark:hover:bg-violet-900/70 text-[#5B21B6] dark:text-violet-300 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {seeding ? 'Menambahkan jadwal...' : '✨ Isi Jadwal Otomatis'}
          </span>
        </button>

        <button
          type="button"
          onClick={onRequestClearAll}
          className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#FFF3F5] hover:bg-[#FCE1E4] dark:bg-pink-950/60 dark:hover:bg-pink-900/70 text-[#9D174D] dark:text-pink-300 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span className="truncate">🗑️ Bersihkan Semua Jadwal</span>
        </button>

        {!isLocalMode && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Keluar Akun</span>
          </button>
        )}
      </div>

      {/* Browser Notification Reminders Card */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-4 shadow-[0_4px_24px_rgba(45,55,72,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] space-y-3">
        {!notificationsAllowed && (
          <div className="rounded-2xl bg-[#FFF3F5] dark:bg-pink-950/50 border border-[#FBCFE8] dark:border-pink-800/70 p-3 space-y-2">
            <p className="text-xs font-extrabold text-[#9D174D] dark:text-pink-200">
              Izin Notifikasi Belum Disetujui
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Klik <strong>Izinkan</strong> untuk menyetujui pengaturan otomatis. Tanpa izin, notifikasi tidak akan bekerja.
            </p>
            <button
              type="button"
              onClick={onRequestPermission}
              className="w-full min-h-[36px] px-3 py-1.5 rounded-xl bg-[#2D3748] hover:bg-[#1E293B] dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Izinkan Notifikasi
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#DAEAF6] dark:bg-sky-950/80 text-[#1E40AF] dark:text-sky-300 flex items-center justify-center shrink-0">
              {notificationsAllowed && reminderSettings.enabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#2D3748] dark:text-slate-100 truncate">
                Pengingat Browser
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {!notificationsAllowed
                  ? notificationPermission === 'denied'
                    ? 'Diblokir browser (Nonaktif)'
                    : 'Belum diizinkan (Nonaktif)'
                  : notificationPermission === 'granted'
                  ? 'Diizinkan & aktif'
                  : 'Pengingat disetujui'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleReminders}
            aria-pressed={notificationsAllowed && reminderSettings.enabled}
            className={`px-3 py-1.5 min-h-[34px] rounded-xl text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              notificationsAllowed && reminderSettings.enabled
                ? 'bg-[#E2ECE9] text-[#065F46] dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {notificationsAllowed && reminderSettings.enabled ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>

        {notificationsAllowed && reminderSettings.enabled && (
          <div className="space-y-2.5 pt-1">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Waktu pengingat sebelum jadwal dimulai:
            </p>
            <div className="grid grid-cols-5 gap-1">
              {([0, 5, 15, 30, 60] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeLeadMinutes(mins)}
                  className={`min-h-[34px] px-1 rounded-xl text-[11px] font-bold tabular-nums transition-colors cursor-pointer ${
                    reminderSettings.leadMinutes === mins
                      ? 'bg-[#2D3748] text-white dark:bg-violet-600 dark:text-white'
                      : 'bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border border-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                  }`}
                >
                  {mins === 0 ? '0m' : `${mins}m`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="custom-lead-mins"
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
              >
                Kustom:
              </label>
              <input
                id="custom-lead-mins"
                type="number"
                min={0}
                max={180}
                value={reminderSettings.leadMinutes}
                onChange={(e) => onChangeLeadMinutes(Number(e.target.value))}
                className="w-20 px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#2D3748] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                menit sebelum
              </span>
            </div>

            <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={waSettings.exactStartAlert}
                onChange={(e) =>
                  onUpdateWhatsAppSettings({ exactStartAlert: e.target.checked })
                }
                className="w-4 h-4 rounded accent-[#5B21B6]"
              />
              <span>Ingatkan lagi tepat jam dimulai (0 mnt)</span>
            </label>

            <button
              type="button"
              onClick={onTestNotification}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F0F7FD] hover:bg-[#DAEAF6] dark:bg-sky-950/70 dark:hover:bg-sky-900/70 text-[#1E40AF] dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Uji Pengingat Sekarang</span>
            </button>
          </div>
        )}

        {/* WhatsApp Automatic Notification Section */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#E2ECE9] dark:bg-emerald-950/80 text-[#065F46] dark:text-emerald-300 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#2D3748] dark:text-slate-100 truncate">
                  Notif WhatsApp Otomatis
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {waSettings.provider === 'server'
                    ? serverWaStatus.configured
                      ? `Aktif Otomatis (${serverWaStatus.providerLabel || 'Server'})`
                      : 'Siap otomatis (perlu token server)'
                    : waSettings.provider === 'link'
                    ? 'Siap kirim via wa.me'
                    : waSettings.autoEnabled
                    ? `Gateway Pribadi (${waSettings.provider})`
                    : 'Mode gateway nonaktif'}
                </p>
              </div>
            </div>

            {waSettings.provider !== 'link' && (
              <button
                type="button"
                disabled={!notificationsAllowed}
                onClick={() =>
                  onUpdateWhatsAppSettings({ autoEnabled: !waSettings.autoEnabled })
                }
                className={`px-2.5 py-1 min-h-[30px] rounded-xl text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  notificationsAllowed && waSettings.autoEnabled
                    ? 'bg-[#E2ECE9] text-[#065F46] dark:bg-emerald-950/80 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {notificationsAllowed && waSettings.autoEnabled ? 'Auto ON' : 'Auto OFF'}
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Nomor WhatsApp Anda
            </label>
            <input
              type="tel"
              value={waSettings.phone}
              onChange={(e) => onUpdateWhatsAppSettings({ phone: e.target.value })}
              placeholder="Contoh: 081234567890"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
            />
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              Cukup isi nomor WA saja — pengguna baru tidak perlu daftar API Key lagi.
            </p>
          </div>

          {/* Daily Scheduled Auto-WA Summary (Morning 07:00 by default) */}
          {waSettings.provider !== 'link' && (
            <div className="rounded-2xl bg-[#FAF9F6] dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-[#2D3748] dark:text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={waSettings.dailyEnabled}
                    onChange={(e) =>
                      onUpdateWhatsAppSettings({ dailyEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-[#065F46]"
                  />
                  <span>Kirim Rekap Pagi Otomatis</span>
                </label>
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>

              {waSettings.dailyEnabled && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kirim setiap hari pukul:
                  </span>
                  <input
                    type="time"
                    value={waSettings.dailyTime}
                    onChange={(e) =>
                      onUpdateWhatsAppSettings({ dailyTime: e.target.value })
                    }
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#2D3748] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                  />
                </div>
              )}
            </div>
          )}

          {waSettings.provider === 'server' &&
            serverWaStatus.checked &&
            !serverWaStatus.configured && (
              <div className="rounded-2xl bg-[#FFF8E7] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-800/70 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                <span className="font-bold">Info Admin Server:</span> Tambahkan{' '}
                <code className="font-mono text-[10px]">FONNTE_TOKEN</code> atau{' '}
                <code className="font-mono text-[10px]">WA_WEBHOOK_URL</code> 1x di Vercel
                Environment Variables agar semua pengguna baru otomatis menerima WA tanpa setting apa pun.
              </div>
            )}

          {/* Collapsible Advanced Gateway Override */}
          <details className="rounded-2xl bg-[#FAF9F6] dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 p-2.5">
            <summary className="text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              Pengaturan Gateway Lanjutan (Opsional)
            </summary>
            <div className="mt-2.5 space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Metode Pengiriman WA
                </label>
                <select
                  value={waSettings.provider}
                  onChange={(e) => {
                    setWaFeedback(null);
                    onUpdateWhatsAppSettings({
                      provider: e.target.value as WhatsAppProvider,
                      autoEnabled: e.target.value !== 'link',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#2D3748] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                >
                  <option value="server">Otomatis Server Aplikasi (Direkomendasikan)</option>
                  <option value="link">Kirim Langsung via WhatsApp (wa.me)</option>
                  <option value="callmebot">Gateway Pribadi · CallMeBot</option>
                  <option value="fonnte">Gateway Pribadi · Fonnte</option>
                  <option value="webhook">Gateway Pribadi · Webhook URL</option>
                </select>
              </div>

              {waSettings.provider === 'callmebot' && (
                <div className="rounded-2xl bg-[#FFF8E7] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-800/70 p-3 space-y-2">
                  <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    Aktivasi CallMeBot (Khusus Gateway Pribadi):
                  </p>
                  <a
                    href={CALLMEBOT_ACTIVATION_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full min-h-[36px] px-3 py-1.5 rounded-xl bg-[#065F46] hover:bg-[#047857] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Aktifkan CallMeBot di WhatsApp</span>
                  </a>
                  <a
                    href={CALLMEBOT_GUIDE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center text-[10px] font-semibold text-amber-800 dark:text-amber-300 underline hover:opacity-80"
                  >
                    Cek nomor aktif terbaru di CallMeBot
                  </a>
                </div>
              )}

              {(waSettings.provider === 'fonnte' || waSettings.provider === 'callmebot') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {waSettings.provider === 'fonnte' ? 'Token Fonnte Pribadi' : 'API Key CallMeBot'}
                  </label>
                  <input
                    type="password"
                    value={waSettings.apiKey}
                    onChange={(e) => {
                      setWaFeedback(null);
                      onUpdateWhatsAppSettings({ apiKey: e.target.value });
                    }}
                    placeholder="Tempel API Key / Token..."
                    className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 ${
                      needsApiKey
                        ? 'border-amber-400 dark:border-amber-500'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                </div>
              )}

              {waSettings.provider === 'webhook' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    URL Webhook WhatsApp
                  </label>
                  <input
                    type="url"
                    value={waSettings.webhookUrl}
                    onChange={(e) =>
                      onUpdateWhatsAppSettings({ webhookUrl: e.target.value })
                    }
                    placeholder="https://contoh-webhook.com/wa"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                  />
                </div>
              )}
            </div>
          </details>

          {/* Test WA Feedback */}
          {waFeedback && (
            <div
              className={`rounded-xl px-3 py-2 text-[11px] font-semibold flex items-start gap-2 ${
                waFeedback.ok
                  ? 'bg-[#E2ECE9] text-[#065F46] dark:bg-emerald-950/80 dark:text-emerald-300'
                  : 'bg-[#FFF3F5] text-[#9D174D] dark:bg-pink-950/80 dark:text-pink-300'
              }`}
            >
              {waFeedback.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p>{waFeedback.text}</p>
                {waFeedback.waUrl && (!waFeedback.ok || waSettings.provider === 'link') && (
                  <a
                    href={waFeedback.waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 underline font-bold"
                  >
                    Kirim Langsung via WhatsApp (wa.me)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={handleTestWaClick}
              disabled={testingWa || !notificationsAllowed}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F5F0FC] hover:bg-[#E8DFF5] dark:bg-violet-950/70 dark:hover:bg-violet-900/70 text-[#5B21B6] dark:text-violet-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{testingWa ? 'Mengirim uji WA...' : 'Uji Kirim WA Sekarang'}</span>
            </button>

            <button
              type="button"
              onClick={onSendDailyWhatsApp}
              disabled={!notificationsAllowed}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#E2ECE9] hover:bg-[#CBE3DC] dark:bg-emerald-950/70 dark:hover:bg-emerald-900/70 text-[#065F46] dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Rekap Hari Ini ke WA</span>
            </button>
          </div>

          <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            Pastikan tab My Schedule tetap terbuka di browser/HP agar pengiriman otomatis berjalan tepat waktu.
          </p>
        </div>
      </div>
    </div>
  );
}
