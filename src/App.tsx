import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  BellRing,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Home,
  ListTodo,
  MessageCircle,
  Moon,
  QrCode,
  Sun,
  User,
  X,
} from 'lucide-react';
import AestheticCalendar from './components/AestheticCalendar';
import AuthPage from './components/AuthPage';
import ConfirmDialog from './components/ConfirmDialog';
import DashboardOverview from './components/DashboardOverview';
import DatePreviewModal from './components/DatePreviewModal';
import MobileNav, { MobileTopBar, type MobileTab } from './components/MobileNav';
import NotificationPermissionModal from './components/NotificationPermissionModal';
import ScheduleList from './components/ScheduleList';
import ScheduleModal from './components/ScheduleModal';
import ShareQrModal from './components/ShareQrModal';
import SidebarProfile from './components/SidebarProfile';
import {
  useScheduleReminders,
  type InAppReminderAlert,
} from './hooks/useScheduleReminders';
import { useTheme } from './hooks/useTheme';
import { auth, isFirebaseConfigured } from './lib/firebase';
import {
  addSampleSchedulePack,
  clearAllSchedules,
  createScheduleItem,
  deleteScheduleItem,
  saveStudentProfile,
  seedInitialUserData,
  subscribeToProfile,
  subscribeToSchedules,
  toggleScheduleComplete,
  updateScheduleItem,
  type NewScheduleInput,
} from './services/scheduleService';
import {
  CATEGORY_META,
  type AuthUser,
  type ScheduleCategory,
  type ScheduleItem,
  type StudentProfile,
} from './types/schedule';
import { formatDateKey } from './utils/dateUtils';
import {
  removeCustomWaReminderTime,
  setCustomWaReminderTime,
} from './utils/whatsappUtils';

const LOCAL_SESSION_KEY = 'my_schedule_local_user';

function createDefaultLocalUser(customName?: string): AuthUser {
  return {
    uid: 'local-student',
    displayName: customName || 'Mahasiswa',
    email: null,
    photoURL: null,
    isLocal: true,
  };
}

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(!isFirebaseConfigured);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [activeCategory, setActiveCategory] = useState<ScheduleCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllDates, setShowAllDates] = useState(false);

  const [activePage, setActivePage] = useState<MobileTab>('beranda');
  const [datePopupKey, setDatePopupKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleItem | null>(null);
  const [shareQrOpen, setShareQrOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [bannerMessage, setBannerMessage] = useState<{
    text: string;
    tone: 'info' | 'error';
  } | null>(null);
  const [reminderAlert, setReminderAlert] = useState<InAppReminderAlert | null>(null);
  const [quickWaPhone, setQuickWaPhone] = useState('');
  const [dismissWaBanner, setDismissWaBanner] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);

  const todayKey = formatDateKey(new Date());

  const showToast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setBannerMessage({ text, tone });
  }, []);

  const handleInAppReminder = useCallback((alert: InAppReminderAlert) => {
    setReminderAlert(alert);
  }, []);

  const {
    consent,
    notificationsAllowed,
    settings: reminderSettings,
    waSettings,
    serverWaStatus,
    permission: notificationPermission,
    grantNotificationConsent,
    denyNotificationConsent,
    toggleReminders,
    setLeadMinutes,
    updateWhatsAppSettings,
    sendTestNotification,
    sendTestWhatsAppNow,
    sendDailySummaryToWhatsAppWebhook,
  } = useScheduleReminders(schedules, profile?.nama, handleInAppReminder, user?.uid);

  const handleAllowNotifications = useCallback(async () => {
    setPermissionBusy(true);
    try {
      const result = await grantNotificationConsent();
      if (result === 'granted') {
        showToast('Izin disetujui! Pengingat jadwal & WhatsApp otomatis langsung aktif.');
      } else {
        showToast(
          'Izin notifikasi diblokir browser — notifikasi tidak akan bekerja. Aktifkan izin notifikasi di pengaturan browser.',
          'error'
        );
      }
    } finally {
      setPermissionBusy(false);
    }
  }, [grantNotificationConsent, showToast]);

  const handleDenyNotifications = useCallback(() => {
    denyNotificationConsent();
    showToast('Notifikasi dinonaktifkan. Anda dapat mengizinkannya kapan saja di menu Profil.', 'error');
  }, [denyNotificationConsent, showToast]);

  const handleSendDailyWhatsApp = useCallback(async () => {
    const res = await sendDailySummaryToWhatsAppWebhook();
    if (waSettings.provider === 'link') {
      setReminderAlert({
        id: `wa_daily_${Date.now()}`,
        title: 'Rekap Jadwal Hari Ini Siap Dikirim ke WA',
        body: 'Ketuk tombol Kirim ke WhatsApp di bawah untuk mengirim daftar jadwal hari ini.',
        waUrl: res.waUrl,
      });
    } else if (res.ok) {
      showToast(`Rekap jadwal hari ini terkirim ke WhatsApp (${res.detail || 'Berhasil'}).`);
    } else {
      showToast(res.detail || 'Gagal mengirim ke gateway WhatsApp.', 'error');
    }
  }, [sendDailySummaryToWhatsAppWebhook, waSettings.provider, showToast]);

  useEffect(() => {
    if (!reminderAlert) return;
    const timer = window.setTimeout(() => setReminderAlert(null), 10000);
    return () => window.clearTimeout(timer);
  }, [reminderAlert]);

  useEffect(() => {
    if (!bannerMessage) return;
    const timer = window.setTimeout(() => setBannerMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [bannerMessage]);

  // Listen to Firebase Auth (always show Login/Register screen to new unauthenticated visitors)
  useEffect(() => {
    const savedLocalRaw = localStorage.getItem(LOCAL_SESSION_KEY);
    const params = new URLSearchParams(window.location.search);
    const requestedAuthEntry =
      Boolean(params.get('auth') || params.get('mode')) ||
      ['/daftar', '/register', '/login', '/masuk'].includes(
        window.location.pathname.toLowerCase()
      );

    if (!isFirebaseConfigured || !auth) {
      if (savedLocalRaw) {
        try {
          setUser(JSON.parse(savedLocalRaw) as AuthUser);
        } catch {
          localStorage.removeItem(LOCAL_SESSION_KEY);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLocalMode(true);
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        setIsLocalMode(false);
        setAuthModalOpen(false);
        setUser({
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
          photoURL: fbUser.photoURL,
          isLocal: false,
        });
        if (requestedAuthEntry) {
          window.history.replaceState({}, '', '/');
        }
      } else if (savedLocalRaw && !requestedAuthEntry) {
        try {
          setIsLocalMode(true);
          setUser(JSON.parse(savedLocalRaw) as AuthUser);
        } catch {
          localStorage.removeItem(LOCAL_SESSION_KEY);
          setUser(null);
        }
      } else {
        setIsLocalMode(false);
        setUser(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Seed initial data on first login + attach realtime Firestore / Local listeners
  useEffect(() => {
    if (!authReady || !user) {
      setProfile(null);
      setSchedules([]);
      return;
    }

    let cancelled = false;
    let unsubProfile: (() => void) | undefined;
    let unsubSchedules: (() => void) | undefined;

    // Immediately clear previous account's in-memory data before loading new user's workspace
    setProfile(null);
    setSchedules([]);
    setReminderAlert(null);
    setDatePopupKey(null);
    setEditingItem(null);
    setModalOpen(false);
    setDeleteTarget(null);
    setClearConfirmOpen(false);
    setQuickWaPhone('');

    const initUserWorkspace = async () => {
      setDataLoading(true);
      try {
        const seeded = await seedInitialUserData(
          user.uid,
          user.displayName || user.email?.split('@')[0] || 'Mahasiswa',
          user.photoURL,
          isLocalMode
        );
        if (!cancelled && seeded) {
          showToast('Jadwal awal & profil mahasiswa berhasil disiapkan secara otomatis.');
        }

        if (cancelled) return;

        unsubProfile = subscribeToProfile(
          user.uid,
          isLocalMode,
          (prof) => {
            if (!cancelled) setProfile(prof);
          },
          (err) => {
            if (!cancelled) showToast(`Sinkronisasi profil bermasalah: ${err.message}`, 'error');
          }
        );

        unsubSchedules = subscribeToSchedules(
          user.uid,
          isLocalMode,
          (items) => {
            if (!cancelled) {
              setSchedules(items);
              setDataLoading(false);
            }
          },
          (err) => {
            if (!cancelled) {
              setDataLoading(false);
              showToast(`Sinkronisasi jadwal bermasalah: ${err.message}`, 'error');
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          setDataLoading(false);
          showToast(
            err instanceof Error ? err.message : 'Gagal memuat data jadwal.',
            'error'
          );
        }
      }
    };

    initUserWorkspace();

    return () => {
      cancelled = true;
      unsubProfile?.();
      unsubSchedules?.();
    };
  }, [authReady, user, isLocalMode, showToast]);

  const handleSelectPage = (page: MobileTab) => {
    setActivePage(page);
    if (page === 'beranda') {
      setSelectedDate(formatDateKey(new Date()));
      setShowAllDates(false);
    } else if (page === 'kalender') {
      setShowAllDates(false);
    } else if (page === 'jadwal') {
      setShowAllDates(true);
    }
  };

  const todayCount = useMemo(
    () => schedules.filter((item) => item.date === todayKey).length,
    [schedules, todayKey]
  );

  const academicStats = useMemo(() => {
    const matkulItems = schedules.filter((s) => s.category === 'matkul');
    const totalSks = matkulItems.reduce((sum, s) => sum + (Number(s.sks) || 0), 0);
    const completedTotal = schedules.filter((s) => s.completed).length;
    const pendingDeadlines = schedules.filter(
      (s) => s.category === 'rapat_deadline' && !s.completed
    ).length;

    const byCategory = (Object.keys(CATEGORY_META) as ScheduleCategory[]).map((cat) => ({
      meta: CATEGORY_META[cat],
      count: schedules.filter((s) => s.category === cat).length,
      done: schedules.filter((s) => s.category === cat && s.completed).length,
    }));

    return {
      totalItems: schedules.length,
      totalSks,
      completedTotal,
      pendingDeadlines,
      byCategory,
    };
  }, [schedules]);

  const handleEnterLocalMode = (customName?: string) => {
    const localUser = createDefaultLocalUser(customName);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(localUser));
    setIsLocalMode(true);
    setUser(localUser);
    setAuthModalOpen(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setProfile(null);
    setSchedules([]);
    setReminderAlert(null);
    setDatePopupKey(null);
    setEditingItem(null);
    setModalOpen(false);
    setDeleteTarget(null);
    setClearConfirmOpen(false);
    setShareQrOpen(false);
    setQuickWaPhone('');
    setSearchQuery('');
    setActiveCategory('all');
    setShowAllDates(false);
    setActivePage('beranda');
    if (!isLocalMode && auth) {
      await signOut(auth);
      showToast('Berhasil keluar dari akun Cloud.');
    } else {
      setUser(null);
    }
  };

  const handleUpdateProfile = async (updates: Partial<StudentProfile>) => {
    if (!user) return;
    await saveStudentProfile(user.uid, updates, profile, isLocalMode);
    showToast('Profil mahasiswa berhasil diperbarui.');
  };

  const handleSeedSamplePack = async () => {
    if (!user) return;
    await addSampleSchedulePack(user.uid, isLocalMode);
    showToast('Paket jadwal contoh berhasil ditambahkan.');
  };

  const handleConfirmClearAll = async () => {
    if (!user) return;
    setActionBusy(true);
    try {
      await clearAllSchedules(user.uid, isLocalMode);
      setClearConfirmOpen(false);
      showToast('Semua jadwal berhasil dibersihkan.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveSchedule = async (data: NewScheduleInput, customWaTime: string) => {
    if (!user) return;
    if (editingItem) {
      await updateScheduleItem(user.uid, editingItem.id, data, isLocalMode);
      setCustomWaReminderTime(editingItem.id, customWaTime, user.uid);
      showToast('Perubahan jadwal tersimpan.');
    } else {
      const createdId = await createScheduleItem(user.uid, data, isLocalMode);
      setCustomWaReminderTime(createdId, customWaTime, user.uid);
      showToast('Jadwal baru berhasil ditambahkan.');
    }
  };

  const handleToggleComplete = async (item: ScheduleItem) => {
    if (!user) return;
    await toggleScheduleComplete(user.uid, item.id, !item.completed, isLocalMode);
  };

  const handleConfirmDeleteItem = async () => {
    if (!user || !deleteTarget) return;
    setActionBusy(true);
    try {
      await deleteScheduleItem(user.uid, deleteTarget.id, isLocalMode);
      removeCustomWaReminderTime(deleteTarget.id, user.uid);
      setDeleteTarget(null);
      showToast('Jadwal berhasil dihapus.');
    } finally {
      setActionBusy(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 flex items-center justify-center p-6 transition-colors">
        <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-[0_8px_32px_rgba(45,55,72,0.05)]">
          <div className="w-12 h-12 rounded-2xl bg-[#E8DFF5] dark:bg-violet-950/80 mx-auto animate-pulse" />
          <p className="mt-4 text-sm font-bold text-[#2D3748] dark:text-slate-100">Menyiapkan My Schedule...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onEnterLocalMode={handleEnterLocalMode} />;
  }

  const pageNavTabs: Array<{ id: MobileTab; label: string; icon: typeof Home }> = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'kalender', label: 'Kalender', icon: CalendarDays },
    { id: 'jadwal', label: 'Semua Jadwal', icon: ListTodo },
    { id: 'profil', label: 'Profil & Statistik', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 text-[#2D3748] dark:text-slate-100 pb-24 lg:pb-10 transition-colors">
      <MobileTopBar
        isLocalMode={isLocalMode}
        isFirebaseAvailable={isFirebaseConfigured}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenShareQr={() => setShareQrOpen(true)}
      />

      {/* Toast Notification Banner */}
      {bannerMessage && (
        <div className="fixed top-16 lg:top-5 right-4 left-4 sm:left-auto sm:max-w-md z-50">
          <div
            role="status"
            className={`rounded-2xl px-4 py-3 text-xs font-bold shadow-[0_12px_30px_rgba(45,55,72,0.12)] border ${
              bannerMessage.tone === 'error'
                ? 'bg-[#FFF3F5] text-[#9D174D] border-[#FBCFE8] dark:bg-pink-950/90 dark:text-pink-200 dark:border-pink-800'
                : 'bg-white text-[#2D3748] border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700'
            }`}
          >
            {bannerMessage.text}
          </div>
        </div>
      )}

      {/* Reminder Notification Alert Banner */}
      {reminderAlert && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:max-w-sm z-50">
          <div
            role="alert"
            className="rounded-2xl bg-white dark:bg-slate-900 border border-[#BFDBFE] dark:border-sky-800/80 p-4 shadow-[0_14px_36px_rgba(30,64,175,0.16)] dark:shadow-[0_14px_36px_rgba(0,0,0,0.45)] flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-[#DAEAF6] dark:bg-sky-950/80 text-[#1E40AF] dark:text-sky-300 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-[#2D3748] dark:text-slate-100">
                {reminderAlert.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {reminderAlert.body}
              </p>
              {reminderAlert.waStatus && (
                <p className="mt-1 text-[11px] font-bold text-[#065F46] dark:text-emerald-300">
                  Status WA: {reminderAlert.waStatus}
                </p>
              )}
              {reminderAlert.waUrl && (
                <a
                  href={reminderAlert.waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E2ECE9] hover:bg-[#CBE3DC] dark:bg-emerald-950/80 dark:hover:bg-emerald-900/80 text-[#065F46] dark:text-emerald-300 text-[11px] font-bold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Kirim ke WhatsApp</span>
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setReminderAlert(null)}
              className="min-w-[32px] min-h-[32px] rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              aria-label="Tutup pengingat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Shell */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8">
        <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 items-start">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block w-[300px] xl:w-[320px] shrink-0 sticky top-8">
            <SidebarProfile
              profile={profile}
              userEmail={user.email}
              isLocalMode={isLocalMode}
              isFirebaseAvailable={isFirebaseConfigured}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              activePage={activePage}
              totalSchedulesCount={schedules.length}
              todaySchedulesCount={todayCount}
              onSelectPage={handleSelectPage}
              onOpenAuth={() => setAuthModalOpen(true)}
              onUpdateProfile={handleUpdateProfile}
              onSeedSamplePack={handleSeedSamplePack}
              onRequestClearAll={() => setClearConfirmOpen(true)}
              onAddSchedule={openAddModal}
              onOpenShareQr={() => setShareQrOpen(true)}
              onLogout={handleLogout}
              reminderSettings={reminderSettings}
              waSettings={waSettings}
              serverWaStatus={serverWaStatus}
              notificationsAllowed={notificationsAllowed}
              notificationPermission={notificationPermission}
              onRequestPermission={handleAllowNotifications}
              onToggleReminders={toggleReminders}
              onChangeLeadMinutes={setLeadMinutes}
              onUpdateWhatsAppSettings={updateWhatsAppSettings}
              onTestNotification={sendTestNotification}
              onTestWhatsApp={sendTestWhatsAppNow}
              onSendDailyWhatsApp={handleSendDailyWhatsApp}
            />
          </aside>

          {/* Main Workspace */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            {/* Desktop Top Page Switcher Bar */}
            <div className="hidden lg:flex items-center justify-between gap-4 rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 px-4 py-2.5 shadow-[0_4px_20px_rgba(45,55,72,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-1.5">
                {pageNavTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activePage === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectPage(tab.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`min-h-[40px] px-4 py-2 rounded-2xl text-xs font-bold inline-flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#2D3748] text-white shadow-xs dark:bg-violet-600 dark:text-white'
                          : 'text-slate-600 hover:bg-[#FAF9F6] hover:text-[#2D3748] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
                  {schedules.length} total agenda
                </span>
                <button
                  type="button"
                  onClick={() => setShareQrOpen(true)}
                  aria-label="Bagikan QR Link Vercel"
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F0F7FD] hover:bg-[#DAEAF6] dark:bg-sky-950/70 dark:hover:bg-sky-900/70 border border-[#BFDBFE]/80 dark:border-sky-800/70 text-xs font-bold text-[#1E40AF] dark:text-sky-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Bagikan QR</span>
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isDark ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mode Terang</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-violet-600" />
                      <span>Mode Gelap</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {dataLoading && schedules.length === 0 ? (
              <div className="space-y-5">
                <div className="h-44 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 animate-pulse" />
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                  <div className="xl:col-span-5 h-80 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 animate-pulse" />
                  <div className="xl:col-span-7 h-80 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* PAGE 1: BERANDA */}
                {activePage === 'beranda' && (
                  <div className="space-y-6">
                    {!notificationsAllowed && consent === 'denied' && (
                      <div className="rounded-3xl bg-[#FFF3F5] dark:bg-pink-950/40 border border-[#FBCFE8] dark:border-pink-800/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-2xl bg-[#FCE1E4] dark:bg-pink-900/70 text-[#9D174D] dark:text-pink-300 flex items-center justify-center shrink-0">
                            <BellRing className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-[#9D174D] dark:text-pink-200">
                              Notifikasi Tidak Bekerja (Izin Ditolak)
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Pengingat jadwal dan WhatsApp otomatis dinonaktifkan sampai Anda menekan tombol Izinkan.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAllowNotifications}
                          disabled={permissionBusy}
                          className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#2D3748] hover:bg-[#1E293B] dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                        >
                          Izinkan Sekarang
                        </button>
                      </div>
                    )}

                    {notificationsAllowed && !waSettings.phone.trim() && !dismissWaBanner && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!quickWaPhone.trim()) return;
                          updateWhatsAppSettings({
                            phone: quickWaPhone.trim(),
                            autoEnabled: true,
                          });
                          showToast(
                            `Nomor WA ${quickWaPhone.trim()} tersimpan! Rekap pagi 07:00 & pengingat jadwal aktif otomatis.`
                          );
                        }}
                        className="rounded-3xl bg-[#F1F8F6] dark:bg-emerald-950/40 border border-[#B7E1D5] dark:border-emerald-800/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-2xl bg-[#E2ECE9] dark:bg-emerald-900/80 text-[#065F46] dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-[#065F46] dark:text-emerald-200">
                              Aktifkan Notif WhatsApp Otomatis
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              Cukup isi nomor WA sekali — rekap pagi {waSettings.dailyTime} & pengingat matkul/deadline langsung aktif tanpa pengaturan rumit.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="tel"
                            value={quickWaPhone}
                            onChange={(e) => setQuickWaPhone(e.target.value)}
                            placeholder="081234567890"
                            className="w-36 sm:w-40 min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#B7E1D5] dark:border-emerald-800 text-xs font-semibold text-[#2D3748] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                          />
                          <button
                            type="submit"
                            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#065F46] hover:bg-[#047857] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Aktifkan
                          </button>
                          <button
                            type="button"
                            onClick={() => setDismissWaBanner(true)}
                            aria-label="Tutup"
                            className="min-w-[34px] min-h-[34px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    )}

                    <DashboardOverview
                      profile={profile}
                      schedules={schedules}
                      onSelectDate={(dateKey) => {
                        setSelectedDate(dateKey);
                        setShowAllDates(false);
                        setActivePage('kalender');
                      }}
                    />

                    <ScheduleList
                      schedules={schedules}
                      selectedDate={selectedDate}
                      activeCategory={activeCategory}
                      onCategoryChange={setActiveCategory}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      showAllDates={showAllDates}
                      onToggleShowAllDates={(val) => setShowAllDates(val)}
                      onToggleComplete={handleToggleComplete}
                      onEditItem={openEditModal}
                      onDeleteItem={(item) => setDeleteTarget(item)}
                      onAddSchedule={openAddModal}
                    />
                  </div>
                )}

                {/* PAGE 2: KALENDER */}
                {activePage === 'kalender' && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    <div className="xl:col-span-5">
                      <AestheticCalendar
                        schedules={schedules}
                        selectedDate={selectedDate}
                        onSelectDate={(dateKey) => {
                          setSelectedDate(dateKey);
                          setShowAllDates(false);
                          setDatePopupKey(dateKey);
                        }}
                      />
                    </div>
                    <div className="xl:col-span-7">
                      <ScheduleList
                        schedules={schedules}
                        selectedDate={selectedDate}
                        activeCategory={activeCategory}
                        onCategoryChange={setActiveCategory}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        showAllDates={showAllDates}
                        onToggleShowAllDates={(val) => setShowAllDates(val)}
                        onToggleComplete={handleToggleComplete}
                        onEditItem={openEditModal}
                        onDeleteItem={(item) => setDeleteTarget(item)}
                        onAddSchedule={openAddModal}
                      />
                    </div>
                  </div>
                )}

                {/* PAGE 3: SEMUA JADWAL */}
                {activePage === 'jadwal' && (
                  <ScheduleList
                    schedules={schedules}
                    selectedDate={selectedDate}
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    showAllDates={showAllDates}
                    onToggleShowAllDates={(val) => setShowAllDates(val)}
                    onToggleComplete={handleToggleComplete}
                    onEditItem={openEditModal}
                    onDeleteItem={(item) => setDeleteTarget(item)}
                    onAddSchedule={openAddModal}
                    pageSize={6}
                  />
                )}

                {/* PAGE 4: PROFIL & STATISTIK */}
                {activePage === 'profil' && (
                  <div className="space-y-6">
                    {/* Mobile/Tablet full editable profile card */}
                    <div className="lg:hidden">
                      <SidebarProfile
                        profile={profile}
                        userEmail={user.email}
                        isLocalMode={isLocalMode}
                        isFirebaseAvailable={isFirebaseConfigured}
                        isDark={isDark}
                        onToggleTheme={toggleTheme}
                        activePage={activePage}
                        totalSchedulesCount={schedules.length}
                        todaySchedulesCount={todayCount}
                        onSelectPage={handleSelectPage}
                        onOpenAuth={() => setAuthModalOpen(true)}
                        onUpdateProfile={handleUpdateProfile}
                        onSeedSamplePack={handleSeedSamplePack}
                        onRequestClearAll={() => setClearConfirmOpen(true)}
                        onAddSchedule={openAddModal}
                        onOpenShareQr={() => setShareQrOpen(true)}
                        onLogout={handleLogout}
                        reminderSettings={reminderSettings}
                        waSettings={waSettings}
                        serverWaStatus={serverWaStatus}
                        notificationsAllowed={notificationsAllowed}
                        notificationPermission={notificationPermission}
                        onRequestPermission={handleAllowNotifications}
                        onToggleReminders={toggleReminders}
                        onChangeLeadMinutes={setLeadMinutes}
                        onUpdateWhatsAppSettings={updateWhatsAppSettings}
                        onTestNotification={sendTestNotification}
                        onTestWhatsApp={sendTestWhatsAppNow}
                        onSendDailyWhatsApp={handleSendDailyWhatsApp}
                      />
                    </div>

                    {/* Academic Summary & Category Breakdown (visible on all sizes in Profil tab) */}
                    <section className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 shadow-[0_4px_24px_rgba(45,55,72,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
                      <h2 className="text-xl font-extrabold text-[#2D3748] dark:text-slate-100 font-display">
                        Ringkasan Akademik &amp; Produktivitas
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Statistik jadwal kuliah, rutinitas, dan tugas yang tersimpan di akunmu.
                      </p>

                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="rounded-2xl bg-[#F5F0FC] dark:bg-violet-950/50 border border-[#DDD6FE]/70 dark:border-violet-800/60 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#5B21B6] dark:text-violet-300">
                            <BookOpen className="w-4 h-4" />
                            <span>Total SKS</span>
                          </div>
                          <p className="mt-2 text-2xl font-extrabold text-[#2D3748] dark:text-slate-100 tabular-nums">
                            {academicStats.totalSks}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#F1F8F6] dark:bg-emerald-950/50 border border-[#B7E1D5]/70 dark:border-emerald-800/60 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#065F46] dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Selesai</span>
                          </div>
                          <p className="mt-2 text-2xl font-extrabold text-[#2D3748] dark:text-slate-100 tabular-nums">
                            {academicStats.completedTotal}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#F0F7FD] dark:bg-sky-950/50 border border-[#BFDBFE]/70 dark:border-sky-800/60 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#1E40AF] dark:text-sky-300">
                            <Clock className="w-4 h-4" />
                            <span>Deadline Aktif</span>
                          </div>
                          <p className="mt-2 text-2xl font-extrabold text-[#2D3748] dark:text-slate-100 tabular-nums">
                            {academicStats.pendingDeadlines}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#FFF3F5] dark:bg-pink-950/50 border border-[#FBCFE8]/70 dark:border-pink-800/60 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#9D174D] dark:text-pink-300">
                            <ListTodo className="w-4 h-4" />
                            <span>Total Agenda</span>
                          </div>
                          <p className="mt-2 text-2xl font-extrabold text-[#2D3748] dark:text-slate-100 tabular-nums">
                            {academicStats.totalItems}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {academicStats.byCategory.map(({ meta, count, done }) => (
                          <button
                            key={meta.id}
                            type="button"
                            onClick={() => {
                              setActiveCategory(meta.id);
                              handleSelectPage('jadwal');
                            }}
                            className="text-left rounded-2xl bg-[#FAF9F6] hover:bg-slate-100/80 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700 p-4 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: meta.dotColor }}
                              />
                              <div>
                                <p className="text-sm font-bold text-[#2D3748] dark:text-slate-100">
                                  {meta.label}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                  {done} selesai dari {count} jadwal
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${meta.textClass}`}>
                              Lihat →
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav + FAB */}
      <MobileNav
        activeTab={activePage}
        onSelectTab={handleSelectPage}
        onAddSchedule={openAddModal}
        isLocalMode={isLocalMode}
      />

      {/* Cloud Login / Register Modal */}
      {authModalOpen && (
        <AuthPage
          isModal
          onClose={() => setAuthModalOpen(false)}
          onEnterLocalMode={handleEnterLocalMode}
        />
      )}

      {/* Cute Mini Date Preview Popup */}
      <DatePreviewModal
        dateKey={datePopupKey}
        schedules={schedules}
        studentName={profile?.nama}
        waPhone={waSettings.phone}
        onClose={() => setDatePopupKey(null)}
        onToggleComplete={handleToggleComplete}
        onEditItem={openEditModal}
        onAddOnDate={(dateKey) => {
          setSelectedDate(dateKey);
          openAddModal();
        }}
      />

      {/* Add / Edit Schedule Modal */}
      <ScheduleModal
        open={modalOpen}
        userId={user.uid}
        editingItem={editingItem}
        defaultDate={selectedDate}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSaveSchedule}
      />

      {/* Confirm Clear All Schedules */}
      <ConfirmDialog
        open={clearConfirmOpen}
        title="Bersihkan Semua Jadwal?"
        message="Seluruh data jadwal mata kuliah, rutinitas harian, acara, serta rapat & deadline akan dihapus permanen. Kamu bisa mengisinya ulang kapan saja lewat tombol Isi Jadwal Otomatis."
        confirmLabel="Ya, Bersihkan Semua"
        loading={actionBusy}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setClearConfirmOpen(false)}
      />

      {/* Confirm Delete Single Schedule */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Jadwal Ini?"
        message={`Jadwal "${deleteTarget?.title || ''}" akan dihapus dari daftar rencanamu.`}
        confirmLabel="Hapus Jadwal"
        loading={actionBusy}
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 1-Click Notification Permission Gate */}
      <NotificationPermissionModal
        open={consent === 'pending'}
        busy={permissionBusy}
        onAllow={handleAllowNotifications}
        onDeny={handleDenyNotifications}
      />

      {/* QR Code Share Modal (Vercel App URL) */}
      <ShareQrModal open={shareQrOpen} onClose={() => setShareQrOpen(false)} />
    </div>
  );
}
