import { useEffect, useState } from 'react';
import { BellRing, BookOpen, CalendarCheck2, Clock, Sparkles, X } from 'lucide-react';
import type { NewScheduleInput } from '../services/scheduleService';
import {
  CATEGORY_META,
  type MeetingSubType,
  type PriorityLevel,
  type ScheduleCategory,
  type ScheduleItem,
} from '../types/schedule';
import { getCustomWaReminderTime } from '../utils/whatsappUtils';

interface ScheduleModalProps {
  open: boolean;
  editingItem: ScheduleItem | null;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (data: NewScheduleInput, customWaTime: string) => Promise<void>;
}

const CATEGORIES: ScheduleCategory[] = ['matkul', 'harian', 'acara', 'rapat_deadline'];

export default function ScheduleModal({
  open,
  editingItem,
  defaultDate,
  onClose,
  onSubmit,
}: ScheduleModalProps) {
  const [category, setCategory] = useState<ScheduleCategory>('matkul');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [sks, setSks] = useState(3);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('sedang');
  const [subType, setSubType] = useState<MeetingSubType>('deadline');
  const [completed, setCompleted] = useState(false);
  const [customWaTime, setCustomWaTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      setCategory(editingItem.category);
      setTitle(editingItem.title);
      setDate(editingItem.date);
      setStartTime(editingItem.startTime);
      setEndTime(editingItem.endTime);
      setRoom(editingItem.room);
      setLecturer(editingItem.lecturer);
      setSks(editingItem.sks || 0);
      setLocation(editingItem.location);
      setNotes(editingItem.notes);
      setPriority(editingItem.priority || 'sedang');
      setSubType(editingItem.subType || 'deadline');
      setCompleted(editingItem.completed);
      setCustomWaTime(getCustomWaReminderTime(editingItem.id));
    } else {
      setCategory('matkul');
      setTitle('');
      setDate(defaultDate);
      setStartTime('08:00');
      setEndTime('10:00');
      setRoom('');
      setLecturer('');
      setSks(3);
      setLocation('');
      setNotes('');
      setPriority('sedang');
      setSubType('deadline');
      setCompleted(false);
      setCustomWaTime('');
    }
  }, [open, editingItem, defaultDate]);

  if (!open) return null;

  const getIcon = (cat: ScheduleCategory) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit(
        {
          category,
          title: title.trim(),
          date,
          startTime,
          endTime: category === 'harian' ? '' : endTime,
          completed,
          room: category === 'matkul' ? room.trim() : '',
          lecturer: category === 'matkul' ? lecturer.trim() : '',
          sks: category === 'matkul' ? Number(sks) || 0 : 0,
          location: category !== 'matkul' ? location.trim() : '',
          notes: notes.trim(),
          priority: category === 'rapat_deadline' ? priority || 'sedang' : '',
          subType: category === 'rapat_deadline' ? subType || 'deadline' : '',
        },
        customWaTime
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const titleLabel =
    category === 'matkul'
      ? 'Nama Mata Kuliah'
      : category === 'harian'
      ? 'Nama Kegiatan Harian'
      : category === 'acara'
      ? 'Nama Acara Kampus / Organisasi'
      : subType === 'rapat'
      ? 'Judul Rapat'
      : 'Nama Tugas / Deadline';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D3748]/40 dark:bg-slate-950/75 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-[0_24px_60px_rgba(45,55,72,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-slate-800">
        {/* Mobile grab handle */}
        <div className="sm:hidden w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between gap-4">
          <h2
            id="schedule-modal-title"
            className="text-lg font-extrabold text-[#2D3748] dark:text-slate-100 font-display"
          >
            {editingItem ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* 4 Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
              Kategori Jadwal
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`min-h-[44px] px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                      active
                        ? `${meta.bgClass} ${meta.textClass} ${meta.borderClass} shadow-xs`
                        : 'bg-[#FAF9F6] text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    {getIcon(cat)}
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtype for Rapat & Deadline */}
          {category === 'rapat_deadline' && (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setSubType('deadline')}
                className={`min-h-[38px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  subType === 'deadline'
                    ? 'bg-white text-[#1E40AF] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Deadline Tugas
              </button>
              <button
                type="button"
                onClick={() => setSubType('rapat')}
                className={`min-h-[38px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  subType === 'rapat'
                    ? 'bg-white text-[#1E40AF] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Jadwal Rapat
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              {titleLabel}
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Masukkan ${titleLabel.toLowerCase()}...`}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Tanggal
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                {category === 'rapat_deadline' && subType === 'deadline'
                  ? 'Jam Batas Akhir'
                  : 'Jam Mulai'}
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
            </div>

            {category !== 'harian' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Jam Selesai (Opsional)
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
                />
              </div>
            )}
          </div>

          {/* Category-Specific Fields: MATKUL */}
          {category === 'matkul' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Ruang Kelas / Gedung
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Contoh: Gedung B-304"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Jumlah SKS
                </label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={sks}
                  onChange={(e) => setSks(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nama Dosen
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                  placeholder="Contoh: Dr. Budi Santoso, M.Kom."
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
                />
              </div>
            </div>
          )}

          {/* Location / Meeting Link for Non-Matkul */}
          {category !== 'matkul' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                {category === 'rapat_deadline'
                  ? 'Link Meeting / Lokasi Pengumpulan'
                  : 'Lokasi Kegiatan'}
              </label>
              <input
                type="text"
                maxLength={150}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={
                  category === 'rapat_deadline'
                    ? 'Contoh: Google Meet / Portal E-Learning'
                    : 'Contoh: Aula Utama Kampus'
                }
                className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
            </div>
          )}

          {/* Priority for Rapat & Deadline */}
          {category === 'rapat_deadline' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Tingkat Prioritas
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['tinggi', 'sedang', 'rendah'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriority(level)}
                    className={`min-h-[40px] rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                      priority === level
                        ? level === 'tinggi'
                          ? 'bg-[#FCE1E4] text-[#9D174D] border-[#FBCFE8] dark:bg-pink-950/80 dark:text-pink-300 dark:border-pink-800'
                          : level === 'sedang'
                          ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-[#E2ECE9] text-[#065F46] border-[#B7E1D5] dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-[#FAF9F6] text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              Catatan Singkat (Opsional)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan detail penting atau perlengkapan yang perlu dibawa..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40 resize-none"
            />
          </div>

          {/* Optional Custom WA & Browser Reminder Clock Time */}
          <div className="rounded-2xl bg-[#F1F8F6]/70 dark:bg-emerald-950/30 border border-[#B7E1D5]/70 dark:border-emerald-800/60 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="custom-wa-time"
                className="flex items-center gap-1.5 text-xs font-bold text-[#065F46] dark:text-emerald-300"
              >
                <BellRing className="w-3.5 h-3.5 shrink-0" />
                <span>Jam Khusus Notif WA (Opsional)</span>
              </label>
              {customWaTime && (
                <button
                  type="button"
                  onClick={() => setCustomWaTime('')}
                  className="text-[11px] font-bold text-slate-500 hover:text-[#9D174D] dark:text-slate-400 dark:hover:text-pink-300 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              id="custom-wa-time"
              type="time"
              value={customWaTime}
              onChange={(e) => setCustomWaTime(e.target.value)}
              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-[#2D3748] dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
            />
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Kosongkan untuk mengikuti pengingat otomatis global. Isi jam tertentu jika ingin dikirim tepat pada jam tersebut.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[44px] px-4 py-2 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-6 py-2 rounded-2xl text-sm font-bold bg-[#2D3748] hover:bg-[#1E293B] dark:bg-violet-600 dark:hover:bg-violet-500 text-white transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Simpan Jadwal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
