import { useMemo } from 'react';
import {
  BookOpen,
  CalendarCheck2,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { CATEGORY_META, type ScheduleCategory, type ScheduleItem } from '../types/schedule';
import { formatDateKey, formatIndonesianDate } from '../utils/dateUtils';
import {
  buildScheduleWhatsAppMessage,
  buildWhatsAppLink,
} from '../utils/whatsappUtils';

interface DatePreviewModalProps {
  dateKey: string | null;
  schedules: ScheduleItem[];
  studentName?: string;
  waPhone: string;
  onClose: () => void;
  onToggleComplete: (item: ScheduleItem) => void;
  onEditItem: (item: ScheduleItem) => void;
  onAddOnDate: (dateKey: string) => void;
}

export default function DatePreviewModal({
  dateKey,
  schedules,
  studentName,
  waPhone,
  onClose,
  onToggleComplete,
  onEditItem,
  onAddOnDate,
}: DatePreviewModalProps) {
  const todayKey = formatDateKey(new Date());

  const dayItems = useMemo(() => {
    if (!dateKey) return [];
    return schedules
      .filter((item) => item.date === dateKey)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [dateKey, schedules]);

  if (!dateKey) return null;

  const waMessage = buildScheduleWhatsAppMessage(dateKey, dayItems, studentName);
  const waHref = buildWhatsAppLink(waPhone, waMessage);

  const getCategoryIcon = (cat: ScheduleCategory) => {
    switch (cat) {
      case 'matkul':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'harian':
        return <CalendarCheck2 className="w-3.5 h-3.5" />;
      case 'acara':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'rapat_deadline':
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3748]/35 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-preview-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white border border-slate-200/80 shadow-[0_24px_60px_rgba(45,55,72,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cute Pastel Header */}
        <div className="relative bg-gradient-to-br from-[#F5F0FC] via-[#FFF3F5] to-[#F0F7FD] px-5 pt-5 pb-4 border-b border-slate-100">
          {/* Decorative mini star charm */}
          <svg
            viewBox="0 0 40 40"
            className="pointer-events-none absolute right-14 top-2 w-8 h-8 opacity-75"
            aria-hidden="true"
          >
            <path
              d="M20 4l3.5 9.5L33 17l-9.5 3.5L20 30l-3.5-9.5L7 17l9.5-3.5z"
              fill="#FBCFE8"
            />
          </svg>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#5B21B6]">
                {dateKey === todayKey ? 'Hari Ini' : 'Ringkasan Tanggal'} ·{' '}
                <span className="tabular-nums">{dayItems.length} agenda</span>
              </p>
              <h3
                id="date-preview-title"
                className="mt-1 text-base font-extrabold text-[#2D3748] font-display leading-snug"
              >
                {formatIndonesianDate(dateKey, true)}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] rounded-xl bg-white/80 hover:bg-white flex items-center justify-center text-slate-500 hover:text-[#2D3748] transition-colors cursor-pointer shrink-0"
              aria-label="Tutup popup tanggal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Mini Schedule Cards */}
        <div className="p-4 max-h-[46vh] overflow-y-auto space-y-2.5 bg-[#FAF9F6]/60">
          {dayItems.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-5 text-center">
              <div className="w-10 h-10 rounded-2xl bg-[#FCE1E4] text-[#9D174D] flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="mt-2.5 text-xs font-bold text-[#2D3748]">
                Tanggal ini masih santai!
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Belum ada jadwal tercatat. Tambahkan matkul, tugas, atau kegiatan di sini.
              </p>
            </div>
          ) : (
            dayItems.map((item) => {
              const meta = CATEGORY_META[item.category];
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl bg-white border border-slate-200/80 p-3 flex items-start gap-2.5 transition-all ${
                    item.completed ? 'opacity-65' : 'shadow-2xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleComplete(item)}
                    aria-label={
                      item.completed
                        ? `Tandai ${item.title} belum selesai`
                        : `Tandai ${item.title} selesai`
                    }
                    className="min-w-[36px] min-h-[36px] -ml-1 -mt-0.5 flex items-center justify-center rounded-xl hover:bg-slate-100 cursor-pointer shrink-0"
                  >
                    <span
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        item.completed
                          ? 'bg-[#10B981] border-[#10B981] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </button>

                  <div
                    className={`w-8 h-8 rounded-xl ${meta.bgClass} ${meta.textClass} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditItem(item);
                    }}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <p
                      className={`text-xs font-bold leading-snug truncate ${
                        item.completed ? 'line-through text-slate-400' : 'text-[#2D3748]'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums truncate">
                      <span className={`font-semibold ${meta.textClass}`}>
                        {meta.shortLabel}
                      </span>{' '}
                      · {item.startTime}
                      {item.endTime ? `–${item.endTime}` : ''}
                    </p>
                    {(item.room || item.location) && (
                      <p className="mt-0.5 text-[11px] text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.room || item.location}</span>
                      </p>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onAddOnDate(dateKey);
            }}
            className="min-h-[42px] px-3 py-2 rounded-2xl bg-[#2D3748] hover:bg-[#1E293B] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Tambah Jadwal</span>
          </button>

          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="min-h-[42px] px-3 py-2 rounded-2xl bg-[#E2ECE9] hover:bg-[#CBE3DC] text-[#065F46] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Kirim ke WA</span>
          </a>
        </div>
      </div>
    </div>
  );
}
