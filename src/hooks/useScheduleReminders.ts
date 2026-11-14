import { useCallback, useEffect, useState } from 'react';
import { CATEGORY_META, type ScheduleItem } from '../types/schedule';
import { formatDateKey, parseDateKey } from '../utils/dateUtils';
import {
  buildReminderWhatsAppMessage,
  buildScheduleWhatsAppMessage,
  buildWhatsAppLink,
  sendAutomatedWhatsAppWebhook,
  type WhatsAppSettings,
} from '../utils/whatsappUtils';

const SETTINGS_STORAGE_KEY = 'my_schedule_reminder_settings';
const WA_SETTINGS_STORAGE_KEY = 'my_schedule_whatsapp_settings';
const NOTIFIED_STORAGE_KEY = 'my_schedule_notified_events';

export interface ReminderSettings {
  enabled: boolean;
  leadMinutes: 15 | 30 | 60;
}

export interface InAppReminderAlert {
  id: string;
  title: string;
  body: string;
  waUrl?: string;
  waStatus?: string;
}

export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

function loadSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
      const lead =
        parsed.leadMinutes === 15 || parsed.leadMinutes === 30 || parsed.leadMinutes === 60
          ? parsed.leadMinutes
          : 30;
      return {
        enabled: Boolean(parsed.enabled),
        leadMinutes: lead,
      };
    }
  } catch {
    // ignore
  }
  return { enabled: true, leadMinutes: 30 };
}

function loadWhatsAppSettings(): WhatsAppSettings {
  try {
    const raw = localStorage.getItem(WA_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WhatsAppSettings>;
      return {
        phone: typeof parsed.phone === 'string' ? parsed.phone : '',
        autoEnabled: Boolean(parsed.autoEnabled),
        provider:
          parsed.provider === 'fonnte' ||
          parsed.provider === 'callmebot' ||
          parsed.provider === 'webhook'
            ? parsed.provider
            : 'link',
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
        webhookUrl: typeof parsed.webhookUrl === 'string' ? parsed.webhookUrl : '',
      };
    }
  } catch {
    // ignore
  }
  return {
    phone: '',
    autoEnabled: false,
    provider: 'link',
    apiKey: '',
    webhookUrl: '',
  };
}

function loadNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      return new Set(arr.slice(-200));
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveNotifiedSet(set: Set<string>) {
  try {
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function getPermissionState(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

function fireBrowserNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      tag,
      requireInteraction: false,
    });
  } catch {
    // Ignore if browser/iframe restricts direct Notification constructor
  }
}

export function useScheduleReminders(
  schedules: ScheduleItem[],
  studentName?: string,
  onInAppReminder?: (alert: InAppReminderAlert) => void
) {
  const [settings, setSettings] = useState<ReminderSettings>(() => loadSettings());
  const [waSettings, setWaSettings] = useState<WhatsAppSettings>(() =>
    loadWhatsAppSettings()
  );
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() =>
    getPermissionState()
  );

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(WA_SETTINGS_STORAGE_KEY, JSON.stringify(waSettings));
    } catch {
      // ignore
    }
  }, [waSettings]);

  const updateWhatsAppSettings = useCallback((updates: Partial<WhatsAppSettings>) => {
    setWaSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const requestBrowserPermission = useCallback(async (): Promise<BrowserNotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      const current = getPermissionState();
      setPermission(current);
      return current;
    }
  }, []);

  const toggleReminders = useCallback(async () => {
    if (!settings.enabled) {
      if (permission === 'default') {
        await requestBrowserPermission();
      }
      setSettings((prev) => ({ ...prev, enabled: true }));
    } else {
      setSettings((prev) => ({ ...prev, enabled: false }));
    }
  }, [settings.enabled, permission, requestBrowserPermission]);

  const setLeadMinutes = useCallback((leadMinutes: 15 | 30 | 60) => {
    setSettings((prev) => ({ ...prev, leadMinutes }));
  }, []);

  const sendTestNotification = useCallback(async () => {
    let currentPerm = permission;
    if (currentPerm === 'default') {
      currentPerm = await requestBrowserPermission();
    }

    const title = 'Pengingat My Schedule Aktif';
    const body = `Notifikasi akan muncul ${settings.leadMinutes} menit sebelum jadwal matkul atau deadline dimulai.`;
    const waText = buildReminderWhatsAppMessage(title, body, studentName);
    const waUrl = buildWhatsAppLink(waSettings.phone, waText);

    if (currentPerm === 'granted') {
      fireBrowserNotification(title, body, `test_${Date.now()}`);
    }

    let waStatus: string | undefined;
    if (waSettings.autoEnabled && waSettings.provider !== 'link') {
      const res = await sendAutomatedWhatsAppWebhook(waSettings, waText);
      waStatus = res.detail;
    }

    onInAppReminder?.({
      id: `test_${Date.now()}`,
      title,
      body:
        currentPerm === 'denied'
          ? `${body} (Izin notifikasi OS diblokir browser; pengingat dalam aplikasi & WA tetap tersedia.)`
          : body,
      waUrl,
      waStatus,
    });
  }, [
    permission,
    requestBrowserPermission,
    settings.leadMinutes,
    studentName,
    waSettings,
    onInAppReminder,
  ]);

  const sendDailySummaryToWhatsAppWebhook = useCallback(async (): Promise<{
    ok: boolean;
    detail?: string;
    waUrl: string;
  }> => {
    const todayKey = formatDateKey(new Date());
    const todayItems = schedules.filter((item) => item.date === todayKey);
    const message = buildScheduleWhatsAppMessage(todayKey, todayItems, studentName);
    const waUrl = buildWhatsAppLink(waSettings.phone, message);

    if (waSettings.provider !== 'link') {
      const res = await sendAutomatedWhatsAppWebhook(waSettings, message);
      return { ok: res.ok, detail: res.detail, waUrl };
    }
    return { ok: true, waUrl };
  }, [schedules, studentName, waSettings]);

  useEffect(() => {
    if (!settings.enabled || schedules.length === 0) return;

    const checkUpcoming = async () => {
      const now = new Date();
      const todayKey = formatDateKey(now);
      const notified = loadNotifiedSet();
      let changed = false;

      for (const item of schedules) {
        if (item.completed) continue;
        if (item.date !== todayKey) continue;

        const targetDate = parseDateKey(item.date);
        const [hh, mm] = item.startTime.split(':').map(Number);
        const startDateTime = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          hh || 0,
          mm || 0,
          0
        );

        const diffMs = startDateTime.getTime() - now.getTime();
        const diffMinutes = Math.ceil(diffMs / 60000);

        const isMatkul = item.category === 'matkul';
        const isDeadlineOrMeeting = item.category === 'rapat_deadline';

        const triggerWindow = settings.leadMinutes;
        if (diffMinutes >= -1 && diffMinutes <= triggerWindow) {
          const eventKey = `${item.id}_${item.date}_${item.startTime}_${triggerWindow}`;
          if (notified.has(eventKey)) continue;

          notified.add(eventKey);
          changed = true;

          const metaLabel = CATEGORY_META[item.category].label;
          const timeLabel =
            diffMinutes <= 0
              ? 'dimulai sekarang'
              : `${diffMinutes} menit lagi (${item.startTime})`;

          let title = `Pengingat ${metaLabel}`;
          let body = `${item.title} ${timeLabel}.`;

          if (isMatkul) {
            title = `Kuliah Sebentar Lagi: ${item.title}`;
            body = `Mulai ${timeLabel}${item.room ? ` · Ruang ${item.room}` : ''}.`;
          } else if (isDeadlineOrMeeting) {
            title =
              item.subType === 'rapat'
                ? `Rapat Akan Dimulai: ${item.title}`
                : `Mendekati Deadline: ${item.title}`;
            body = `Batas waktu ${timeLabel}${item.location ? ` · ${item.location}` : ''}.`;
          }

          fireBrowserNotification(title, body, eventKey);

          const waText = buildReminderWhatsAppMessage(title, body, studentName);
          const waUrl = buildWhatsAppLink(waSettings.phone, waText);

          let waStatus: string | undefined;
          if (waSettings.autoEnabled && waSettings.provider !== 'link') {
            const res = await sendAutomatedWhatsAppWebhook(waSettings, waText);
            waStatus = res.detail;
          }

          onInAppReminder?.({
            id: eventKey,
            title,
            body,
            waUrl,
            waStatus,
          });
        }
      }

      if (changed) {
        saveNotifiedSet(notified);
      }
    };

    checkUpcoming();
    const intervalId = window.setInterval(checkUpcoming, 30000);
    return () => window.clearInterval(intervalId);
  }, [
    schedules,
    settings.enabled,
    settings.leadMinutes,
    studentName,
    waSettings,
    onInAppReminder,
  ]);

  return {
    settings,
    waSettings,
    permission,
    toggleReminders,
    setLeadMinutes,
    updateWhatsAppSettings,
    requestBrowserPermission,
    sendTestNotification,
    sendDailySummaryToWhatsAppWebhook,
  };
}
