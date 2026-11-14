import { useCallback, useEffect, useState } from 'react';
import { CATEGORY_META, type ScheduleItem } from '../types/schedule';
import { formatDateKey, parseDateKey } from '../utils/dateUtils';

const SETTINGS_STORAGE_KEY = 'my_schedule_reminder_settings';
const NOTIFIED_STORAGE_KEY = 'my_schedule_notified_events';

export interface ReminderSettings {
  enabled: boolean;
  leadMinutes: 15 | 30 | 60;
}

export interface InAppReminderAlert {
  id: string;
  title: string;
  body: string;
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
    // ignore storage parse failure
  }
  return { enabled: true, leadMinutes: 30 };
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
  onInAppReminder?: (alert: InAppReminderAlert) => void
) {
  const [settings, setSettings] = useState<ReminderSettings>(() => loadSettings());
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

    if (currentPerm === 'granted') {
      fireBrowserNotification(title, body, `test_${Date.now()}`);
    }
    onInAppReminder?.({
      id: `test_${Date.now()}`,
      title,
      body:
        currentPerm === 'denied'
          ? `${body} (Izin notifikasi OS diblokir browser; pengingat dalam aplikasi tetap aktif.)`
          : body,
    });
  }, [permission, requestBrowserPermission, settings.leadMinutes, onInAppReminder]);

  useEffect(() => {
    if (!settings.enabled || schedules.length === 0) return;

    const checkUpcoming = () => {
      const now = new Date();
      const todayKey = formatDateKey(now);
      const notified = loadNotifiedSet();
      let changed = false;

      for (const item of schedules) {
        if (item.completed) continue;
        // Prioritize Matkul, Rapat & Deadline, and Acara/Harian on Today
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

        // Trigger when within leadMinutes (or 5 min grace just as it starts)
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
          onInAppReminder?.({
            id: eventKey,
            title,
            body,
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
  }, [schedules, settings.enabled, settings.leadMinutes, onInAppReminder]);

  return {
    settings,
    permission,
    toggleReminders,
    setLeadMinutes,
    requestBrowserPermission,
    sendTestNotification,
  };
}
