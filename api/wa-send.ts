interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

interface WaSendBody {
  provider?: 'server' | 'fonnte' | 'callmebot' | 'webhook';
  phone?: string;
  message?: string;
  apiKey?: string;
  webhookUrl?: string;
}

function getServerEnv(): Record<string, string | undefined> {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env || {};
}

function getConfiguredServerGateway() {
  const env = getServerEnv();
  const fonnteToken = (env.FONNTE_TOKEN || '').trim();
  const cloudToken = (env.WHATSAPP_CLOUD_TOKEN || '').trim();
  const cloudPhoneId = (env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const webhookUrl = (env.WA_WEBHOOK_URL || '').trim();
  const webhookSecret = (env.WA_WEBHOOK_SECRET || '').trim();

  if (fonnteToken) {
    return { type: 'fonnte' as const, token: fonnteToken, label: 'Server Fonnte' };
  }
  if (cloudToken && cloudPhoneId) {
    return {
      type: 'meta_cloud' as const,
      token: cloudToken,
      phoneId: cloudPhoneId,
      label: 'Server WhatsApp Cloud API',
    };
  }
  if (webhookUrl) {
    return {
      type: 'webhook' as const,
      url: webhookUrl,
      secret: webhookSecret,
      label: 'Server Webhook WA',
    };
  }
  return null;
}

async function sendViaFonnte(phone: string, message: string, token: string) {
  const params = new URLSearchParams();
  params.set('target', phone);
  params.set('message', message);

  const upstream = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const rawText = await upstream.text();
  let parsed: { status?: boolean; reason?: string; detail?: string } | null = null;
  try {
    parsed = JSON.parse(rawText) as { status?: boolean; reason?: string; detail?: string };
  } catch {
    // ignore non-json
  }

  if (!upstream.ok || (parsed && parsed.status === false)) {
    return {
      ok: false,
      detail: parsed?.reason || parsed?.detail || `Fonnte error (HTTP ${upstream.status})`,
    };
  }

  return { ok: true, detail: 'Pesan WhatsApp terkirim otomatis via Server Aplikasi' };
}

async function sendViaWebhook(
  phone: string,
  message: string,
  webhookUrl: string,
  secret?: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) {
    headers['x-webhook-secret'] = secret;
  }

  const upstream = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      phone,
      message,
      sentAt: new Date().toISOString(),
    }),
  });

  if (!upstream.ok) {
    return {
      ok: false,
      detail: `Webhook mengembalikan HTTP ${upstream.status}`,
    };
  }

  return { ok: true, detail: 'Pesan WhatsApp terkirim otomatis via Server Webhook' };
}

async function sendViaMetaCloud(
  phone: string,
  message: string,
  token: string,
  phoneNumberId: string
) {
  const upstream = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    }
  );

  if (!upstream.ok) {
    const text = await upstream.text();
    return {
      ok: false,
      detail: `WhatsApp Cloud API error (HTTP ${upstream.status}): ${text.slice(0, 120)}`,
    };
  }

  return { ok: true, detail: 'Pesan WhatsApp terkirim via WhatsApp Cloud API' };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET') {
    const gateway = getConfiguredServerGateway();
    res.status(200).json({
      ok: true,
      serverGatewayConfigured: Boolean(gateway),
      providerLabel: gateway?.label || null,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, detail: 'Method not allowed' });
    return;
  }

  let body: WaSendBody = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body) as WaSendBody;
    } catch {
      res.status(400).json({ ok: false, detail: 'Payload JSON tidak valid.' });
      return;
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body as WaSendBody;
  }

  const provider = body.provider || 'server';
  const phone = (body.phone || '').replace(/\D/g, '');
  const message = (body.message || '').trim();
  const apiKey = (body.apiKey || '').trim();
  const webhookUrl = (body.webhookUrl || '').trim();

  if (!phone) {
    res.status(400).json({ ok: false, detail: 'Nomor WhatsApp belum diisi.' });
    return;
  }

  if (!message) {
    res.status(400).json({ ok: false, detail: 'Isi pesan WhatsApp kosong.' });
    return;
  }

  try {
    if (provider === 'server') {
      const gateway = getConfiguredServerGateway();
      if (!gateway) {
        res.status(503).json({
          ok: false,
          code: 'SERVER_GATEWAY_NOT_CONFIGURED',
          detail:
            'Gateway WA terpusat belum aktif di server. Admin cukup mengisi 1 token (FONNTE_TOKEN atau WA_WEBHOOK_URL) di Environment Variables Vercel agar semua pengguna baru otomatis menerima WA.',
        });
        return;
      }

      const result =
        gateway.type === 'fonnte'
          ? await sendViaFonnte(phone, message, gateway.token)
          : gateway.type === 'meta_cloud'
          ? await sendViaMetaCloud(phone, message, gateway.token, gateway.phoneId)
          : await sendViaWebhook(phone, message, gateway.url, gateway.secret);

      res.status(result.ok ? 200 : 400).json(result);
      return;
    }

    if (provider === 'callmebot') {
      if (!apiKey) {
        res.status(400).json({ ok: false, detail: 'API Key CallMeBot belum diisi.' });
        return;
      }

      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        phone
      )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;

      const upstream = await fetch(url, { method: 'GET' });
      const text = await upstream.text();
      const lower = text.toLowerCase();

      if (
        !upstream.ok ||
        lower.includes('error') ||
        lower.includes('invalid') ||
        lower.includes('not registered') ||
        lower.includes('wrong')
      ) {
        const cleanDetail = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        res.status(400).json({
          ok: false,
          detail: cleanDetail || `CallMeBot menolak permintaan (HTTP ${upstream.status}).`,
        });
        return;
      }

      res.status(200).json({ ok: true, detail: 'Pesan WhatsApp terkirim via CallMeBot' });
      return;
    }

    if (provider === 'fonnte') {
      if (!apiKey) {
        res.status(400).json({ ok: false, detail: 'Token Fonnte belum diisi.' });
        return;
      }
      const result = await sendViaFonnte(phone, message, apiKey);
      res.status(result.ok ? 200 : 400).json(result);
      return;
    }

    if (provider === 'webhook') {
      if (!webhookUrl) {
        res.status(400).json({ ok: false, detail: 'URL Webhook belum diisi.' });
        return;
      }
      const result = await sendViaWebhook(phone, message, webhookUrl);
      res.status(result.ok ? 200 : 400).json(result);
      return;
    }

    res.status(400).json({ ok: false, detail: 'Metode pengiriman WhatsApp tidak valid.' });
  } catch (err) {
    res.status(500).json({
      ok: false,
      detail: err instanceof Error ? err.message : 'Gagal menghubungi server WhatsApp.',
    });
  }
}
