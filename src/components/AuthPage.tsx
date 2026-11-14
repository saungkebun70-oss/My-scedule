import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  CalendarHeart,
  Check,
  Cloud,
  Copy,
  ExternalLink,
  HardDrive,
  Lock,
  Mail,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  auth,
  firebaseProjectId,
  googleProvider,
  isFirebaseConfigured,
} from '../lib/firebase';

interface AuthPageProps {
  onEnterLocalMode: (name?: string) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export default function AuthPage({
  onEnterLocalMode,
  isModal = false,
  onClose,
}: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentDomain =
    typeof window !== 'undefined' ? window.location.hostname : '';

  const mapFirebaseAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    setIsUnauthorizedDomain(code === 'auth/unauthorized-domain');

    switch (code) {
      case 'auth/unauthorized-domain':
        return `Domain "${currentDomain}" belum didaftarkan di Firebase Authentication (Authorized domains).`;
      case 'auth/popup-closed-by-user':
        return 'Jendela login Google ditutup sebelum selesai. Silakan coba lagi.';
      case 'auth/popup-blocked':
        return 'Popup diblokir browser. Izinkan popup atau gunakan login Email/Password.';
      case 'auth/cancelled-popup-request':
        return 'Permintaan login sebelumnya dibatalkan. Silakan tekan tombol masuk sekali lagi.';
      case 'auth/operation-not-allowed':
        return 'Login Email/Password belum diaktifkan di Firebase Console (Authentication → Sign-in method → aktifkan Email/Password). Anda tetap bisa menggunakan Google Sign-In atau Mode Lokal.';
      case 'auth/email-already-in-use':
        return 'Email ini sudah terdaftar. Silakan masuk menggunakan tab Masuk.';
      case 'auth/weak-password':
        return 'Kata sandi minimal 6 karakter agar akun aman.';
      case 'auth/invalid-email':
        return 'Format alamat email tidak valid.';
      case 'auth/network-request-failed':
        return 'Koneksi internet bermasalah. Periksa jaringan Anda lalu coba lagi.';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Email atau kata sandi belum cocok. Periksa kembali ya!';
      default:
        return err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk.';
    }
  };

  const handleCopyDomain = async () => {
    if (!currentDomain) return;
    try {
      await navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      window.setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) {
      onEnterLocalMode();
      onClose?.();
      return;
    }
    setErrorMsg(null);
    setIsUnauthorizedDomain(false);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose?.();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      onEnterLocalMode(name.trim() || email.split('@')[0] || 'Mahasiswa');
      onClose?.();
      return;
    }
    setErrorMsg(null);
    setIsUnauthorizedDomain(false);
    setLoading(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onClose?.();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const consoleAuthUrl = firebaseProjectId
    ? `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`
    : 'https://console.firebase.google.com/';

  const authCard = (
    <div className="w-full rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-[0_20px_50px_rgba(45,55,72,0.14)] flex flex-col justify-center">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2D3748] font-display">
            {mode === 'login' ? 'Sinkronisasi Cloud' : 'Buat Akun Planner'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login'
              ? 'Masuk agar jadwalmu tersimpan & sinkron realtime di semua perangkat.'
              : 'Daftar gratis untuk sinkronisasi cloud antar HP dan laptop.'}
          </p>
        </div>
        {isModal && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup dialog login"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11 h-11 rounded-2xl bg-[#FCE1E4] text-[#9D174D] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="mt-5 grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setErrorMsg(null);
            setIsUnauthorizedDomain(false);
          }}
          className={`min-h-[42px] rounded-xl text-sm font-bold transition-all cursor-pointer ${
            mode === 'login'
              ? 'bg-white text-[#2D3748] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Masuk
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setErrorMsg(null);
            setIsUnauthorizedDomain(false);
          }}
          className={`min-h-[42px] rounded-xl text-sm font-bold transition-all cursor-pointer ${
            mode === 'register'
              ? 'bg-white text-[#2D3748] shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Daftar Baru
        </button>
      </div>

      {isFirebaseConfigured ? (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-5 w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#2D3748] hover:bg-[#1E293B] text-white font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12z"
              />
              <path
                fill="#34A853"
                d="M3.6 7.5l3.2 2.3C7.7 7.7 9.7 6.3 12 6.3c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 8.3 2.5 5.1 4.6 3.6 7.5z"
              />
              <path
                fill="#FBBC05"
                d="M12 21.5c2.5 0 4.6-.8 6.1-2.2l-2.9-2.4c-.8.6-1.9 1-3.2 1-2.6 0-4.8-1.7-5.6-4.1l-3.2 2.5C4.7 19.3 8.1 21.5 12 21.5z"
              />
              <path
                fill="#4285F4"
                d="M21.1 14.2c0-.5-.1-.9-.1-1.3H12v3.9h5.4c-.3 1.4-1.1 2.4-2.2 3.1l2.9 2.4c1.7-1.6 3-4.1 3-8.1z"
              />
            </svg>
            <span>Masuk dengan Google (Google Sign-In)</span>
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400">atau gunakan email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-2xl bg-[#FFF8E7] border border-[#FDE68A] p-3.5 text-xs text-amber-900">
          Konfigurasi Firebase belum aktif, sehingga aplikasi berjalan otomatis dalam{' '}
          <strong>Mode Lokal (localStorage)</strong>.
        </div>
      )}

      <form onSubmit={handleEmailSubmit} className="space-y-3.5">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Alya Putri"
                className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-slate-200 text-sm text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40 focus:border-[#8B5CF6]"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Alamat Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@mahasiswa.ac.id"
              className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-slate-200 text-sm text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40 focus:border-[#8B5CF6]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Kata Sandi
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-slate-200 text-sm text-[#2D3748] focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/40 focus:border-[#8B5CF6]"
            />
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl bg-[#FFF3F5] border border-[#FBCFE8] px-4 py-3 text-xs text-[#9D174D] leading-relaxed font-semibold space-y-2.5"
          >
            <p>{errorMsg}</p>

            {isUnauthorizedDomain && currentDomain && (
              <div className="pt-1 space-y-2 text-[11px] text-slate-700 font-medium">
                <p>
                  Buka <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>, lalu tambahkan domain berikut:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="px-2.5 py-1 rounded-lg bg-white border border-[#FBCFE8] text-[#9D174D] font-bold">
                    {currentDomain}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    {copiedDomain ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Domain</span>
                      </>
                    )}
                  </button>
                  <a
                    href={consoleAuthUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D3748] text-white font-bold hover:bg-[#1E293B]"
                  >
                    <span>Buka Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#E8DFF5] hover:bg-[#DDD0F2] text-[#4C1D95] font-bold text-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
        >
          {loading
            ? 'Memproses...'
            : mode === 'login'
            ? 'Masuk ke My Schedule'
            : 'Daftar & Mulai Merencanakan'}
        </button>
      </form>

      {!isModal && (
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => onEnterLocalMode(name.trim() || undefined)}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-[#2D3748] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Masuk Otomatis Tanpa Akun (Mode Lokal)</span>
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3748]/40 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md max-h-[92vh] overflow-y-auto">{authCard}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 p-8 sm:p-10 shadow-[0_8px_32px_rgba(45,55,72,0.05)] flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#E8DFF5] text-[#5B21B6] text-xs font-bold">
              <CalendarHeart className="w-4 h-4" />
              <span>Academic &amp; Daily Student Planner</span>
            </div>

            <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2D3748] font-display text-balance">
              My Schedule
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-md">
              Atur jadwal kuliah, rutinitas harian, acara kampus, serta rapat &amp; deadline tugas dalam satu tempat yang rapi dan sinkron di semua perangkat.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {isFirebaseConfigured ? (
                <>
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  <span>Cloud Firestore Siap</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  <span>Mode Penyimpanan Lokal</span>
                </>
              )}
            </span>
            <span>Auto-seed 14 jadwal awal</span>
          </div>
        </div>

        <div className="lg:col-span-6">{authCard}</div>
      </div>
    </div>
  );
}
