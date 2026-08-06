# أتمتة SEO — نمو الظهور في Google بلا تدخّل

الهدف: يحسّن الموقع ظهوره تلقائياً. النظام يؤتمت **إنشاء المحتوى** و**SEO
التقني**. أُضيفت ثلاث قطع:

| القطعة | الدور | التشغيل |
|--------|------|---------|
| `seo-autopilot` (دالة) | يكتشف الكلمات الناقصة ويولّد لها صفحة من حقائقك وينشرها | مجدولة (pg_cron) أو يدوياً |
| `sitemap-xml` (دالة) | `sitemap.xml` + `robots.txt` محدّثان دائماً من قاعدتك | عام (محركات البحث) |
| وسوم Meta + JSON-LD في البوابة | عنوان/وصف/بيانات منظّمة لكل صفحة | تلقائي في المتصفح |

> **صدق ضروري:** لا أحد يضمن «المركز الأول» — الترتيب يعتمد على المنافسة
> والروابط الخلفية وعمر النطاق والوقت. هذا النظام يؤتمت أقوى ما يمكن أتمتته
> (محتوى موثوق + بنية تقنية سليمة)، لكنه ليس زرّاً سحرياً.

---

## 1) الطيّار الآلي (المحتوى)

`seo-autopilot` يقرأ الكلمات المفتاحية ذات الأولوية (من `seo_keywords`)، يجد
ما لا صفحة له (`v_seo_gaps`)، يولّد دليلاً من **حقائق قاعدتك فقط** (معاهدك،
مراحلك، أسئلتك، الاشتراطات الرسمية — بلا اختراع)، ثم ينشره في `seo_pages`.

### النشر التلقائي (افتراضي: مُفعّل)
لأن هدفك صفر تدخّل، ينشر تلقائياً. لتحويله لوضع «مراجعة قبل النشر»، من
**لوحة التحكم → إعدادات التطبيق → `seo`** أضف `"autopublish": false` داخل القيمة.

### النشر والأسرار
```bash
supabase functions deploy seo-autopilot sitemap-xml
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set EDULINK_INVOKE_SECRET="$(openssl rand -hex 32)"   # إن لم يكن مضبوطاً
# (اختياري) نموذج التوليد:
supabase secrets set SEO_MODEL="claude-sonnet-4-6"
```

### ⭐ الجدولة التلقائية (بلا تدخّل — pg_cron)
في SQL Editor (استبدل `<PROJECT>` والسرّ):
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- كل يوم 3 فجراً: يولّد دليلاً عربياً جديداً
select cron.schedule('seo-autopilot-ar', '0 3 * * *', $$
  select net.http_post(
    url     := 'https://<PROJECT>.supabase.co/functions/v1/seo-autopilot',
    headers := jsonb_build_object('Content-Type','application/json','X-EduLink-Invoke','<EDULINK_INVOKE_SECRET>'),
    body    := jsonb_build_object('lang','ar','max',1)
  );
$$);

-- (اختياري) الروسية أسبوعياً
select cron.schedule('seo-autopilot-ru', '0 4 * * 1', $$
  select net.http_post(
    url     := 'https://<PROJECT>.supabase.co/functions/v1/seo-autopilot',
    headers := jsonb_build_object('Content-Type','application/json','X-EduLink-Invoke','<EDULINK_INVOKE_SECRET>'),
    body    := jsonb_build_object('lang','ru','max',1)
  );
$$);
```
لإيقافها لاحقاً: `select cron.unschedule('seo-autopilot-ar');`

بعدها ينمو موقعك بمقال موثّق جديد كل يوم — بلا لمسة منك.

---

## 2) خريطة الموقع و robots (تلقائيان)

`sitemap-xml` يبنيهما من قاعدتك مباشرةً (دائماً محدّثان):
- `https://<PROJECT>.supabase.co/functions/v1/sitemap-xml` → sitemap.xml
- `...?type=robots` → robots.txt

النطاق يُقرأ من **إعدادات التطبيق → `seo` → `domain`** (اضبطه على نطاقك).
**أفضل ممارسة:** وجّه (Rewrite) `/(sitemap.xml|robots.txt)` من نطاقك إلى هاتين
عبر استضافتك (Vercel/Cloudflare)، ثم قدّم `sitemap.xml` في
[Google Search Console](https://search.google.com/search-console).

---

## 3) SEO التقني في البوابة (تلقائي)
كل صفحة تضبط: `title` و`meta description` و Open Graph و`canonical` و
**بيانات منظّمة (JSON-LD)**: `WebSite` للرئيسية، `Course` لصفحة المعهد،
`FAQPage` لصفحة رحلة التقديم — ما يزيد فرص ظهور «المقتطفات المميزة».

---

## ⚠️ ملاحظة حاسمة عن الفهرسة
بوابة الطلاب صفحة تفاعلية (SPA). Google يفهرس الـSPA لكن ببطء وأقل موثوقية.
**لأفضل ترتيب** قدّم صفحات المحتوى (`seo_pages`/المعاهد) كـ **HTML مُخدَّم**:
- إمّا نشر تصدير الويب من مشروع Expo (`app/[lang]/...` + `scripts/build-seo.mjs`)،
- أو تفعيل **Prerendering** على استضافتك (Prerender.io / Cloudflare) للبوابة.

هذا الجزء يحتاج قراراً منك في الاستضافة — أخبرني وأدلّك على أبسط مسار.

## قائمة تحقّق سريعة
- [ ] نشر `seo-autopilot` و`sitemap-xml` + ضبط الأسرار
- [ ] جدولة pg_cron
- [ ] ضبط `seo.domain` في الإعدادات
- [ ] توجيه sitemap.xml/robots.txt من نطاقك + تقديمهما في Search Console
- [ ] (موصى) تفعيل Prerender أو نشر تصدير Expo للمحتوى
