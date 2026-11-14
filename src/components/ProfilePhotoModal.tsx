import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Sparkles, Trash2, X } from 'lucide-react';
import { compressImageToBase64 } from '../utils/dateUtils';
import UserAvatar from './UserAvatar';

interface ProfilePhotoModalProps {
  open: boolean;
  currentPhoto: string;
  studentName: string;
  onSavePhoto: (photoBase64: string) => Promise<void>;
  onClose: () => void;
}

function makeAvatarSvg(bg: string, accent: string, hair: string, cheek: string, accessory: 'glasses' | 'star' | 'bow' | 'leaf' | 'headphones' | 'cap'): string {
  let extra = '';
  if (accessory === 'glasses') {
    extra = `<circle cx="48" cy="60" r="8" fill="none" stroke="${accent}" stroke-width="2.5"/><circle cx="72" cy="60" r="8" fill="none" stroke="${accent}" stroke-width="2.5"/><path d="M56 60h8" stroke="${accent}" stroke-width="2.5"/>`;
  } else if (accessory === 'star') {
    extra = `<path d="M88 26l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" fill="${accent}"/>`;
  } else if (accessory === 'bow') {
    extra = `<path d="M48 34c-6-4-11 2-8 7 3 4 8 0 8-7zm24 0c6-4 11 2 8 7-3 4-8 0-8-7z" fill="${accent}"/><circle cx="60" cy="37" r="4" fill="${accent}"/>`;
  } else if (accessory === 'leaf') {
    extra = `<path d="M60 28c0-9 10-14 16-10-1 8-7 13-16 10z" fill="${accent}"/>`;
  } else if (accessory === 'headphones') {
    extra = `<path d="M32 60a28 28 0 0 1 56 0" fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round"/><rect x="27" y="54" width="8" height="16" rx="4" fill="${accent}"/><rect x="85" y="54" width="8" height="16" rx="4" fill="${accent}"/>`;
  } else if (accessory === 'cap') {
    extra = `<path d="M34 42l26-11 26 11-26 10z" fill="${accent}"/><rect x="44" y="45" width="32" height="6" rx="3" fill="${accent}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="${bg}"/><circle cx="60" cy="108" r="34" fill="${accent}" opacity="0.22"/><circle cx="60" cy="60" r="24" fill="#FFFDF9"/><path d="M36 58c0-15 11-25 24-25s24 10 24 25c-4-7-12-11-24-11s-20 4-24 11z" fill="${hair}"/><circle cx="50" cy="60" r="2.7" fill="#2D3748"/><circle cx="70" cy="60" r="2.7" fill="#2D3748"/><circle cx="44" cy="66" r="3.6" fill="${cheek}" opacity="0.55"/><circle cx="76" cy="66" r="3.6" fill="${cheek}" opacity="0.55"/><path d="M54 68c2 3 10 3 12 0" fill="none" stroke="#2D3748" stroke-width="2.5" stroke-linecap="round"/>${extra}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PRESET_AVATARS = [
  {
    id: 'scholar',
    label: 'Kacamata',
    src: makeAvatarSvg('#E8DFF5', '#7C3AED', '#4C1D95', '#F472B6', 'glasses'),
  },
  {
    id: 'music',
    label: 'Fokus',
    src: makeAvatarSvg('#DAEAF6', '#2563EB', '#1E3A8A', '#FB7185', 'headphones'),
  },
  {
    id: 'grad',
    label: 'Kampus',
    src: makeAvatarSvg('#E2ECE9', '#059669', '#064E3B', '#F472B6', 'cap'),
  },
  {
    id: 'star',
    label: 'Ceria',
    src: makeAvatarSvg('#FFF8E7', '#D97706', '#78350F', '#F472B6', 'star'),
  },
  {
    id: 'bow',
    label: 'Pastel',
    src: makeAvatarSvg('#FCE1E4', '#DB2777', '#831843', '#FB7185', 'bow'),
  },
  {
    id: 'leaf',
    label: 'Segar',
    src: makeAvatarSvg('#ECFDF5', '#10B981', '#065F46', '#F472B6', 'leaf'),
  },
];

export default function ProfilePhotoModal({
  open,
  currentPhoto,
  studentName,
  onSavePhoto,
  onClose,
}: ProfilePhotoModalProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [draftPhoto, setDraftPhoto] = useState(currentPhoto);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftPhoto(currentPhoto);
      setErrorMsg(null);
    }
  }, [open, currentPhoto]);

  if (!open) return null;

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setProcessing(true);
    try {
      const compressed = await compressImageToBase64(file, 320, 0.78);
      if (compressed.length > 148000) {
        setErrorMsg('Ukuran foto terlalu besar. Coba pilih foto lain ya.');
        return;
      }
      setDraftPhoto(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses foto.');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      await onSavePhoto(draftPhoto);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan foto profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D3748]/45 dark:bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-photo-title"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-[0_24px_60px_rgba(45,55,72,0.2)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="profile-photo-title"
              className="text-lg font-extrabold text-[#2D3748] dark:text-slate-100 font-display"
            >
              Atur Foto Profil
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unggah fotomu atau pilih avatar pastel yang imut
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal foto profil"
            className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Large Avatar Preview */}
        <div className="mt-5 flex flex-col items-center">
          <div className="relative p-1.5 rounded-3xl bg-gradient-to-br from-[#E8DFF5] via-[#FCE1E4] to-[#DAEAF6] dark:from-violet-900/70 dark:via-pink-900/60 dark:to-sky-900/70 shadow-sm">
            <UserAvatar
              photoUrl={draftPhoto}
              name={studentName}
              sizeClass="w-28 h-28"
              textClass="text-3xl"
              roundedClass="rounded-[20px]"
            />
          </div>
          <p className="mt-2.5 text-xs font-bold text-[#2D3748] dark:text-slate-200">
            {studentName || 'Mahasiswa'}
          </p>
        </div>

        {/* Upload / Camera Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={processing || saving}
            className="min-h-[44px] px-3 py-2 rounded-2xl bg-[#F5F0FC] hover:bg-[#E8DFF5] dark:bg-violet-950/70 dark:hover:bg-violet-900/70 border border-[#DDD6FE]/70 dark:border-violet-800/70 text-[#5B21B6] dark:text-violet-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <ImagePlus className="w-4 h-4 shrink-0" />
            <span>{processing ? 'Memproses...' : 'Pilih Galeri'}</span>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={processing || saving}
            className="min-h-[44px] px-3 py-2 rounded-2xl bg-[#F0F7FD] hover:bg-[#DAEAF6] dark:bg-sky-950/70 dark:hover:bg-sky-900/70 border border-[#BFDBFE]/70 dark:border-sky-800/70 text-[#1E40AF] dark:text-sky-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Ambil Kamera</span>
          </button>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFilePick}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFilePick}
            className="hidden"
          />
        </div>

        {/* Preset Pastel Avatars */}
        <div className="mt-5">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED] dark:text-violet-400" />
            <span>Atau Pilih Avatar Instan</span>
          </p>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_AVATARS.map((preset) => {
              const selected = draftPhoto === preset.src;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setDraftPhoto(preset.src);
                  }}
                  title={preset.label}
                  aria-label={`Pilih avatar ${preset.label}`}
                  className={`p-1 rounded-2xl transition-all cursor-pointer ${
                    selected
                      ? 'ring-2 ring-[#7C3AED] bg-[#F5F0FC] dark:bg-violet-950/80 scale-105'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <img
                    src={preset.src}
                    alt={preset.label}
                    className="w-full aspect-square rounded-xl object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {draftPhoto && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setDraftPhoto('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#9D174D] dark:text-pink-300 bg-[#FFF3F5] hover:bg-[#FCE1E4] dark:bg-pink-950/60 dark:hover:bg-pink-900/70 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Foto (Pakai Inisial)</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <p className="mt-3 rounded-xl bg-[#FFF3F5] dark:bg-pink-950/70 border border-[#FBCFE8] dark:border-pink-800/70 px-3 py-2 text-xs font-semibold text-[#9D174D] dark:text-pink-200">
            {errorMsg}
          </p>
        )}

        {/* Footer Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || processing}
            className="min-h-[42px] px-5 py-2 rounded-2xl bg-[#2D3748] hover:bg-[#1E293B] dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Foto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
