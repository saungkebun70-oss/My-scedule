import { useCallback, useEffect, useState } from 'react';
import { CATEGORY_META, type ScheduleItem } from '../types/schedule';
import { formatDateKey, parseDateKey } from '../utils/dateUtils';
import {
  buildReminderWhatsAppMessage,
  buildScheduleWhatsAppMessage,
  buildWhatsAppLink,
  fetchServerWaGatewayStatus,
  isValidTimeHHMM,
  loadCustomWaReminderMap,
  sendAutomatedWhatsAppWebhook,
  type ServerWaGatewayStatus,
  type WhatsAppSettings,
} from '../utils/whatsappUtils';

const SETTINGS_STORAGE_KEY = 'my_schedule_reminder_settings';
const WA_SETTINGS_STORAGE_KEY = 'my_schedule_whatsapp_settings';
const NOTIFIED_STORAGE_KEY = 'my_schedule_notified_events';
const CONSENT_STORAGE_KEY = 'my_schedule_notification_consent';

export type NotificationConsent = 'pending' | 'granted' | 'denied';

export interface ReminderSettings {
  enabled: boolean;
  leadMinutes: number;
}

export interface InAppReminderAlert {
  id: string;
  title: string;
  body: string;
  waUrl?: string;
  waStatus?: string;
}

export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

function clampLeadMinutes(val: unknown): number {
  const num = Number(val);
  if (Number.isNaN(num)) return 15;
  return Math.max(0, Math.min(180, Math.round(num)));
}

function getPermissionState(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

function loadConsent(): NotificationConsent {
  const browserPerm = getPermissionState();
  if (browserPerm === 'denied') {
    return 'denied';
  }
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw === 'granted' || raw === 'denied' || raw === 'pending') {
      return raw;
    }
  } catch {
    // ignore
  }
  return 'pending';
}

function loadSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
      return {
        enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : false,
        leadMinutes:
          parsed.leadMinutes !== undefined ? clampLeadMinutes(parsed.leadMinutes) : 15,
      };
    }
  } catch {
    // ignore
  }
  return { enabled: false, leadMinutes: 15 };
}

function loadWhatsAppSettings(): WhatsAppSettings {
  try {
    const raw = localStorage.getItem(WA_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WhatsAppSettings>;
      const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
      let provider: WhatsAppSettings['provider'] =
        parsed.provider === 'server' ||
        parsed.provider === 'fonnte' ||
        parsed.provider === 'callmebot' ||
        parsed.provider === 'webhook' ||
        parsed.provider === 'link'
          ? parsed.provider
          : 'server';

      // Auto-migrate leftover empty personal CallMeBot/Fonnte config to centralized server mode
      if ((provider === 'callmebot' || provider === 'fonnte') && !apiKey.trim()) {
        provider = 'server';
      }

      return {
        phone: typeof parsed.phone === 'string' ? parsed.phone : '',
        autoEnabled: parsed.autoEnabled !== undefined ? Boolean(parsed.autoEnabled) : false,
        provider,
        apiKey,
        webhookUrl: typeof parsed.webhookUrl === 'string' ? parsed.webhookUrl : '',
        dailyEnabled:
          parsed.dailyEnabled !== undefined ? Boolean(parsed.dailyEnabled) : true,
        dailyTime:
          typeof parsed.dailyTime === 'string' && isValidTimeHHMM(parsed.dailyTime)
            ? parsed.dailyTime
            : '07:00',
        exactStartAlert:
          parsed.exactStartAlert !== undefined ? Boolean(parsed.exactStartAlert) : true,
      };
    }
  } catch {
    // ignore
  }
  return {
    phone: '',
    autoEnabled: false,
    provider: 'server',
    apiKey: '',
    webhookUrl: '',
    dailyEnabled: true,
    dailyTime: '07:00',
    exactStartAlert: true,
  };
}

function loadNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      return new Set(arr.slice(-300));
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveNotifiedSet(set: Set<string>) {
  try {
    const arr = Array.from(set).slice(-300);
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

let swRegisterPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegisterPromise) {
    swRegisterPromise = (async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const ready = await Promise.race<ServiceWorkerRegistration | null>([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000)),
        ]);
        return ready;
      } catch {
        return null;
      }
    })();
  }
  return swRegisterPromise;
}

function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [587.33, 880]; // D5 -> A5 gentle chime

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.3);
    });
  } catch {
    // Ignore autoplay restriction errors
  }
}

async function fireBrowserNotification(title: string, body: string, tag: string) {
  playNotificationChime();
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Android Chrome requires ServiceWorkerRegistration.showNotification()
  try {
    const reg = await ensureServiceWorker();
    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, {
        body,
        tag,
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [200, 100, 200],
        renotify: true,
        requireInteraction: false,
      } as NotificationOptions);
      return;
    }
  } catch {
    // Fallback to direct Notification constructor on desktop
  }

  try {
    new Notification(title, {
      body,
      tag,
      icon: '/icon.svg',
      requireInteraction: false,
    });
  } catch {
    // Ignore if browser/iframe restricts direct Notification constructor
  }
}

function buildItemDateTime(dateKey: string, timeHHMM: string): Date {
  const targetDate = parseDateKey(dateKey);
  const [hh, mm] = timeHHMM.split(':').map(Number);
  return new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    hh || 0,
    mm || 0,
    0,
    0
  );
}

function buildScheduleNotificationCopy(
  item: ScheduleItem,
  timingText: string
): { title: string; body: string } {
  const metaLabel = CATEGORY_META[item.category].label;
  let title = `Pengingat ${metaLabel}`;
  let body = `${item.title} ${timingText}.`;

  if (item.category === 'matkul') {
    title = `Kuliah: ${item.title}`;
    body = `${timingText}${item.room ? ` · Ruang ${item.room}` : ''}.`;
  } else if (item.category === 'rapat_deadline') {
    title =
      item.subType === 'rapat'
        ? `Rapat: ${item.title}`
        : `Deadline: ${item.title}`;
    body = `${timingText}${item.location ? ` · ${item.location}` : ''}.`;
  }

  return { title, body };
}

export function useScheduleReminders(
  schedules: ScheduleItem[],
  studentName?: string,
  onInAppReminder?: (alert: InAppReminderAlert) => void
) {
  const [consent, setConsent] = useState<NotificationConsent>(() => loadConsent());
  const [settings, setSettings] = useState<ReminderSettings>(() => loadSettings());
  const [waSettings, setWaSettings] = useState<WhatsAppSettings>(() =>
    loadWhatsAppSettings()
  );
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() =>
    getPermissionState()
  );
  const [serverWaStatus, setServerWaStatus] = useState<ServerWaGatewayStatus>({
    checked: false,
    configured: false,
    providerLabel: null,
  });

  const notificationsAllowed = consent === 'granted' && permission !== 'denied';

  useEffect(() => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, consent);
    } catch {
      // ignore
    }
  }, [consent]);

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

  useEffect(() => {
    void ensureServiceWorker();

    const syncPermission = () => {
      const current = getPermissionState();
      setPermission(current);
      if (current === 'denied') {
        setConsent('denied');
        setSettings((prev) => ({ ...prev, enabled: false }));
        setWaSettings((prev) => ({ ...prev, autoEnabled: false }));
      }
    };

    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchServerWaGatewayStatus().then((status) => {
      if (!active) return;
      setServerWaStatus(status);
      if (status.configured) {
        setWaSettings((prev) => {
          if (
            (prev.provider === 'callmebot' || prev.provider === 'fonnte') &&
            !prev.apiKey.trim()
          ) {
            return { ...prev, provider: 'server' };
          }
          return prev;
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

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

  const grantNotificationConsent = useCallback(async (): Promise<'granted' | 'denied'> => {
    const perm = await requestBrowserPermission();

    if (perm === 'denied') {
      setConsent('denied');
      setSettings((prev) => ({ ...prev, enabled: false }));
      setWaSettings((prev) => ({ ...prev, autoEnabled: false }));
      return 'denied';
    }

    // Automatically approve & activate notification + WA automation settings
    setConsent('granted');
    setSettings((prev) => ({ ...prev, enabled: true }));
    setWaSettings((prev) => ({
      ...prev,
      autoEnabled: prev.provider !== 'link',
      dailyEnabled: true,
      exactStartAlert: true,
    }));
    return 'granted';
  }, [requestBrowserPermission]);

  const denyNotificationConsent = useCallback(() => {
    setConsent('denied');
    setSettings((prev) => ({ ...prev, enabled: false }));
    setWaSettings((prev) => ({ ...prev, autoEnabled: false }));
  }, []);

  const toggleReminders = useCallback(async () => {
    if (!notificationsAllowed || !settings.enabled) {
      await grantNotificationConsent();
    } else {
      setSettings((prev) => ({ ...prev, enabled: false }));
    }
  }, [notificationsAllowed, settings.enabled, grantNotificationConsent]);

  const setLeadMinutes = useCallback((leadMinutes: number) => {
    setSettings((prev) => ({ ...prev, leadMinutes: clampLeadMinutes(leadMinutes) }));
  }, []);

  const sendTestNotification = useCallback(async () => {
    if (!notificationsAllowed) {
      onInAppReminder?.({
        id: `blocked_${Date.now()}`,
        title: 'Notifikasi Belum Diizinkan',
        body: 'Klik tombol Izinkan terlebih dahulu. Tanpa izin, notifikasi tidak akan bekerja.',
      });
      return;
    }

    const title = 'Pengingat My Schedule Aktif';
    const leadCopy =
      settings.leadMinutes === 0
        ? 'tepat pada jam mulai jadwal'
        : `${settings.leadMinutes} menit sebelum jadwal matkul atau deadline dimulai`;
    const body = `Notifikasi akan muncul ${leadCopy}.`;
    const waText = buildReminderWhatsAppMessage(title, body, studentName);
    const waUrl = buildWhatsAppLink(waSettings.phone, waText);

    if (permission === 'granted') {
      await fireBrowserNotification(title, body, `test_${Date.now()}`);
    }

    let waStatus: string | undefined;
    const canSendAutoWa =
      waSettings.autoEnabled &&
      waSettings.phone.trim() &&
      waSettings.provider !== 'link' &&
      (waSettings.provider !== 'server' || serverWaStatus.configured);

    if (canSendAutoWa) {
      const res = await sendAutomatedWhatsAppWebhook(waSettings, waText);
      waStatus = res.detail;
    } else if (waSettings.provider === 'server' && !serverWaStatus.configured) {
      waStatus = 'Notifikasi browser aktif · ketuk tombol di bawah untuk kirim ke WA';
    }

    onInAppReminder?.({
      id: `test_${Date.now()}`,
      title,
      body,
      waUrl,
      waStatus,
    });
  }, [
    notificationsAllowed,
    permission,
    settings.leadMinutes,
    studentName,
    waSettings,
    serverWaStatus.configured,
    onInAppReminder,
  ]);

  const sendTestWhatsAppNow = useCallback(async (): Promise<{
    ok: boolean;
    detail: string;
    waUrl: string;
  }> => {
    if (!notificationsAllowed) {
      return {
        ok: false,
        detail: 'Izin notifikasi belum disetujui. Klik Izinkan terlebih dahulu agar notifikasi bekerja.',
        waUrl: '',
      };
    }

    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const title = 'Uji Koneksi Notifikasi WhatsApp';
    const body = `Notifikasi otomatis My Schedule berhasil terhubung (diuji pukul ${nowTime}).`;
    const waText = buildReminderWhatsAppMessage(title, body, studentName);
    const waUrl = buildWhatsAppLink(waSettings.phone, waText);

    if (waSettings.provider === 'link') {
      return {
        ok: true,
        detail: 'Mode link manual aktif. Pilih server / gateway agar WA terkirim otomatis tanpa klik.',
        waUrl,
      };
    }

    const res = await sendAutomatedWhatsAppWebhook(waSettings, waText);
    return {
      ok: res.ok,
      detail: res.detail,
      waUrl,
    };
  }, [notificationsAllowed, studentName, waSettings]);

  const sendDailySummaryToWhatsAppWebhook = useCallback(async (): Promise<{
    ok: boolean;
    detail?: string;
    waUrl: string;
  }> => {
    if (!notificationsAllowed) {
      return {
        ok: false,
        detail: 'Izin notifikasi belum disetujui. Klik Izinkan terlebih dahulu.',
        waUrl: '',
      };
    }

    const todayKey = formatDateKey(new Date());
    const todayItems = schedules.filter((item) => item.date === todayKey);
    const message = buildScheduleWhatsAppMessage(todayKey, todayItems, studentName);
    const waUrl = buildWhatsAppLink(waSettings.phone, message);

    if (waSettings.provider !== 'link') {
      const res = await sendAutomatedWhatsAppWebhook(waSettings, message);
      return { ok: res.ok, detail: res.detail, waUrl };
    }
    return { ok: true, waUrl };
  }, [notificationsAllowed, schedules, studentName, waSettings]);

  useEffect(() => {
    // Strictly block all automated notifications if permission was not explicitly granted
    if (!notificationsAllowed) return;

    const hasDailyAuto =
      waSettings.dailyEnabled && waSettings.autoEnabled && waSettings.provider !== 'link';
    if (!settings.enabled && !hasDailyAuto) return;

    const dispatchAlert = async (
      eventKey: string,
      title: string,
      body: string,
      waCustomText?: string
    ) => {
      await fireBrowserNotification(title, body, eventKey);
      const waText = waCustomText || buildReminderWhatsAppMessage(title, body, studentName);
      const waUrl = buildWhatsAppLink(waSettings.phone, waText);

      let waStatus: string | undefined;
      const canSendAutoWa =
        waSettings.autoEnabled &&
        waSettings.phone.trim() &&
        waSettings.provider !== 'link' &&
        (waSettings.provider !== 'server' || serverWaStatus.configured);

      if (canSendAutoWa) {
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
    };

    const checkUpcoming = async () => {
      const now = new Date();
      const nowMs = now.getTime();
      const todayKey = formatDateKey(now);
      const notified = loadNotifiedSet();
      const customWaMap = loadCustomWaReminderMap();
      const pendingDispatches: Array<{
        key: string;
        title: string;
        body: string;
        waCustomText?: string;
      }> = [];

      if (settings.enabled) {
        for (const item of schedules) {
          if (item.completed) continue;
          if (item.date !== todayKey) continue;

          const startDateTime = buildItemDateTime(item.date, item.startTime);
          const startMs = startDateTime.getTime();

          // A. Per-schedule custom exact clock time (HH:mm)
          const customTime = customWaMap[item.id];
          if (customTime && isValidTimeHHMM(customTime)) {
            const customTargetMs = buildItemDateTime(item.date, customTime).getTime();
            const customDiff = nowMs - customTargetMs;
            if (customDiff >= 0 && customDiff <= 5 * 60000) {
              const eventKey = `custom_${item.id}_${item.date}_${customTime}`;
              if (!notified.has(eventKey)) {
                notified.add(eventKey);
                const { title, body } = buildScheduleNotificationCopy(
                  item,
                  `pengingat khusus pukul ${customTime} (jadwal mulai ${item.startTime})`
                );
                pendingDispatches.push({ key: eventKey, title, body });
              }
            }
          }

          // B. Standard lead-time reminder (supports 0..180 min)
          const leadMs = settings.leadMinutes * 60000;
          const triggerMs = startMs - leadMs;
          if (nowMs >= triggerMs && nowMs <= startMs + 2 * 60000) {
            const eventKey = `${item.id}_${item.date}_${item.startTime}_${settings.leadMinutes}`;
            if (!notified.has(eventKey)) {
              notified.add(eventKey);
              const remainingMin = Math.max(0, Math.ceil((startMs - nowMs) / 60000));
              const timingText =
                remainingMin <= 0
                  ? `dimulai sekarang (${item.startTime})`
                  : `${remainingMin} menit lagi (${item.startTime})`;
              const { title, body } = buildScheduleNotificationCopy(item, timingText);
              pendingDispatches.push({ key: eventKey, title, body });
            }
          }

          // C. Optional extra exact-start alert (0 min)
          if (waSettings.exactStartAlert && settings.leadMinutes > 0) {
            if (nowMs >= startMs && nowMs <= startMs + 2 * 60000) {
              const eventKey = `exact_${item.id}_${item.date}_${item.startTime}`;
              if (!notified.has(eventKey)) {
                notified.add(eventKey);
                const { title, body } = buildScheduleNotificationCopy(
                  item,
                  `dimulai tepat sekarang (${item.startTime})`
                );
                pendingDispatches.push({ key: eventKey, title, body });
              }
            }
          }
        }
      }

      // 2. Daily scheduled auto-WA summary at user's chosen clock time (HH:mm)
      if (hasDailyAuto && isValidTimeHHMM(waSettings.dailyTime)) {
        const dailyTargetMs = buildItemDateTime(todayKey, waSettings.dailyTime).getTime();
        const dailyDiff = nowMs - dailyTargetMs;
        if (dailyDiff >= 0 && dailyDiff <= 15 * 60000) {
          const eventKey = `daily_${todayKey}_${waSettings.dailyTime}`;
          if (!notified.has(eventKey)) {
            notified.add(eventKey);
            const todayItems = schedules.filter((item) => item.date === todayKey);
            const summaryMessage = buildScheduleWhatsAppMessage(
              todayKey,
              todayItems,
              studentName
            );
            pendingDispatches.push({
              key: eventKey,
              title: `Rekap Jadwal Harian (${waSettings.dailyTime})`,
              body: `Mengirim ringkasan ${todayItems.length} agenda hari ini ke WhatsApp Anda.`,
              waCustomText: summaryMessage,
            });
          }
        }
      }

      if (pendingDispatches.length > 0) {
        saveNotifiedSet(notified);
        for (const dispatch of pendingDispatches) {
          await dispatchAlert(
            dispatch.key,
            dispatch.title,
            dispatch.body,
            dispatch.waCustomText
          );
        }
      }
    };

    checkUpcoming();
    const intervalId = window.setInterval(checkUpcoming, 5000);
    const handleWake = () => {
      if (document.visibilityState === 'visible') {
        void checkUpcoming();
      }
    };
    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
    };
  }, [
    notificationsAllowed,
    schedules,
    settings.enabled,
    settings.leadMinutes,
    studentName,
    waSettings,
    serverWaStatus.configured,
    onInAppReminder,
  ]);

  return {
    consent,
    notificationsAllowed,
    settings,
    waSettings,
    serverWaStatus,
    permission,
    grantNotificationConsent,
    denyNotificationConsent,
    toggleReminders,
    setLeadMinutes,
    updateWhatsAppSettings,
    requestBrowserPermission,
    sendTestNotification,
    sendTestWhatsAppNow,
    sendDailySummaryToWhatsAppWebhook,
  };
}
