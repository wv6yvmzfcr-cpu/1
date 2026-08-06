// =====================================================================
// إشعار الطالب عبر واتساب عند تغيّر حالة طلبه — Supabase Edge Function
// supabase/functions/whatsapp-notify/index.ts
//
// كيف يعمل؟
//   يُستدعى تلقائياً من Database Webhook على جدول applications (UPDATE).
//   إذا تغيّرت الحالة (status)، نرسل للطالب رسالة واتساب بعنوان المرحلة
//   الجديدة و«المطلوب منه الآن» — بلغته المفضّلة — عبر WhatsApp Cloud API.
//
// الأمان: محمي بسرّ داخلي (X-EduLink-Invoke) تضبطه في ترويسة الـWebhook.
//
// الإعداد المطلوب (مرة واحدة):
//   supabase secrets set EDULINK_INVOKE_SECRET="<سلسلة عشوائية طويلة>"
//   supabase secrets set WHATSAPP_TOKEN="<Meta permanent token>"
//   supabase secrets set WHATSAPP_PHONE_ID="<رقم معرّف الهاتف في Meta>"
//   # قالب معتمد من Meta (موصى به للرسائل التلقائية خارج نافذة 24 ساعة):
//   supabase secrets set WHATSAPP_TEMPLATE="app_status"     # اسم القالب
//   supabase secrets set WHATSAPP_TEMPLATE_LANG="ar"        # لغة القالب
//   # القالب يتوقّع وسيطين: {{1}} = اسم المعهد ، {{2}} = المرحلة الجديدة
//   # إن لم تضبط قالباً، نرسل رسالة نصية (تصل فقط خلال 24 ساعة من آخر رسالة من الطالب).
//
// ثم في Supabase → Database → Webhooks: أنشئ Webhook على applications
//   الحدث UPDATE → HTTP POST إلى دالة whatsapp-notify، وأضف ترويسة:
//   X-EduLink-Invoke: <نفس EDULINK_INVOKE_SECRET>
// =====================================================================
import { hasServiceSecret, serviceClient, json, cors } from "../_shared/auth.ts";

const GRAPH = "https://graph.facebook.com/v20.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // التفويض: سرّ داخلي فقط (الـWebhook يرسله في الترويسة)
    if (!hasServiceSecret(req)) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    // شكل حمولة Database Webhook: { type, table, record, old_record }
    const rec = body.record || body.new || body;
    const old = body.old_record || body.old || {};
    if (!rec?.id || !rec?.status) return json({ error: "bad_payload" }, 400);
    if (old?.status && old.status === rec.status) return json({ ok: true, skipped: "no_status_change" });

    const admin = serviceClient();

    // بيانات الطالب (الهاتف واللغة) + اسم المعهد + عنوان المرحلة
    const [{ data: prof }, { data: inst }, { data: step }] = await Promise.all([
      admin.from("profiles").select("phone, preferred_lang, full_name").eq("id", rec.user_id).maybeSingle(),
      admin.from("institutes").select("name").eq("id", rec.institute_id).maybeSingle(),
      admin.from("pipeline_steps").select("title, your_action").eq("status", rec.status).maybeSingle(),
    ]);

    const phone = (prof?.phone || "").replace(/[^\d]/g, "");
    if (!phone) return json({ ok: true, skipped: "no_phone" });

    const lang = prof?.preferred_lang || "ar";
    const pick = (o: Record<string, string> | null) => o?.[lang] ?? o?.["ar"] ?? o?.["en"] ?? Object.values(o ?? {})[0] ?? "";
    const instName = pick(inst?.name);
    const stepTitle = pick(step?.title);
    const action = pick(step?.your_action);

    const token = Deno.env.get("WHATSAPP_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID");
    if (!token || !phoneId) return json({ error: "whatsapp_not_configured" }, 503);

    const template = Deno.env.get("WHATSAPP_TEMPLATE");
    let payload: unknown;
    if (template) {
      // رسالة قالب معتمدة (الطريقة الموصى بها للإشعارات التلقائية)
      payload = {
        messaging_product: "whatsapp", to: phone, type: "template",
        template: {
          name: template,
          language: { code: Deno.env.get("WHATSAPP_TEMPLATE_LANG") || lang },
          components: [{
            type: "body",
            parameters: [{ type: "text", text: instName }, { type: "text", text: stepTitle }],
          }],
        },
      };
    } else {
      // بديل نصّي (يصل فقط ضمن نافذة 24 ساعة من آخر رسالة من الطالب)
      const text = lang === "ar"
        ? `تحديث طلبك في ${instName}:\n• المرحلة: ${stepTitle}\n${action ? "• المطلوب: " + action : ""}`
        : `Update on your application at ${instName}:\n• Stage: ${stepTitle}\n${action ? "• Action: " + action : ""}`;
      payload = { messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } };
    }

    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok) return json({ error: "whatsapp_send_failed", status: res.status, detail: out }, 502);

    return json({ ok: true, to: phone, status: rec.status });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
