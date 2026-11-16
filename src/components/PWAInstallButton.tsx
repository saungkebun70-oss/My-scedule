import { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#E8DFF5] hover:bg-[#DDD0F2] dark:bg-violet-950/80 dark:hover:bg-violet-900/80 border border-[#DDD6FE] dark:border-violet-800/70 text-[#4C1D95] dark:text-violet-200 text-xs font-bold flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Download className="w-4 h-4 shrink-0" />
          <span className="truncate">Pasang Aplikasi di Perangkat</span>
        </span>
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-white/80 dark:bg-violet-900/80 shrink-0">
          PWA
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#E8DFF5] hover:bg-[#DDD0F2] dark:bg-violet-950/80 dark:hover:bg-violet-900/80 border border-[#DDD6FE] dark:border-violet-800/70 text-[#4C1D95] dark:text-violet-200 text-xs font-bold flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span className="truncate">Pasang di Layar Utama iPhone/iPad</span>
          </span>
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-white/80 dark:bg-violet-900/80 shrink-0">
            iOS
          </span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3748]/45 dark:bg-slate-950/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-pwa-guide-title"
          >
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#E8DFF5] dark:bg-violet-950/80 text-[#5B21B6] dark:text-violet-300 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3
                    id="ios-pwa-guide-title"
                    className="text-base font-extrabold text-[#2D3748] dark:text-slate-100 font-display"
                  >
                    Pasang di iPhone / iPad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Tutup panduan"
                  className="min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="mt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F0FC] dark:bg-violet-950 text-[#5B21B6] dark:text-violet-300 font-extrabold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Ketuk tombol <strong className="inline-flex items-center gap-1">Bagikan <Share className="w-3 h-3 inline" /></strong> di bilah bawah/atas Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F0FC] dark:bg-violet-950 text-[#5B21B6] dark:text-violet-300 font-extrabold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F0FC] dark:bg-violet-950 text-[#5B21B6] dark:text-violet-300 font-extrabold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    Buka ikon <strong>My Schedule</strong> dari Home Screen agar tampil layar penuh &amp; notifikasi iOS aktif.
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[42px] rounded-2xl bg-[#2D3748] hover:bg-[#1E293B] dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 lg:bottom-5 left-4 z-50 inline-flex items-center gap-2 rounded-2xl bg-amber-500 text-white px-3.5 py-2 text-xs font-bold shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Mode Offline — Data lokal tetap tersedia</span>
    </div>
  );
}
