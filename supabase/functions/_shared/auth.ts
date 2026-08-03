// =====================================================================
// طبقة التفويض المشتركة لدوال الحافة — supabase/functions/_shared/auth.ts
//
// لماذا هذا الملف؟ (إصلاح معماري)
//   الدوال التي تعمل بمفتاح service_role (partner-deliver, doc-review)
//   كانت **بلا أي تحقق من هوية المُستدعي**. بوابة Supabase تكتفي بوجود
//   أي JWT صالح، ومفتاح anon يُشحن داخل التطبيق (عملياً عام) — فأي أحد
//   كان يستطيع تشغيلها. هذا الملف يوحّد التفويض في مكان واحد:
//     • requireAdmin        → JWT صالح + is_admin() (للوحة التحكم)
//     • requireAdminOrService → مدير أو سرّ استدعاء داخلي (لـ Webhooks)
//   القاعدة: لا تعمل بـ service_role قبل أن يمرّ الطلب بأحد هذين.
// =====================================================================
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-edulink-invoke",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** عميل بصلاحيات الخادم الكاملة — لا يُستخدم إلا بعد نجاح التفويض */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** عميل يحمل توكن المستخدم — تُطبَّق عليه RLS بصلاحياته هو */
export function userClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    },
  );
}

/** مقارنة ثابتة الزمن — تمنع هجمات التوقيت على مقارنة الأسرار */
export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

export type AuthResult =
  | { ok: true; via: "admin"; userId: string }
  | { ok: true; via: "service" }
  | { ok: false; response: Response };

/** يتطلّب مستخدماً مسجّلاً هو مدير (is_admin) */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const sb = userClient(req);
  const { data: { user }, error: uErr } = await sb.auth.getUser();
  if (uErr || !user) return { ok: false, response: json({ error: "unauthorized" }, 401) };

  const { data: isAdmin, error } = await sb.rpc("is_admin");
  if (error || isAdmin !== true) {
    return { ok: false, response: json({ error: "admin_only" }, 403) };
  }
  return { ok: true, via: "admin", userId: user.id };
}

/** هل يحمل الطلب سرّ الاستدعاء الداخلي (لـ Database Webhooks / الأتمتة)؟ */
export function hasServiceSecret(req: Request): boolean {
  const expected = Deno.env.get("EDULINK_INVOKE_SECRET") ?? "";
  const got = req.headers.get("X-EduLink-Invoke") ?? "";
  return expected.length >= 16 && timingSafeEqual(expected, got);
}

/**
 * يقبل: مديراً (زر "إرسال" من اللوحة) أو سرّاً داخلياً (Database Webhook).
 * يرفض أي مستخدم عادي أو مجهول — حتى لو كان معه مفتاح anon.
 */
export async function requireAdminOrService(req: Request): Promise<AuthResult> {
  if (hasServiceSecret(req)) return { ok: true, via: "service" };
  return await requireAdmin(req);
}
