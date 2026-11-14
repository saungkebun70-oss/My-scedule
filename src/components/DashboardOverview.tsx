import { useMemo } from 'react';
import { AlarmClock, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { ScheduleItem, StudentProfile } from '../types/schedule';
import {
  formatDateKey,
  formatIndonesianDate,
  getDeadlineCountdown,
  getGreetingByHour,
} from '../utils/dateUtils';

interface DashboardOverviewProps {
  profile: StudentProfile | null;
  schedules: ScheduleItem[];
  onSelectDate: (dateKey: string) => void;
}

export default function DashboardOverview({
  profile,
  schedules,
  onSelectDate,
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
      <div className="xl:col-span-7 rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-6 shadow-[0_4px_24px_rgba(45,55,72,0.04)] flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#5B21B6] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{formatIndonesianDate(todayKey, true)}</span>
            </p>
            {profile?.mood && (
              <span className="text-xs font-semibold text-slate-600">
                {profile.mood}
              </span>
            )}
          </div>

          <h2 className="mt-2.5 text-2xl sm:text-3xl font-extrabold text-[#2D3748] font-display text-balance">
            {greeting}, {firstName}!
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {todayStats.total === 0
              ? 'Belum ada jadwal tercatat untuk hari ini. Tambahkan kegiatan atau gunakan Isi Jadwal Otomatis.'
              : todayStats.completedCount === todayStats.total
              ? 'Semua agenda hari ini sudah selesai. Waktunya beristirahat sejenak!'
              : `Kamu memiliki ${todayStats.total - todayStats.completedCount} agenda tersisa untuk diselesaikan hari ini.`}
          </p>
        </div>

        {/* Daily Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span>Progress Jadwal Hari Ini</span>
            </span>
            <span className="text-[#2D3748] tabular-nums">
              {todayStats.completedCount} / {todayStats.total} selesai ({todayStats.percentage}%)
            </span>
          </div>
          <div
            className="w-full h-3 rounded-full bg-slate-100 overflow-hidden"
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
      <div className="xl:col-span-5 rounded-3xl bg-[#F0F7FD]/85 border border-[#BFDBFE]/80 p-5 sm:p-6 shadow-[0_4px_24px_rgba(45,55,72,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DAEAF6] text-[#1E40AF] flex items-center justify-center">
              <AlarmClock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1E3A8A] font-display">
              Rapat &amp; Deadline Terdekat
            </h3>
          </div>
          <span className="text-xs font-bold text-[#1E40AF] tabular-nums">
            {urgentItems.length} aktif
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {urgentItems.length === 0 ? (
            <div className="rounded-2xl bg-white/80 p-4 text-xs text-slate-500 text-center">
              Tidak ada rapat atau deadline mendesak saat ini.
            </div>
          ) : (
            urgentItems.map(({ item, countdown }) => {
              const badgeStyle =
                countdown.tone === 'overdue'
                  ? 'bg-[#FCE1E4] text-[#9D174D]'
                  : countdown.tone === 'today'
                  ? 'bg-[#FEF3C7] text-[#92400E]'
                  : countdown.tone === 'soon'
                  ? 'bg-[#E8DFF5] text-[#5B21B6]'
                  : 'bg-[#DAEAF6] text-[#1E40AF]';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectDate(item.date)}
                  className="w-full text-left rounded-2xl bg-white/90 hover:bg-white p-3 border border-white/80 shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2D3748] truncate">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-1.5 tabular-nums truncate">
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
