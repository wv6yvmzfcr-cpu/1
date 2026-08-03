# دوال الحافة (Edge Functions) — نموذج الأمان

مراجعة أمنية وإصلاح لدوال الحافة. **أهم إصلاح معماري:** توحيد التفويض
في `_shared/auth.ts` وإغلاق ثغرة كانت تسمح لأي حامل لمفتاح `anon` العام
(المشحون داخل التطبيق) بتشغيل دوال تعمل بصلاحيات الخادم الكاملة.

## من يقدر يستدعي كل دالة؟

| الدالة | المُستدعي المسموح | آلية التحقق | مفتاح التشغيل |
|--------|------------------|-------------|----------------|
| `assistant` | الطالب صاحب الجلسة | JWT المستخدم + RLS | anon (بتوكن المستخدم) |
| `photo-passport` | الطالب صاحب الجلسة | JWT المستخدم + RLS | anon (بتوكن المستخدم) |
| `seo-generate` | **مدير فقط** | `is_admin()` | anon ثم service_role |
| `doc-review` | **مدير فقط** ⭐ أُصلح | `requireAdmin()` | service_role بعد التحقق |
| `partner-deliver` | **مدير أو أتمتة داخلية** ⭐ أُصلح | `requireAdminOrService()` | service_role بعد التحقق |

⭐ = كانت **بلا أي تحقق** قبل الإصلاح.

## طبقة التفويض (`_shared/auth.ts`)
- `requireAdmin(req)` — يتطلّب JWT صالحاً + `is_admin()` = true.
- `requireAdminOrService(req)` — يقبل مديراً **أو** سرّاً داخلياً في ترويسة
  `X-EduLink-Invoke` يطابق `EDULINK_INVOKE_SECRET` (مقارنة ثابتة الزمن).
  هذا يسمح لـ **Database Webhook** باستدعاء `partner-deliver` تلقائياً دون
  فتح الباب لأي مستخدم.

## `config.toml` (مهم)
أضف هذا إلى `supabase/config.toml` حتى يعمل مسار الأتمتة الداخلي:

```toml
[functions.partner-deliver]
# نتحقق بأنفسنا (مدير أو سرّ داخلي) للسماح باستدعاء Database Webhook
# الذي لا يرسل JWT من Supabase. الأمان مضمون داخل الدالة.
verify_jwt = false

[functions.doc-review]
verify_jwt = true

[functions.seo-generate]
verify_jwt = true

[functions.assistant]
verify_jwt = true

[functions.photo-passport]
verify_jwt = true
```

## النشر والأسرار
```bash
supabase functions deploy assistant doc-review photo-passport partner-deliver seo-generate

supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# سرّ الاستدعاء الداخلي: سلسلة عشوائية طويلة (≥ 32 حرفاً)
supabase secrets set EDULINK_INVOKE_SECRET="$(openssl rand -hex 32)"
# لدالة الصور:
supabase secrets set REMOVEBG_API_KEY=xxx   # أو CLIPDROP_API_KEY + BG_PROVIDER=clipdrop
```

عند إعداد Database Webhook لاستدعاء `partner-deliver`، أضف ترويسة:
`X-EduLink-Invoke: <نفس قيمة EDULINK_INVOKE_SECRET>`.

## إصلاحات أخرى في هذه الدوال
- **partner-deliver:** يرفض التسليم إن لم يكن للشريك `webhook_secret` فعلي
  (توقيع بلا سرّ = بلا قيمة)، ويتطلّب وجود مستند معتمد واحد على الأقل،
  ويسجّل فشل الشبكة بدل الانهيار.
- **doc-review:** إن أعاد النموذج رداً غير صالح (JSON فاسد) لا تنهار الدالة،
  بل تُسجَّل النتيجة كـ `review` (مراجعة بشرية) — فشل آمن.

## ملاحظات على الدوال السليمة
- `assistant` و`photo-passport` تستخدمان توكن المستخدم نفسه، فيحصرهما RLS
  في بيانات صاحب الجلسة — تصميم صحيح، أُبقيتا كما هما.
- `seo-generate` كانت تتحقق `is_admin()` أصلاً — نموذج صحيح.
