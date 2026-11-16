import { CATEGORY_META, type ScheduleItem } from '../types/schedule';
import { formatIndonesianDate, getDeadlineCountdown } from './dateUtils';

export type WhatsAppProvider = 'server' | 'link' | 'fonnte' | 'callmebot' | 'webhook';

export interface WhatsAppSettings {
  phone: string;
  autoEnabled: boolean;
  provider: WhatsAppProvider;
  apiKey: string;
  webhookUrl: string;
  dailyEnabled: boolean;
  dailyTime: string;
  exactStartAlert: boolean;
}

export interface ServerWaGatewayStatus {
  checked: boolean;
  configured: boolean;
  providerLabel: string | null;
}

export const CALLMEBOT_ACTIVATION_URL =
  'https://wa.me/34644263377?text=I%20allow%20callmebot%20to%20send%20me%20messages';
export const CALLMEBOT_GUIDE_URL =
  'https://www.callmebot.com/blog/free-api-whatsapp-messages/';

const CUSTOM_WA_TIME_STORAGE_KEY = 'my_schedule_wa_custom_times';
const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function getCustomWaStorageKey(userId?: string | null): string | null {
  if (!userId) return null;
  return `${CUSTOM_WA_TIME_STORAGE_KEY}_${userId}`;
}

export function isValidTimeHHMM(value: string): boolean {
  return TIME_HHMM_REGEX.test(value.trim());
}

export function loadCustomWaReminderMap(userId?: string | null): Record<string, string> {
  const key = getCustomWaStorageKey(userId);
  if (!key) return {};

  try {
    let raw = localStorage.getItem(key);
    if (!raw) {
      const legacy = localStorage.getItem(CUSTOM_WA_TIME_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(CUSTOM_WA_TIME_STORAGE_KEY);
        raw = legacy;
      }
    }
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Record<string, string> = {};
    for (const [entryKey, val] of Object.entries(parsed)) {
      if (typeof val === 'string' && isValidTimeHHMM(val)) {
        clean[entryKey] = val.trim();
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function getCustomWaReminderTime(
  scheduleId: string,
  userId?: string | null
): string {
  if (!scheduleId || !userId) return '';
  const map = loadCustomWaReminderMap(userId);
  return map[scheduleId] || '';
}

export function setCustomWaReminderTime(
  scheduleId: string,
  timeHHMM: string,
  userId?: string | null
): void {
  const key = getCustomWaStorageKey(userId);
  if (!scheduleId || !key) return;
  try {
    const map = loadCustomWaReminderMap(userId);
    const trimmed = timeHHMM.trim();
    if (isValidTimeHHMM(trimmed)) {
      map[scheduleId] = trimmed;
    } else {
      delete map[scheduleId];
    }
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export function removeCustomWaReminderTime(
  scheduleId: string,
  userId?: string | null
): void {
  const key = getCustomWaStorageKey(userId);
  if (!scheduleId || !key) return;
  try {
    const map = loadCustomWaReminderMap(userId);
    if (scheduleId in map) {
      delete map[scheduleId];
      localStorage.setItem(key, JSON.stringify(map));
    }
  } catch {
    // ignore
  }
}

export function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('8')) {
    return `62${digits}`;
  }
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const normalized = normalizeWhatsAppNumber(phone);
  const encoded = encodeURIComponent(message);
  return normalized
    ? `https://wa.me/${normalized}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export function buildSingleScheduleWhatsAppMessage(
  item: ScheduleItem,
  studentName?: string
): string {
  const meta = CATEGORY_META[item.category];
  const formattedDate = formatIndonesianDate(item.date, true);
  const timeRange = item.endTime ? `${item.startTime} – ${item.endTime}` : item.startTime;
  const lines: string[] = [
    studentName
      ? `*My Schedule — Pengingat (${studentName})*`
      : '*My Schedule — Pengingat Jadwal*',
    '',
    `📌 *${item.title}*`,
    `🏷️ Kategori: ${meta.label}`,
    `📅 Tanggal: ${formattedDate}`,
    `⏰ Jam: ${timeRange}`,
  ];

  const place = item.room || item.location;
  if (place) {
    lines.push(`📍 Lokasi/Ruang: ${place}`);
  }
  if (item.category === 'matkul' && item.lecturer) {
    lines.push(`👩‍🏫 Dosen: ${item.lecturer}${item.sks ? ` (${item.sks} SKS)` : ''}`);
  }
  if (item.category === 'rapat_deadline') {
    const countdown = getDeadlineCountdown(item.date, item.startTime, item.completed);
    lines.push(`⏳ Status Waktu: ${countdown.label}`);
  }
  if (item.notes) {
    lines.push(`📝 Catatan: ${item.notes}`);
  }
  lines.push('', '_Dikirim dari My Schedule Planner ✨_');
  return lines.join('\n');
}

export function buildScheduleWhatsAppMessage(
  dateKey: string,
  items: ScheduleItem[],
  studentName?: string
): string {
  const formattedDate = formatIndonesianDate(dateKey, true);
  const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const header = studentName
    ? `*My Schedule — Pengingat Jadwal (${studentName})*\nTanggal: ${formattedDate}`
    : `*My Schedule — Pengingat Jadwal*\nTanggal: ${formattedDate}`;

  if (sorted.length === 0) {
    return `${header}\n\nBelum ada jadwal tercatat pada tanggal ini.`;
  }

  const lines = sorted.map((item, index) => {
    const status = item.completed ? '[Selesai]' : '[Belum]';
    const cat = CATEGORY_META[item.category].shortLabel;
    const time = item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime;
    const place = item.room || item.location;
    return `${index + 1}. ${status} *${item.title}*\n   ${cat} · ${time}${place ? ` · ${place}` : ''}`;
  });

  return `${header}\n\n${lines.join('\n\n')}\n\n_Tetap semangat & jaga konsistensi belajarmu!_`;
}

export function buildReminderWhatsAppMessage(
  title: string,
  body: string,
  studentName?: string
): string {
  const prefix = studentName ? `*My Schedule (${studentName})*` : '*My Schedule*';
  return `${prefix}\n\n*${title}*\n${body}\n\n_Segera persiapkan dirimu ya!_`;
}

export async function fetchServerWaGatewayStatus(): Promise<ServerWaGatewayStatus> {
  try {
    const res = await fetch('/api/wa-send', { method: 'GET' });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = (await res.json()) as {
        serverGatewayConfigured?: boolean;
        providerLabel?: string | null;
      };
      return {
        checked: true,
        configured: Boolean(data.serverGatewayConfigured),
        providerLabel: data.providerLabel || null,
      };
    }
  } catch {
    // ignore when /api/wa-send is not available (e.g., local Vite preview)
  }
  return {
    checked: true,
    configured: false,
    providerLabel: null,
  };
}

export async function sendAutomatedWhatsAppWebhook(
  settings: WhatsAppSettings,
  message: string
): Promise<{ ok: boolean; detail: string; code?: string }> {
  const phone = normalizeWhatsAppNumber(settings.phone);
  if (!phone) {
    return { ok: false, detail: 'Nomor WhatsApp Anda belum diisi.' };
  }

  if (settings.provider === 'link') {
    return { ok: false, detail: 'Mode manual WhatsApp link aktif.' };
  }

  if ((settings.provider === 'callmebot' || settings.provider === 'fonnte') && !settings.apiKey.trim()) {
    return {
      ok: false,
      detail:
        settings.provider === 'callmebot'
          ? 'API Key CallMeBot masih kosong.'
          : 'Token Fonnte masih kosong.',
    };
  }

  if (settings.provider === 'webhook' && !settings.webhookUrl.trim()) {
    return { ok: false, detail: 'URL Webhook WhatsApp masih kosong.' };
  }

  // Always call same-origin serverless /api/wa-send first (handles 'server' mode & avoids CORS)
  try {
    const proxyRes = await fetch('/api/wa-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: settings.provider,
        phone,
        message,
        apiKey: settings.apiKey.trim(),
        webhookUrl: settings.webhookUrl.trim(),
      }),
    });

    const contentType = proxyRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await proxyRes.json()) as {
        ok?: boolean;
        detail?: string;
        code?: string;
      };
      return {
        ok: Boolean(data.ok),
        code: data.code,
        detail:
          data.detail ||
          (data.ok ? 'Pesan WhatsApp berhasil dikirim.' : `Gagal mengirim (HTTP ${proxyRes.status}).`),
      };
    }
  } catch {
    // Fall through if /api/wa-send is unavailable in local dev
  }

  if (settings.provider === 'server') {
    return {
      ok: false,
      code: 'SERVER_GATEWAY_NOT_CONFIGURED',
      detail:
        'Endpoint /api/wa-send belum aktif di environment ini (deploy ke Vercel & isi FONNTE_TOKEN / WA_WEBHOOK_URL).',
    };
  }

  try {
    if (settings.provider === 'fonnte') {
      const formData = new FormData();
      formData.append('target', phone);
      formData.append('message', message);

      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: settings.apiKey.trim(),
        },
        body: formData,
      });

      let parsed: { status?: boolean; reason?: string } | null = null;
      try {
        parsed = (await res.json()) as { status?: boolean; reason?: string };
      } catch {
        // ignore non-json
      }

      if (!res.ok || (parsed && parsed.status === false)) {
        return {
          ok: false,
          detail: parsed?.reason || `Fonnte error (HTTP ${res.status}).`,
        };
      }

      return { ok: true, detail: 'Terkirim via Fonnte' };
    }

    if (settings.provider === 'callmebot') {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        phone
      )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(
        settings.apiKey.trim()
      )}`;
      await fetch(url, { mode: 'no-cors' });
      return { ok: true, detail: 'Permintaan dikirim ke CallMeBot (cek WhatsApp Anda)' };
    }

    if (settings.provider === 'webhook') {
      const res = await fetch(settings.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message,
          sentAt: new Date().toISOString(),
        }),
      });
      return {
        ok: res.ok,
        detail: res.ok ? 'Terkirim via Webhook' : `Webhook HTTP ${res.status}`,
      };
    }

    return { ok: false, detail: 'Metode pengiriman tidak dikenal.' };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : 'Gagal mengirim ke gateway WhatsApp.',
    };
  }
}
