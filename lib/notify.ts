import "server-only";

/**
 * Envío de WhatsApp configurable por variables de entorno.
 * Si no hay credenciales, NO rompe nada: regresa {ok:false} y la app sigue igual.
 *
 * Variables (.env.local y en Vercel):
 *   WHATSAPP_PROVIDER=twilio            (o "meta")
 *   WHATSAPP_NOTIFY_TO=+5219831234567   (uno o varios separados por coma; MX con el 1 después del 52)
 *   # Twilio:
 *   TWILIO_ACCOUNT_SID=ACxxxx
 *   TWILIO_AUTH_TOKEN=xxxx
 *   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (número del sandbox, o el de producción)
 *   # Meta (opcional, producción):
 *   META_WA_TOKEN=xxxx
 *   META_WA_PHONE_ID=xxxx
 */
export async function sendWhatsApp(text: string): Promise<{ ok: boolean; error?: string }> {
  const to = (process.env.WHATSAPP_NOTIFY_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (to.length === 0) return { ok: false, error: "WHATSAPP_NOTIFY_TO no configurado" };
  const provider = process.env.WHATSAPP_PROVIDER ?? "twilio";
  try {
    if (provider === "twilio") return await viaTwilio(text, to);
    if (provider === "meta") return await viaMeta(text, to);
    return { ok: false, error: "Proveedor no soportado: " + provider };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function viaTwilio(text: string, to: string[]): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return { ok: false, error: "Faltan credenciales de Twilio" };
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  for (const n of to) {
    const body = new URLSearchParams({ From: from, To: `whatsapp:${n}`, Body: text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return { ok: false, error: `Twilio ${res.status}: ${(await res.text()).slice(0, 250)}` };
  }
  return { ok: true };
}

async function viaMeta(text: string, to: string[]): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.META_WA_TOKEN;
  const phoneId = process.env.META_WA_PHONE_ID;
  if (!token || !phoneId) return { ok: false, error: "Faltan credenciales de Meta" };
  for (const n of to) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: n.replace(/^\+/, ""), type: "text", text: { body: text } }),
    });
    if (!res.ok) return { ok: false, error: `Meta ${res.status}: ${(await res.text()).slice(0, 250)}` };
  }
  return { ok: true };
}