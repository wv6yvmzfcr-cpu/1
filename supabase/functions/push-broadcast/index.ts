// =====================================================================
// بث إشعارات Push — Supabase Edge Function (Deno)
// supabase/functions/push-broadcast/index.ts
//
// المهمة: يرسل إشعاراً لكل الأجهزة المسجّلة (أو لغة معيّنة) عبر خدمة
//         Expo Push. يُستدعى من لوحة التحكم (شاشة "إرسال إشعار").
//
// 🔒 مدير فقط — يستخدم service_role بعد التحقق من الصلاحية.
//
// النشر: supabase functions deploy push-broadcast
// =====================================================================
import { requireAdmin, serviceClient, json, cors } from "../_shared/auth.ts";

const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authz = await requireAdmin(req);
    if (!authz.ok) return authz.response;

    const { title, body, lang } = await req.json();
    if (!title?.trim() || !body?.trim()) return json({ error: "empty" }, 400);

    const admin = serviceClient();
    let q = admin.from("push_tokens").select("token, lang");
    if (lang) q = q.eq("lang", lang);
    const { data: tokens, error } = await q;
    if (error) return json({ error: error.message }, 500);

    // Expo يقبل رموزاً بصيغة ExponentPushToken[...] فقط
    const messages = (tokens ?? [])
      .filter((t) => typeof t.token === "string" && t.token.startsWith("ExponentPushToken"))
      .map((t) => ({ to: t.token, title, body, sound: "default" }));

    if (messages.length === 0) return json({ ok: true, total: 0, sent: 0, failed: 0 });

    let sent = 0, failed = 0;
    // دفعات من 100 (حد Expo)
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      try {
        const res = await fetch(EXPO_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(batch),
        });
        const jr = await res.json().catch(() => null);
        if (res.ok && Array.isArray(jr?.data)) {
          for (const d of jr.data) (d.status === "ok" ? sent++ : failed++);
        } else {
          failed += batch.length;
        }
      } catch {
        failed += batch.length;
      }
    }

    return json({ ok: true, total: messages.length, sent, failed });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
