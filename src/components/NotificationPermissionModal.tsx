import { BellRing, ShieldAlert } from 'lucide-react';

interface NotificationPermissionModalProps {
  open: boolean;
  busy?: boolean;
  onAllow: () => Promise<void> | void;
  onDeny: () => void;
}

export default function NotificationPermissionModal({
  open,
  busy = false,
  onAllow,
  onDeny,
}: NotificationPermissionModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D3748]/45 dark:bg-slate-950/80 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-consent-title"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-[0_24px_60px_rgba(45,55,72,0.2)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.55)] border border-slate-200/80 dark:border-slate-800">
        <div className="sm:hidden w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

        <div className="w-12 h-12 rounded-2xl bg-[#DAEAF6] dark:bg-sky-950/80 text-[#1E40AF] dark:text-sky-300 flex items-center justify-center mb-4">
          <BellRing className="w-6 h-6" />
        </div>

        <h2
          id="notif-consent-title"
          className="text-lg font-extrabold text-[#2D3748] dark:text-slate-100 font-display"
        >
          Izinkan Pengingat Otomatis?
        </h2>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Cukup ketuk <strong className="text-[#2D3748] dark:text-slate-100">Izinkan</strong>{' '}
          agar pengingat browser, jadwal kuliah, deadline, dan notifikasi WhatsApp otomatis
          langsung disetujui dan aktif.
        </p>

        <div className="mt-3 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 p-3 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Jika tidak diizinkan, seluruh notifikasi pengingat otomatis tidak akan bekerja.
          </span>
        </div>

        <div className="mt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onDeny}
            disabled={busy}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-60"
          >
            Tidak Izinkan
          </button>
          <button
            type="button"
            onClick={onAllow}
            disabled={busy}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl text-sm font-bold bg-[#2D3748] hover:bg-[#1E293B] dark:bg-violet-600 dark:hover:bg-violet-500 text-white transition-all cursor-pointer disabled:opacity-60"
          >
            {busy ? 'Memproses...' : 'Izinkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
