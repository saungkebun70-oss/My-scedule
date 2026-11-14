import { CATEGORY_META, type ScheduleItem } from '../types/schedule';
import { formatIndonesianDate } from './dateUtils';

export type WhatsAppProvider = 'link' | 'fonnte' | 'callmebot' | 'webhook';

export interface WhatsAppSettings {
  phone: string;
  autoEnabled: boolean;
  provider: WhatsAppProvider;
  apiKey: string;
  webhookUrl: string;
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

export async function sendAutomatedWhatsAppWebhook(
  settings: WhatsAppSettings,
  message: string
): Promise<{ ok: boolean; detail?: string }> {
  const phone = normalizeWhatsAppNumber(settings.phone);
  if (!phone) {
    return { ok: false, detail: 'Nomor WhatsApp belum diisi.' };
  }

  try {
    if (settings.provider === 'fonnte') {
      if (!settings.apiKey.trim()) {
        return { ok: false, detail: 'Token Fonnte belum diisi.' };
      }
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
      return { ok: res.ok, detail: res.ok ? 'Terkirim via Fonnte' : `HTTP ${res.status}` };
    }

    if (settings.provider === 'callmebot') {
      if (!settings.apiKey.trim()) {
        return { ok: false, detail: 'API Key CallMeBot belum diisi.' };
      }
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        phone
      )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(
        settings.apiKey.trim()
      )}`;
      await fetch(url, { mode: 'no-cors' });
      return { ok: true, detail: 'Dikirim ke CallMeBot' };
    }

    if (settings.provider === 'webhook') {
      if (!settings.webhookUrl.trim()) {
        return { ok: false, detail: 'URL Webhook belum diisi.' };
      }
      const res = await fetch(settings.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          message,
          sentAt: new Date().toISOString(),
        }),
      });
      return { ok: res.ok, detail: res.ok ? 'Terkirim via Webhook' : `HTTP ${res.status}` };
    }

    return { ok: false, detail: 'Mode manual WhatsApp link aktif.' };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : 'Gagal mengirim ke gateway WhatsApp.',
    };
  }
}
