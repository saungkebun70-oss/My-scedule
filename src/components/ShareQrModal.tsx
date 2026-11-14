import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react';

export const DEFAULT_VERCEL_APP_URL = 'https://my-scedule.vercel.app';

interface ShareQrModalProps {
  open: boolean;
  onClose: () => void;
}

type ShareTargetMode = 'default' | 'register';

export default function ShareQrModal({ open, onClose }: ShareQrModalProps) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_VERCEL_APP_URL);
  const [targetMode, setTargetMode] = useState<ShareTargetMode>('register');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);

  const normalizedBaseUrl = (() => {
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return DEFAULT_VERCEL_APP_URL;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  })();

  const shareUrl =
    targetMode === 'register'
      ? `${normalizedBaseUrl}/?auth=daftar`
      : normalizedBaseUrl;

  useEffect(() => {
    if (!open) return;
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 512,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#1E293B',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [open, shareUrl]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const width = 720;
      const height = 880;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Soft pastel card background
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, width, height);

      // White inner card
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(40, 40, width - 80, height - 80, 36);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Title
      ctx.fillStyle = '#2D3748';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('My Schedule', width / 2, 110);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 20px sans-serif';
      ctx.fillText('Scan QR untuk Login / Daftar Akun', width / 2, 146);

      // QR Code image
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, shareUrl, {
        width: 500,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#1E293B',
          light: '#FFFFFF',
        },
      });
      ctx.drawImage(qrCanvas, (width - 500) / 2, 185, 500, 500);

      // URL pill footer
      ctx.fillStyle = '#F5F0FC';
      ctx.beginPath();
      ctx.roundRect(80, 715, width - 160, 62, 18);
      ctx.fill();

      ctx.fillStyle = '#5B21B6';
      ctx.font = 'bold 21px sans-serif';
      const displayUrl =
        shareUrl.length > 44 ? `${shareUrl.slice(0, 41)}...` : shareUrl;
      ctx.fillText(displayUrl, width / 2, 754);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = 'qr-my-schedule-vercel.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    const shareText =
      'Yuk atur jadwal kuliah & tugas harian pakai My Schedule! Buka link ini lalu masuk atau daftar akun barumu:';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'My Schedule — Academic & Daily Planner',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or Web Share unsupported -> fallback to WhatsApp
      }
    }
    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(
      `${shareText}\n${shareUrl}`
    )}`;
    window.open(waShareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3748]/45 dark:bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-qr-title"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-[0_24px_60px_rgba(45,55,72,0.2)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#E8DFF5] dark:bg-violet-950/80 text-[#5B21B6] dark:text-violet-300 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="share-qr-title"
                className="text-lg font-extrabold text-[#2D3748] dark:text-slate-100 font-display"
              >
                QR Link App Vercel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bagikan aplikasi ke teman atau perangkat lain
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog QR"
            className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Landing Mode Selector */}
        <div className="mt-4">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            Tujuan saat pengguna baru scan QR:
          </p>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setTargetMode('register')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                targetMode === 'register'
                  ? 'bg-white text-[#5B21B6] shadow-sm dark:bg-slate-700 dark:text-violet-200'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Langsung Daftar Baru
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('default')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                targetMode === 'default'
                  ? 'bg-white text-[#2D3748] shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Halaman Masuk
            </button>
          </div>
        </div>

        {/* Scannable White QR Frame */}
        <div className="mt-4 flex flex-col items-center">
          <div className="p-4 rounded-3xl bg-white border-2 border-slate-200/80 shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code untuk ${shareUrl}`}
                className="w-56 h-56 sm:w-60 sm:h-60 object-contain rounded-xl"
              />
            ) : (
              <div className="w-56 h-56 sm:w-60 sm:h-60 rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400 font-semibold">
                Membuat QR Code...
              </div>
            )}
          </div>

          <p className="mt-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center">
            Arahkan kamera HP atau Google Lens ke QR di atas
          </p>
        </div>

        {/* URL Display & Optional Edit */}
        <div className="mt-4 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Link Vercel Aplikasi
            </span>
            <button
              type="button"
              onClick={() => setEditingUrl((prev) => !prev)}
              className="text-[11px] font-bold text-[#5B21B6] dark:text-violet-300 hover:underline cursor-pointer"
            >
              {editingUrl ? 'Selesai' : 'Ubah domain'}
            </button>
          </div>

          {editingUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={DEFAULT_VERCEL_APP_URL}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#2D3748] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40"
              />
              <button
                type="button"
                onClick={() => setBaseUrl(DEFAULT_VERCEL_APP_URL)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-bold text-[#5B21B6] dark:text-violet-300 truncate">
                {shareUrl}
              </code>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                title="Buka link di tab baru"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#5B21B6] dark:hover:text-violet-300 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Security & Onboarding Info */}
        <div className="mt-3 rounded-2xl bg-[#F1F8F6] dark:bg-emerald-950/40 border border-[#B7E1D5] dark:border-emerald-800/70 p-3 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#065F46] dark:text-emerald-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#065F46] dark:text-emerald-200 leading-relaxed font-medium">
            Pengguna baru yang membuka link akan otomatis diarahkan ke halaman{' '}
            <strong>Masuk / Daftar Baru</strong> terlebih dahulu dengan ruang data pribadi yang terisolasi per akun.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[42px] px-3 py-2 rounded-2xl bg-[#FAF9F6] hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#2D3748] dark:text-slate-100 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={downloading}
            className="min-h-[42px] px-3 py-2 rounded-2xl bg-[#E8DFF5] hover:bg-[#DDD0F2] dark:bg-violet-950/80 dark:hover:bg-violet-900/80 text-xs font-bold text-[#4C1D95] dark:text-violet-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Menyimpan...' : 'Unduh QR'}</span>
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            className="min-h-[42px] px-3 py-2 rounded-2xl bg-[#2D3748] hover:bg-[#1E293B] dark:bg-violet-600 dark:hover:bg-violet-500 text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
