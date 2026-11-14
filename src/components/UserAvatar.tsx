import { useEffect, useState } from 'react';

interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string | null;
  sizeClass?: string;
  textClass?: string;
  roundedClass?: string;
}

export function getInitials(name?: string | null): string {
  const clean = (name || 'Mahasiswa').trim();
  if (!clean) return 'M';
  return (
    clean
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'M'
  );
}

export default function UserAvatar({
  photoUrl,
  name,
  sizeClass = 'w-12 h-12',
  textClass = 'text-base',
  roundedClass = 'rounded-2xl',
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const trimmed = (photoUrl || '').trim();
  const showImage = Boolean(trimmed) && !hasError;
  const initials = getInitials(name);

  return (
    <div
      className={`${sizeClass} ${roundedClass} overflow-hidden bg-[#E8DFF5] dark:bg-violet-950/80 flex items-center justify-center shrink-0 select-none`}
    >
      {showImage ? (
        <img
          src={trimmed}
          alt={name || 'Foto profil'}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className={`${textClass} font-extrabold text-[#5B21B6] dark:text-violet-300 font-display`}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
