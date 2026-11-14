import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { CATEGORY_META, type ScheduleCategory, type ScheduleItem } from '../types/schedule';
import {
  addDays,
  formatDateKey,
  formatMonthYear,
  getMonthCalendarGrid,
  getWeekDays,
  parseDateKey,
} from '../utils/dateUtils';

interface AestheticCalendarProps {
  schedules: ScheduleItem[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function AestheticCalendar({
  schedules,
  selectedDate,
  onSelectDate,
}: AestheticCalendarProps) {
  const todayKey = formatDateKey(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [cursorDate, setCursorDate] = useState<Date>(() => parseDateKey(selectedDate));

  // Map date -> unique categories present on that date
  const dotsByDate = useMemo(() => {
    const map = new Map<string, ScheduleCategory[]>();
    for (const item of schedules) {
      const list = map.get(item.date) || [];
      if (!list.includes(item.category)) {
        list.push(item.category);
        map.set(item.date, list);
      }
    }
    return map;
  }, [schedules]);

  const monthCells = useMemo(
    () => getMonthCalendarGrid(cursorDate.getFullYear(), cursorDate.getMonth()),
    [cursorDate]
  );

  const weekCells = useMemo(
    () => getWeekDays(parseDateKey(selectedDate)),
    [selectedDate]
  );

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCursorDate(new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 1, 1));
    } else {
      const prevAnchor = addDays(parseDateKey(selectedDate), -7);
      onSelectDate(formatDateKey(prevAnchor));
      setCursorDate(prevAnchor);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCursorDate(new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1));
    } else {
      const nextAnchor = addDays(parseDateKey(selectedDate), 7);
      onSelectDate(formatDateKey(nextAnchor));
      setCursorDate(nextAnchor);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCursorDate(now);
    onSelectDate(formatDateKey(now));
  };

  const isViewingToday =
    selectedDate === todayKey &&
    cursorDate.getMonth() === new Date().getMonth() &&
    cursorDate.getFullYear() === new Date().getFullYear();

  const cells = viewMode === 'month' ? monthCells : weekCells;

  return (
    <section
      aria-label="Kalender Jadwal"
      className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-[0_4px_24px_rgba(45,55,72,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
    >
      {/* Cute subtle stationery corner sticker */}
      <div
        className="pointer-events-none absolute -top-2 -right-2 w-16 h-16 opacity-60 dark:opacity-35"
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle cx="44" cy="20" r="14" fill="#FCE1E4" />
          <path
            d="M44 12l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z"
            fill="#F472B6"
          />
        </svg>
      </div>

      {/* Calendar Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#E8DFF5] dark:bg-violet-950/80 text-[#5B21B6] dark:text-violet-300 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#2D3748] dark:text-slate-100 font-display capitalize">
              {formatMonthYear(viewMode === 'month' ? cursorDate : parseDateKey(selectedDate))}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih tanggal untuk memfilter jadwal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Monthly / Weekly Toggle */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'month'
                  ? 'bg-white text-[#2D3748] shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:text-[#2D3748] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'week'
                  ? 'bg-white text-[#2D3748] shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:text-[#2D3748] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Mingguan
            </button>
          </div>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="min-w-[38px] min-h-[38px] rounded-xl bg-[#FAF9F6] hover:bg-[#E8DFF5]/60 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label={viewMode === 'month' ? 'Bulan sebelumnya' : 'Minggu sebelumnya'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="min-w-[38px] min-h-[38px] rounded-xl bg-[#FAF9F6] hover:bg-[#E8DFF5]/60 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              aria-label={viewMode === 'month' ? 'Bulan berikutnya' : 'Minggu berikutnya'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Back to Today quick button */}
      {!isViewingToday && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleJumpToday}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F0FC] hover:bg-[#E8DFF5] dark:bg-violet-950/70 dark:hover:bg-violet-900/70 text-[#5B21B6] dark:text-violet-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembali ke Hari Ini</span>
          </button>
        </div>
      )}

      {/* Weekday Labels */}
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Cells */}
      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {cells.map((cellDate) => {
          const dateKey = formatDateKey(cellDate);
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;
          const isCurrentMonth =
            viewMode === 'week' || cellDate.getMonth() === cursorDate.getMonth();
          const dots = dotsByDate.get(dateKey) || [];

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => {
                onSelectDate(dateKey);
                setCursorDate(cellDate);
              }}
              className={`group relative min-h-[48px] sm:min-h-[54px] rounded-2xl flex flex-col items-center justify-center gap-1 py-1.5 transition-all cursor-pointer tabular-nums ${
                isSelected
                  ? 'bg-[#2D3748] text-white shadow-sm dark:bg-violet-600 dark:text-white'
                  : isToday
                  ? 'bg-[#E8DFF5] text-[#4C1D95] ring-1 ring-[#C4B5FD] dark:bg-violet-950/80 dark:text-violet-200 dark:ring-violet-700'
                  : isCurrentMonth
                  ? 'bg-[#FAF9F6]/80 hover:bg-[#F5F0FC] text-[#2D3748] dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-200'
                  : 'bg-transparent text-slate-300 hover:bg-slate-50 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800/40 dark:hover:text-slate-400'
              }`}
            >
              <span
                className={`text-xs sm:text-sm font-bold leading-none ${
                  isToday && !isSelected ? 'font-extrabold' : ''
                }`}
              >
                {cellDate.getDate()}
              </span>

              {/* Color-coded dots */}
              <div className="flex items-center justify-center gap-1 h-2">
                {dots.slice(0, 4).map((cat) => (
                  <span
                    key={cat}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: isSelected
                        ? cat === 'matkul'
                          ? '#DDD6FE'
                          : cat === 'harian'
                          ? '#A7F3D0'
                          : cat === 'acara'
                          ? '#FBCFE8'
                          : '#BFDBFE'
                        : CATEGORY_META[cat].dotColor,
                    }}
                    title={CATEGORY_META[cat].label}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Category Color Legend */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {(Object.keys(CATEGORY_META) as ScheduleCategory[]).map((cat) => (
          <span key={cat} className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_META[cat].dotColor }}
            />
            <span>{CATEGORY_META[cat].shortLabel}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
