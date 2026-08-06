// =====================================================================
// تسليم ملف الطالب للشريك — Supabase Edge Function (Deno)
// supabase/functions/partner-deliver/index.ts   (نسخة مُصحّحة أمنياً)
//
// المهمة: عند اكتمال ملف الطالب + وجود موافقته الصريحة، يُرسَل الملف
//         لنظام المعهد عبر Webhook موقّع، ويُسجَّل التحويل.
//
// 🔒 إصلاح معماري حاسم مقارنةً بالنسخة السابقة:
//   كانت الدالة تعمل بـ service_role **بلا أي تحقق من هوية المُستدعي**،
//   فأي أحد يملك مفتاح anon العام (المشحون في التطبيق) كان يقدر يُطلق
//   تسليم مستندات أي طالب. الآن لا تُنفَّذ إلا لـ:
//     • مدير مسجّل (زر "إرسال" من لوحة التحكم)، أو
//     • استدعاء داخلي يحمل سرّ EDULINK_INVOKE_SECRET (Database Webhook).
//
// ضمانات إضافية:
//   • لا يُرسل شيء بدون موافقة سارية (granted و لم تُسحب).
//   • يُرفض التسليم إن لم يكن للشريك webhook_secret فعلي (توقيع بلا معنى).
//   • روابط المستندات مؤقتة (Signed URLs تنتهي خلال ساعة).
//   • توقيع HMAC-SHA256 لكل طلب.
//
// النشر:
//   supabase functions deploy partner-deliver
//   supabase secrets set EDULINK_INVOKE_SECRET=<سلسلة عشوائية طويلة>
// =====================================================================
import { requireAdminOrService, serviceClient, json, cors } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // ---- 0) التفويض أولاً — قبل أي عمل بصلاحيات الخادم ----
    const authz = await requireAdminOrService(req);
    if (!authz.ok) return authz.response;

    const { applicationId, partnerId } = await req.json();
    if (!applicationId || !partnerId) return json({ error: "missing_params" }, 400);

    const admin = serviceClient();

    // ---- 1) التحقق من الموافقة (البوابة الأولى — بدونها نتوقف) ----
    const { data: consent } = await admin
      .from("data_consents")
      .select("granted, revoked_at")
      .eq("application_id", applicationId)
      .eq("partner_id", partnerId)
      .maybeSingle();

    if (!consent?.granted || consent.revoked_at) {
      await admin.from("data_transfers").insert({
        application_id: applicationId,
        partner_id: partnerId,
        method: "webhook",
        status: "awaiting_consent",
      });
      return json({ error: "no_consent" }, 403);
    }

    // ---- 2) إعدادات الشريك ----
    const { data: partner } = await admin
      .from("partners")
      .select("id, name, webhook_url, webhook_secret, delivery_webhook, status")
      .eq("id", partnerId)
      .single();

    if (!partner || partner.status !== "connected" || !partner.delivery_webhook || !partner.webhook_url) {
      return json({ error: "partner_not_ready" }, 400);
    }
    // توقيع بلا سرّ = بلا قيمة أمنية — نرفض بدل إرسال مستندات موقّعة زوراً
    if (!partner.webhook_secret || partner.webhook_secret.length < 16) {
      return json({ error: "partner_secret_missing" }, 400);
    }

    // ---- 3) تجميع ملف الطالب ----
    const { data: app } = await admin
      .from("applications")
      .select("id, weeks, start_month, arrival_date, flight_number, lang, status, institutes(name, city), profiles(full_name, phone, country)")
      .eq("id", applicationId)
      .single();

    if (!app) return json({ error: "application_not_found" }, 404);

    const { data: docs } = await admin
      .from("application_documents")
      .select("requirement_key, storage_path, value_text, status")
      .eq("application_id", applicationId)
      .eq("status", "approved");   // المستندات المعتمدة فقط

    if (!docs || docs.length === 0) {
      return json({ error: "no_approved_documents" }, 409);
    }

    // روابط موقّعة مؤقتة (ساعة واحدة) — لا نكشف التخزين للأبد
    const files: { key: string; url?: string; value?: string }[] = [];
    for (const d of docs) {
      if (d.storage_path) {
        const { data: signed } = await admin.storage
          .from("documents")
          .createSignedUrl(d.storage_path, 3600);
        files.push({ key: d.requirement_key, url: signed?.signedUrl });
      } else if (d.value_text) {
        files.push({ key: d.requirement_key, value: d.value_text });
      }
    }

    const payload = {
      event: "application.ready",
      sent_at: new Date().toISOString(),
      application: {
        id: app.id,
        weeks: app.weeks,
        start_month: app.start_month,
        arrival_date: app.arrival_date,
        flight_number: app.flight_number,
        preferred_language: app.lang,   // ليتواصل المعهد معه بلغته
        institute: app.institutes,
      },
      student: app.profiles,
      documents: files,
    };

    // ---- 4) توقيع HMAC ليتحقق المعهد من المصدر ----
    const body = JSON.stringify(payload);
    const signature = await hmac(partner.webhook_secret, body);

    let res: Response;
    try {
      res = await fetch(partner.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-EduLink-Signature": signature,
          "X-EduLink-Partner": partner.id,
        },
        body,
      });
    } catch (netErr) {
      await admin.from("data_transfers").insert({
        application_id: applicationId,
        partner_id: partnerId,
        method: "webhook",
        status: "failed",
        error: `network: ${String(netErr)}`,
      });
      return json({ error: "delivery_failed", reason: "network" }, 502);
    }

    // ---- 5) تسجيل نتيجة التحويل ----
    await admin.from("data_transfers").insert({
      application_id: applicationId,
      partner_id: partnerId,
      method: "webhook",
      status: res.ok ? "sent" : "failed",
      error: res.ok ? null : `HTTP ${res.status}`,
      sent_at: new Date().toISOString(),
    });

    if (!res.ok) return json({ error: "delivery_failed", status: res.status }, 502);
    return json({ ok: true, delivered_documents: files.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

/** توقيع HMAC-SHA256 بصيغة hex */
async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
