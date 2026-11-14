import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import {
  CATEGORY_META,
  type ScheduleCategory,
  type ScheduleItem,
} from '../types/schedule';
import {
  formatDateKey,
  formatIndonesianDate,
  getDeadlineCountdown,
} from '../utils/dateUtils';

interface ScheduleListProps {
  schedules: ScheduleItem[];
  selectedDate: string;
  activeCategory: ScheduleCategory | 'all';
  onCategoryChange: (cat: ScheduleCategory | 'all') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showAllDates: boolean;
  onToggleShowAllDates: (showAll: boolean) => void;
  onToggleComplete: (item: ScheduleItem) => void;
  onEditItem: (item: ScheduleItem) => void;
  onDeleteItem: (item: ScheduleItem) => void;
  onAddSchedule: () => void;
  pageSize?: number;
}

const FILTER_OPTIONS: Array<{ id: ScheduleCategory | 'all'; label: string }> = [
  { id: 'all', label: 'Semua' },
  { id: 'matkul', label: 'Matkul' },
  { id: 'harian', label: 'Harian' },
  { id: 'acara', label: 'Acara' },
  { id: 'rapat_deadline', label: 'Rapat & Deadline' },
];

export default function ScheduleList({
  schedules,
  selectedDate,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  showAllDates,
  onToggleShowAllDates,
  onToggleComplete,
  onEditItem,
  onDeleteItem,
  onAddSchedule,
  pageSize = 6,
}: ScheduleListProps) {
  const todayKey = formatDateKey(new Date());
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schedules
      .filter((item) => {
        if (!showAllDates && item.date !== selectedDate) return false;
        if (activeCategory !== 'all' && item.category !== activeCategory) return false;
        if (q) {
          const haystack = [
            item.title,
            item.room,
            item.lecturer,
            item.location,
            item.notes,
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [schedules, selectedDate, showAllDates, activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  // Reset to page 1 when filters/date change, or clamp if items are deleted
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, activeCategory, searchQuery, showAllDates]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const getCategoryIcon = (cat: ScheduleCategory) => {
    switch (cat) {
      case 'matkul':
        return <BookOpen className="w-4 h-4" />;
      case 'harian':
        return <CalendarCheck2 className="w-4 h-4" />;
      case 'acara':
        return <Sparkles className="w-4 h-4" />;
      case 'rapat_deadline':
        return <Clock className="w-4 h-4" />;
    }
  };

  const startIndex = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredItems.length);

  return (
    <section
      aria-label="Daftar Jadwal"
      className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-[0_4px_24px_rgba(45,55,72,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
    >
      {/* Header + Date Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#2D3748] dark:text-slate-100 font-display">
            {showAllDates
              ? 'Semua Agenda Terjadwal'
              : selectedDate === todayKey
              ? 'Agenda Hari Ini'
              : `Agenda · ${formatIndonesianDate(selectedDate, false)}`}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Menampilkan {startIndex}–{endIndex} dari {filteredItems.length} jadwal secara kronologis
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => onToggleShowAllDates(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              !showAllDates
                ? 'bg-white text-[#2D3748] shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-[#2D3748] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Tanggal Dipilih
          </button>
          <button
            type="button"
            onClick={() => onToggleShowAllDates(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              showAllDates
                ? 'bg-white text-[#2D3748] shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-[#2D3748] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Semua Tanggal
          </button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari mata kuliah, dosen, ruang kelas, acara, atau tugas..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40 focus:border-[#8B5CF6]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((opt) => {
            const active = activeCategory === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onCategoryChange(opt.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#2D3748] text-white shadow-xs dark:bg-violet-600 dark:text-white'
                    : 'bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border border-slate-200/70 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chronological Schedule Items */}
      <div className="mt-5 space-y-3">
        {paginatedItems.length === 0 ? (
          <div className="rounded-2xl bg-[#FAF9F6] dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 px-6 py-10 text-center">
            <p className="text-sm font-bold text-[#2D3748] dark:text-slate-100">
              Belum ada jadwal pada filter ini
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Tambahkan jadwal kuliah, rutinitas harian, acara kampus, atau deadline baru untuk tanggal ini.
            </p>
            <button
              type="button"
              onClick={onAddSchedule}
              className="mt-4 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#E8DFF5] hover:bg-[#DDD0F2] dark:bg-violet-950/80 dark:hover:bg-violet-900/80 text-[#4C1D95] dark:text-violet-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Baru</span>
            </button>
          </div>
        ) : (
          paginatedItems.map((item) => {
            const meta = CATEGORY_META[item.category];
            const countdown =
              item.category === 'rapat_deadline'
                ? getDeadlineCountdown(item.date, item.startTime, item.completed)
                : null;

            const countdownStyle =
              countdown?.tone === 'done'
                ? 'bg-[#E2ECE9] text-[#065F46] dark:bg-emerald-950/80 dark:text-emerald-300'
                : countdown?.tone === 'overdue'
                ? 'bg-[#FCE1E4] text-[#9D174D] dark:bg-pink-950/80 dark:text-pink-300'
                : countdown?.tone === 'today'
                ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/80 dark:text-amber-300'
                : countdown?.tone === 'soon'
                ? 'bg-[#E8DFF5] text-[#5B21B6] dark:bg-violet-950/80 dark:text-violet-300'
                : 'bg-[#DAEAF6] text-[#1E40AF] dark:bg-sky-950/80 dark:text-sky-300';

            return (
              <article
                key={item.id}
                className={`group rounded-2xl border p-4 transition-all duration-150 ${
                  item.completed
                    ? 'bg-slate-50/80 border-slate-200/70 opacity-75 dark:bg-slate-900/40 dark:border-slate-800/70'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(45,55,72,0.05)] dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(item)}
                    aria-label={
                      item.completed
                        ? `Tandai ${item.title} belum selesai`
                        : `Tandai ${item.title} selesai`
                    }
                    className="min-w-[44px] min-h-[44px] -ml-1.5 -mt-1.5 flex items-center justify-center rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  >
                    <span
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        item.completed
                          ? 'bg-[#10B981] border-[#10B981] text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-[#8B5CF6]'
                      }`}
                    >
                      {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  </button>

                  <div
                    className={`w-10 h-10 rounded-2xl ${meta.bgClass} ${meta.textClass} flex items-center justify-center shrink-0`}
                    title={meta.label}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3
                          className={`text-sm sm:text-base font-bold font-display leading-snug ${
                            item.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-[#2D3748] dark:text-slate-100'
                          }`}
                        >
                          {item.title}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          <span className={`font-bold ${meta.textClass}`}>
                            {meta.shortLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {item.startTime}
                            {item.endTime ? ` – ${item.endTime}` : ''}
                          </span>
                          {showAllDates && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{formatIndonesianDate(item.date, false)}</span>
                            </>
                          )}
                          {item.category === 'matkul' && item.sks > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{item.sks} SKS</span>
                            </>
                          )}
                          {item.category === 'rapat_deadline' && item.priority && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">
                                Prioritas {item.priority}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {countdown && (
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap tabular-nums mr-1 ${countdownStyle}`}
                          >
                            {countdown.label}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-[#5B21B6] hover:bg-[#F5F0FC] dark:hover:text-violet-300 dark:hover:bg-violet-950/70 transition-colors cursor-pointer"
                          aria-label={`Edit ${item.title}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-[#9D174D] hover:bg-[#FFF3F5] dark:hover:text-pink-300 dark:hover:bg-pink-950/70 transition-colors cursor-pointer"
                          aria-label={`Hapus ${item.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {(item.room || item.lecturer || item.location) && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {(item.room || item.location) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="break-all">
                              {item.room || item.location}
                            </span>
                          </span>
                        )}
                        {item.lecturer && (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{item.lecturer}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {item.notes && (
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Pagination Controls per Page */}
      {totalPages > 1 && (
        <nav
          aria-label="Navigasi halaman daftar jadwal"
          className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            Halaman {currentPage} dari {totalPages}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#E8DFF5]/60 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                const active = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    aria-current={active ? 'page' : undefined}
                    className={`min-w-[38px] min-h-[38px] rounded-xl text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#2D3748] text-white shadow-xs dark:bg-violet-600 dark:text-white'
                        : 'bg-[#FAF9F6] text-slate-600 hover:bg-slate-100 border border-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#E8DFF5]/60 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
