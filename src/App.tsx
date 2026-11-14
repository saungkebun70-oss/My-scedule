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
  User,
  X,
} from 'lucide-react';
import AestheticCalendar from './components/AestheticCalendar';
import AuthPage from './components/AuthPage';
import ConfirmDialog from './components/ConfirmDialog';
import DashboardOverview from './components/DashboardOverview';
import MobileNav, { MobileTopBar, type MobileTab } from './components/MobileNav';
import ScheduleList from './components/ScheduleList';
import ScheduleModal from './components/ScheduleModal';
import SidebarProfile from './components/SidebarProfile';
import {
  useScheduleReminders,
  type InAppReminderAlert,
} from './hooks/useScheduleReminders';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [bannerMessage, setBannerMessage] = useState<{
    text: string;
    tone: 'info' | 'error';
  } | null>(null);
  const [reminderAlert, setReminderAlert] = useState<InAppReminderAlert | null>(null);

  const todayKey = formatDateKey(new Date());

  const showToast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setBannerMessage({ text, tone });
  }, []);

  const handleInAppReminder = useCallback((alert: InAppReminderAlert) => {
    setReminderAlert(alert);
  }, []);

  const {
    settings: reminderSettings,
    permission: notificationPermission,
    toggleReminders,
    setLeadMinutes,
    sendTestNotification,
  } = useScheduleReminders(schedules, handleInAppReminder);

  useEffect(() => {
    if (!reminderAlert) return;
    const timer = window.setTimeout(() => setReminderAlert(null), 7000);
    return () => window.clearTimeout(timer);
  }, [reminderAlert]);

  useEffect(() => {
    if (!bannerMessage) return;
    const timer = window.setTimeout(() => setBannerMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [bannerMessage]);

  // Listen to Firebase Auth (automatic Cloud mode when configured, automatic Local fallback otherwise)
  useEffect(() => {
    const savedLocalRaw = localStorage.getItem(LOCAL_SESSION_KEY);

    if (!isFirebaseConfigured || !auth) {
      if (savedLocalRaw) {
        try {
          setUser(JSON.parse(savedLocalRaw) as AuthUser);
        } catch {
          const guest = createDefaultLocalUser();
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(guest));
          setUser(guest);
        }
      } else {
        const guest = createDefaultLocalUser();
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(guest));
        setUser(guest);
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
      } else if (savedLocalRaw) {
        try {
          setIsLocalMode(true);
          setUser(JSON.parse(savedLocalRaw) as AuthUser);
        } catch {
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
    if (!isLocalMode && auth) {
      await signOut(auth);
      showToast('Berhasil keluar dari akun Cloud.');
    } else {
      setUser(null);
      setProfile(null);
      setSchedules([]);
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

  const handleSaveSchedule = async (data: NewScheduleInput) => {
    if (!user) return;
    if (editingItem) {
      await updateScheduleItem(user.uid, editingItem.id, data, isLocalMode);
      showToast('Perubahan jadwal tersimpan.');
    } else {
      await createScheduleItem(user.uid, data, isLocalMode);
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
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200/80 p-8 text-center shadow-[0_8px_32px_rgba(45,55,72,0.05)]">
          <div className="w-12 h-12 rounded-2xl bg-[#E8DFF5] mx-auto animate-pulse" />
          <p className="mt-4 text-sm font-bold text-[#2D3748]">Menyiapkan My Schedule...</p>
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D3748] pb-24 lg:pb-10">
      <MobileTopBar
        isLocalMode={isLocalMode}
        isFirebaseAvailable={isFirebaseConfigured}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Toast Notification Banner */}
      {bannerMessage && (
        <div className="fixed top-16 lg:top-5 right-4 left-4 sm:left-auto sm:max-w-md z-50">
          <div
            role="status"
            className={`rounded-2xl px-4 py-3 text-xs font-bold shadow-[0_12px_30px_rgba(45,55,72,0.12)] border ${
              bannerMessage.tone === 'error'
                ? 'bg-[#FFF3F5] text-[#9D174D] border-[#FBCFE8]'
                : 'bg-white text-[#2D3748] border-slate-200'
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
            className="rounded-2xl bg-white border border-[#BFDBFE] p-4 shadow-[0_14px_36px_rgba(30,64,175,0.16)] flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-[#DAEAF6] text-[#1E40AF] flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-[#2D3748]">
                {reminderAlert.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                {reminderAlert.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReminderAlert(null)}
              className="min-w-[32px] min-h-[32px] rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
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
              activePage={activePage}
              totalSchedulesCount={schedules.length}
              todaySchedulesCount={todayCount}
              onSelectPage={handleSelectPage}
              onOpenAuth={() => setAuthModalOpen(true)}
              onUpdateProfile={handleUpdateProfile}
              onSeedSamplePack={handleSeedSamplePack}
              onRequestClearAll={() => setClearConfirmOpen(true)}
              onAddSchedule={openAddModal}
              onLogout={handleLogout}
              reminderSettings={reminderSettings}
              notificationPermission={notificationPermission}
              onToggleReminders={toggleReminders}
              onChangeLeadMinutes={setLeadMinutes}
              onTestNotification={sendTestNotification}
            />
          </aside>

          {/* Main Workspace */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            {/* Desktop Top Page Switcher Bar */}
            <div className="hidden lg:flex items-center justify-between gap-4 rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 px-4 py-2.5 shadow-[0_4px_20px_rgba(45,55,72,0.03)]">
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
                          ? 'bg-[#2D3748] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-[#FAF9F6] hover:text-[#2D3748]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-xs font-semibold text-slate-400 tabular-nums whitespace-nowrap pr-2">
                {schedules.length} total agenda
              </span>
            </div>

            {dataLoading && schedules.length === 0 ? (
              <div className="space-y-5">
                <div className="h-44 rounded-3xl bg-white/80 border border-slate-200/70 animate-pulse" />
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                  <div className="xl:col-span-5 h-80 rounded-3xl bg-white/80 border border-slate-200/70 animate-pulse" />
                  <div className="xl:col-span-7 h-80 rounded-3xl bg-white/80 border border-slate-200/70 animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* PAGE 1: BERANDA */}
                {activePage === 'beranda' && (
                  <div className="space-y-6">
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
                        activePage={activePage}
                        totalSchedulesCount={schedules.length}
                        todaySchedulesCount={todayCount}
                        onSelectPage={handleSelectPage}
                        onOpenAuth={() => setAuthModalOpen(true)}
                        onUpdateProfile={handleUpdateProfile}
                        onSeedSamplePack={handleSeedSamplePack}
                        onRequestClearAll={() => setClearConfirmOpen(true)}
                        onAddSchedule={openAddModal}
                        onLogout={handleLogout}
                        reminderSettings={reminderSettings}
                        notificationPermission={notificationPermission}
                        onToggleReminders={toggleReminders}
                        onChangeLeadMinutes={setLeadMinutes}
                        onTestNotification={sendTestNotification}
                      />
                    </div>

                    {/* Academic Summary & Category Breakdown (visible on all sizes in Profil tab) */}
                    <section className="rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-6 shadow-[0_4px_24px_rgba(45,55,72,0.04)]">
                      <h2 className="text-xl font-extrabold text-[#2D3748] font-display">
                        Ringkasan Akademik &amp; Produktivitas
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Statistik jadwal kuliah, rutinitas, dan tugas yang tersimpan di akunmu.
                      </p>

                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="rounded-2xl bg-[#F5F0FC] border border-[#DDD6FE]/70 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#5B21B6]">
                            <BookOpen className="w-4 h-4" />
                            <span>Total SKS</span>
                          </div>
                          <p className="mt-2 text-2xl font-extrabold text-[#2D3748] tabular-nums">
                            {academicStats.totalSks}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#F1F8F6] border border-[#B7E1D5]/70 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#065F46]">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Selesai</span>
                          </div>
                          <p className="mt-2 text-2xl font-extrabold text-[#2D3748] tabular-nums">
                            {academicStats.completedTotal}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#F0F7FD] border border-[#BFDBFE]/70 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#1E40AF]">
                            <Clock className="w-4 h-4" />
                            <span>Deadline Aktif</span>
                          </div>
                          <p className="mt-2 text-2xl font-extrabold text-[#2D3748] tabular-nums">
                            {academicStats.pendingDeadlines}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#FFF3F5] border border-[#FBCFE8]/70 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#9D174D]">
                            <ListTodo className="w-4 h-4" />
                            <span>Total Agenda</span>
                          </div>
                          <p className="mt-2 text-2xl font-extrabold text-[#2D3748] tabular-nums">
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
                            className="text-left rounded-2xl bg-[#FAF9F6] hover:bg-slate-100/80 border border-slate-200/70 p-4 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: meta.dotColor }}
                              />
                              <div>
                                <p className="text-sm font-bold text-[#2D3748]">
                                  {meta.label}
                                </p>
                                <p className="text-xs text-slate-500 tabular-nums">
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

      {/* Add / Edit Schedule Modal */}
      <ScheduleModal
        open={modalOpen}
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
    </div>
  );
}
