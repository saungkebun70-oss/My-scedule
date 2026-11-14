export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function getGreetingByHour(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

const HARI_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HARI_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const BULAN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatIndonesianDate(dateStr: string, long = true): string {
  const d = parseDateKey(dateStr);
  const dayName = long ? HARI_LONG[d.getDay()] : HARI_SHORT[d.getDay()];
  const monthName = long ? BULAN_LONG[d.getMonth()] : BULAN_SHORT[d.getMonth()];
  return `${dayName}, ${d.getDate()} ${monthName} ${d.getFullYear()}`;
}

export function formatMonthYear(date: Date): string {
  return `${BULAN_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function getMonthCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = addDays(firstDay, -startOffset);

  const lastDay = new Date(year, month + 1, 0);
  const endOffset = (7 - ((lastDay.getDay() + 6) % 7) - 1 + 7) % 7;
  const totalDays = startOffset + lastDay.getDate() + endOffset;
  const cellCount = Math.max(35, totalDays);

  const cells: Date[] = [];
  for (let i = 0; i < cellCount; i++) {
    cells.push(addDays(startDate, i));
  }
  return cells;
}

export function getWeekDays(anchorDate: Date): Date[] {
  const offsetToMonday = (anchorDate.getDay() + 6) % 7;
  const monday = addDays(anchorDate, -offsetToMonday);
  return Array.from({ length: 7 }, (_, idx) => addDays(monday, idx));
}

export interface CountdownInfo {
  label: string;
  tone: 'overdue' | 'today' | 'soon' | 'upcoming' | 'done';
  daysDiff: number;
}

export function getDeadlineCountdown(
  dateStr: string,
  startTime: string,
  completed: boolean,
  now: Date = new Date()
): CountdownInfo {
  if (completed) {
    return { label: 'Selesai', tone: 'done', daysDiff: 999 };
  }

  const todayKey = formatDateKey(now);
  const todayDate = parseDateKey(todayKey);
  const targetDate = parseDateKey(dateStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((targetDate.getTime() - todayDate.getTime()) / msPerDay);

  if (daysDiff < 0) {
    return { label: 'Lewat Batas', tone: 'overdue', daysDiff };
  }

  if (daysDiff === 0) {
    const [hh, mm] = startTime.split(':').map(Number);
    const targetDateTime = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      hh || 23,
      mm || 59
    );
    if (targetDateTime.getTime() < now.getTime()) {
      return { label: 'Lewat Batas', tone: 'overdue', daysDiff };
    }
    return { label: 'Deadline Hari Ini!', tone: 'today', daysDiff: 0 };
  }

  if (daysDiff === 1) {
    return { label: 'H-1 (Besok)', tone: 'soon', daysDiff: 1 };
  }

  if (daysDiff <= 3) {
    return { label: `H-${daysDiff}`, tone: 'soon', daysDiff };
  }

  return { label: `H-${daysDiff}`, tone: 'upcoming', daysDiff };
}

export async function compressImageToBase64(
  file: File,
  maxSize = 320,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        const cropSide = Math.min(img.width, img.height);
        const sx = Math.max(0, Math.round((img.width - cropSide) / 2));
        const sy = Math.max(0, Math.round((img.height - cropSide) / 2));

        const renderAt = (size: number, q: number): string => {
          const target = Math.min(size, cropSide || size);
          const canvas = document.createElement('canvas');
          canvas.width = target;
          canvas.height = target;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas tidak tersedia di browser ini.');
          }

          // White backdrop prevents black artifacts on transparent PNGs when exported as JPEG/WebP
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, target, target);
          ctx.drawImage(img, sx, sy, cropSide, cropSide, 0, 0, target, target);

          let output = canvas.toDataURL('image/webp', q);
          if (!output.startsWith('data:image/webp')) {
            output = canvas.toDataURL('image/jpeg', q);
          }
          return output;
        };

        try {
          let result = renderAt(maxSize, quality);
          if (result.length > 140000) {
            result = renderAt(240, 0.65);
          }
          if (result.length > 140000) {
            result = renderAt(180, 0.55);
          }
          resolve(result);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Gagal memproses gambar.'));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
