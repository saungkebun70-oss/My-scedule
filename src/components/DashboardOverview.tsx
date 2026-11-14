import { useMemo } from 'react';
import { AlarmClock, Camera, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { ScheduleItem, StudentProfile } from '../types/schedule';
import {
  formatDateKey,
  formatIndonesianDate,
  getDeadlineCountdown,
  getGreetingByHour,
} from '../utils/dateUtils';
import UserAvatar from './UserAvatar';

interface DashboardOverviewProps {
  profile: StudentProfile | null;
  schedules: ScheduleItem[];
  onSelectDate: (dateKey: string) => void;
  onOpenPhotoModal: () => void;
}

export default function DashboardOverview({
  profile,
  schedules,
  onSelectDate,
  onOpenPhotoModal,
}: DashboardOverviewProps) {
  const now = new Date();
  const todayKey = formatDateKey(now);
  const greeting = getGreetingByHour(now);
  const firstName = (profile?.nama || 'Mahasiswa').split(' ')[0];

  const todayStats = useMemo(() => {
    const todayItems = schedules.filter((item) => item.date === todayKey);
    const completedCount = todayItems.filter((item) => item.completed).length;
    const total = todayItems.length;
    const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return { total, completedCount, percentage };
  }, [schedules, todayKey]);

  const urgentItems = useMemo(() => {
    return schedules
      .filter((item) => item.category === 'rapat_deadline' && !item.completed)
      .map((item) => ({
        item,
        countdown: getDeadlineCountdown(item.date, item.startTime, item.completed, now),
      }))
      .sort((a, b) => {
        if (a.countdown.daysDiff !== b.countdown.daysDiff) {
          return a.countdown.daysDiff - b.countdown.daysDiff;
        }
        return a.item.startTime.localeCompare(b.item.startTime);
      })
      .slice(0, 3);
  }, [schedules, now]);

  return (
    <section aria-label="Ringkasan Hari Ini" className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Greeting & Daily Progress Card */}
      <div className="xl:col-span-7 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 shadow-[0_4px_24px_rgba(45,55,72,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#5B21B6] dark:text-violet-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{formatIndonesianDate(todayKey, true)}</span>
            </p>
            {profile?.mood && (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {profile.mood}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3.5">
            <button
              type="button"
              onClick={onOpenPhotoModal}
              title="Ubah foto profil"
              aria-label="Ubah foto profil"
              className="group relative rounded-2xl border-2 border-white dark:border-slate-700 shadow-sm cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            >
              <UserAvatar
                photoUrl={profile?.photoBase64}
                name={profile?.nama}
                sizeClass="w-13 h-13 sm:w-14 sm:h-14"
                textClass="text-lg"
                roundedClass="rounded-[14px]"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-[#2D3748] dark:bg-violet-600 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-2.5 h-2.5" />
              </span>
            </button>

            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D3748] dark:text-slate-100 font-display text-balance">
                {greeting}, {firstName}!
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {todayStats.total === 0
                  ? 'Belum ada jadwal tercatat untuk hari ini. Tambahkan kegiatan atau gunakan Isi Jadwal Otomatis.'
                  : todayStats.completedCount === todayStats.total
                  ? 'Semua agenda hari ini sudah selesai. Waktunya beristirahat sejenak!'
                  : `Kamu memiliki ${todayStats.total - todayStats.completedCount} agenda tersisa untuk diselesaikan hari ini.`}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] dark:text-emerald-400" />
              <span>Progress Jadwal Hari Ini</span>
            </span>
            <span className="text-[#2D3748] dark:text-slate-200 tabular-nums">
              {todayStats.completedCount} / {todayStats.total} selesai ({todayStats.percentage}%)
            </span>
          </div>
          <div
            className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={todayStats.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#10B981] transition-all duration-300"
              style={{ width: `${todayStats.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Urgent Meetings & Deadlines Highlight */}
      <div className="xl:col-span-5 rounded-3xl bg-[#F0F7FD]/85 dark:bg-sky-950/35 border border-[#BFDBFE]/80 dark:border-sky-900/60 p-5 sm:p-6 shadow-[0_4px_24px_rgba(45,55,72,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.22)] flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DAEAF6] dark:bg-sky-900/70 text-[#1E40AF] dark:text-sky-300 flex items-center justify-center">
              <AlarmClock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1E3A8A] dark:text-sky-200 font-display">
              Rapat &amp; Deadline Terdekat
            </h3>
          </div>
          <span className="text-xs font-bold text-[#1E40AF] dark:text-sky-300 tabular-nums">
            {urgentItems.length} aktif
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {urgentItems.length === 0 ? (
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/70 p-4 text-xs text-slate-500 dark:text-slate-400 text-center">
              Tidak ada rapat atau deadline mendesak saat ini.
            </div>
          ) : (
            urgentItems.map(({ item, countdown }) => {
              const badgeStyle =
                countdown.tone === 'overdue'
                  ? 'bg-[#FCE1E4] text-[#9D174D] dark:bg-pink-950/80 dark:text-pink-300'
                  : countdown.tone === 'today'
                  ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/80 dark:text-amber-300'
                  : countdown.tone === 'soon'
                  ? 'bg-[#E8DFF5] text-[#5B21B6] dark:bg-violet-950/80 dark:text-violet-300'
                  : 'bg-[#DAEAF6] text-[#1E40AF] dark:bg-sky-950/80 dark:text-sky-300';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectDate(item.date)}
                  className="w-full text-left rounded-2xl bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 p-3 border border-white/80 dark:border-slate-800 shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2D3748] dark:text-slate-100 truncate">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 tabular-nums truncate">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{formatIndonesianDate(item.date, false)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.startTime}</span>
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 tabular-nums ${badgeStyle}`}
                  >
                    {countdown.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
