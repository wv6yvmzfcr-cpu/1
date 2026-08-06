-- =====================================================================
-- إيدولينك — كل مخطط قاعدة البيانات دفعة واحدة (الملفات ١..٩ مدمجة)
-- انسخ هذا الملف كاملاً والصقه في Supabase SQL Editor ثم اضغط Run.
-- نفّذه مرة واحدة على مشروع Supabase جديد.
-- =====================================================================


-- ========================= [ ١- الجداول الأساسية ] =========================

-- =====================================================================
-- EduLink MY — مخطط قاعدة البيانات (Supabase / PostgreSQL)
-- فلسفة التصميم:
--   1) كل نص قابل للعرض للمستخدم يُخزَّن كـ JSONB بصيغة {"ar": "...", "en": "...", ...}
--      => إضافة لغة جديدة = إضافة مفتاح جديد داخل الـ JSON، بدون تعديل أي عمود.
--   2) جدول languages هو "مصدر الحقيقة" للغات المتاحة؛ التطبيق يقرأه عند الإقلاع
--      ويعرض أي لغة جديدة تلقائياً في قائمة اختيار اللغة.
--   3) RLS مفعّل على كل الجداول لحماية البيانات مع بقاء القراءة العامة للمحتوى.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) اللغات المدعومة (ديناميكية — أضف صفاً لتظهر اللغة في التطبيق)
-- ---------------------------------------------------------------
create table public.languages (
  code        text primary key,          -- 'ar', 'en', 'ms', 'fr', 'zh', 'tr' ...
  native_name text not null,             -- 'العربية', 'English', 'Bahasa Melayu'
  is_rtl      boolean not null default false,
  is_active   boolean not null default true,
  sort_order  int not null default 0
);

insert into public.languages (code, native_name, is_rtl, is_active, sort_order) values
  ('ar', 'العربية',        true,  true, 1),
  ('en', 'English',        false, true, 2),
  ('ms', 'Bahasa Melayu',  false, true, 3);

-- ---------------------------------------------------------------
-- 2) العملات وأسعار الصرف (السعر الأساس بالرينغت MYR)
-- ---------------------------------------------------------------
create table public.currencies (
  code        text primary key,          -- 'MYR', 'USD', 'SAR'
  symbol      jsonb not null,            -- {"ar": "ر.س", "en": "SAR"} رموز مترجمة
  rate_to_myr numeric(12,6) not null,    -- 1 وحدة من العملة = كم رينغت
  is_active   boolean not null default true,
  sort_order  int not null default 0
);

insert into public.currencies (code, symbol, rate_to_myr, sort_order) values
  ('MYR', '{"en":"RM",  "ar":"رينغت"}', 1.000000, 1),
  ('SAR', '{"en":"SAR", "ar":"ر.س"}',   1.190000, 2),
  ('USD', '{"en":"$",   "ar":"$"}',     4.450000, 3);

-- ---------------------------------------------------------------
-- 3) المعاهد
-- ---------------------------------------------------------------
create table public.institutes (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,               -- للروابط العميقة: edulink://institute/elc-kl
  name          jsonb not null,                     -- {"ar": "معهد ...", "en": "..."}
  description   jsonb not null default '{}',
  city          jsonb not null default '{}',        -- {"ar": "كوالالمبور", "en": "Kuala Lumpur"}
  city_key      text not null,                      -- مفتاح ثابت للفلترة: 'kuala_lumpur'
  price_myr     numeric(10,2) not null,             -- سعر الأسبوع الواحد بالرينغت (الأساس)
  min_weeks     int not null default 4,
  max_weeks     int not null default 48,
  tags          jsonb not null default '[]',        -- [{"ar":"سكن داخلي","en":"On-campus housing"}, ...]
  images        text[] not null default '{}',       -- روابط عامة من Supabase Storage
  whatsapp      text,                               -- رقم واتساب المعهد بصيغة دولية 60123456789
  location_lat  numeric(9,6),
  location_lng  numeric(9,6),
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index institutes_city_idx  on public.institutes (city_key) where is_active;
create index institutes_price_idx on public.institutes (price_myr) where is_active;

-- ---------------------------------------------------------------
-- 4) الإعلانات (سكن الطلاب / الخدمات) — نظام شبيه بـ Airbnb
-- ---------------------------------------------------------------
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  category     text not null default 'housing',     -- 'housing' | 'services' | 'transport' ...
  title        jsonb not null,
  description  jsonb not null default '{}',
  city_key     text not null,
  city         jsonb not null default '{}',
  price_myr    numeric(10,2) not null,              -- السعر الشهري بالرينغت
  features     jsonb not null default '[]',         -- [{"ar":"واي فاي","en":"Wi-Fi"}, ...]
  images       text[] not null default '{}',
  whatsapp     text not null,                       -- التواصل المباشر بدل سيرفر شات
  is_active    boolean not null default true,       -- تفعيل/إيقاف الإعلان بضغطة من اللوحة
  is_featured  boolean not null default false,      -- يظهر في بانر الشاشة الرئيسية
  sort_order   int not null default 0,
  expires_at   timestamptz,                         -- إيقاف تلقائي عند انتهاء الاشتراك
  created_at   timestamptz not null default now()
);

create index listings_active_idx on public.listings (category, sort_order)
  where is_active;

-- ---------------------------------------------------------------
-- 5) الملفات الشخصية (مرتبطة بـ auth.users)
-- ---------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  phone          text,
  country        text,                    -- 'SA', 'MY', ...
  preferred_lang text not null default 'ar' references public.languages (code),
  preferred_currency text not null default 'SAR' references public.currencies (code),
  created_at     timestamptz not null default now()
);

-- إنشاء الملف الشخصي تلقائياً عند التسجيل
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- 6) طلبات التسجيل في المعاهد
-- ---------------------------------------------------------------
create table public.applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  institute_id  uuid not null references public.institutes (id),
  weeks         int not null,
  start_month   date not null,
  notes         text,
  lang          text not null default 'ar',   -- لغة المتقدم لتتواصل معه الإدارة بها
  status        text not null default 'pending'
                check (status in ('pending','reviewing','accepted','rejected')),
  created_at    timestamptz not null default now()
);

create index applications_user_idx on public.applications (user_id, created_at desc);

-- ---------------------------------------------------------------
-- 7) رموز الإشعارات (Expo Push Tokens)
-- ---------------------------------------------------------------
create table public.push_tokens (
  token      text primary key,              -- ExponentPushToken[xxxx]
  user_id    uuid references public.profiles (id) on delete cascade,
  lang       text not null default 'ar',    -- لإرسال العروض بلغة المستخدم
  platform   text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 8) سياسات الأمان (Row Level Security)
-- ---------------------------------------------------------------
alter table public.languages    enable row level security;
alter table public.currencies   enable row level security;
alter table public.institutes   enable row level security;
alter table public.listings     enable row level security;
alter table public.profiles     enable row level security;
alter table public.applications enable row level security;
alter table public.push_tokens  enable row level security;

-- المحتوى العام: قراءة للجميع (حتى بدون تسجيل دخول)
create policy "public read languages"  on public.languages  for select using (is_active);
create policy "public read currencies" on public.currencies for select using (is_active);
create policy "public read institutes" on public.institutes for select using (is_active);
create policy "public read listings"   on public.listings   for select
  using (is_active and (expires_at is null or expires_at > now()));

-- الملف الشخصي: المالك فقط
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- الطلبات: المستخدم يُنشئ ويقرأ طلباته فقط
create policy "own applications insert" on public.applications
  for insert with check (auth.uid() = user_id);
create policy "own applications read" on public.applications
  for select using (auth.uid() = user_id);

-- رموز الإشعارات: كل مستخدم يدير رمزه
create policy "own token upsert" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 9) حذف الحساب نهائياً (متطلب App Store — Guideline 5.1.1(v))
--    دالة security definer تحذف المستخدم من auth.users،
--    وكل بياناته تُحذف تلقائياً عبر on delete cascade.
-- ---------------------------------------------------------------
create or replace function public.delete_current_user()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_current_user() from anon;
grant  execute on function public.delete_current_user() to authenticated;

-- ---------------------------------------------------------------
-- 10) التخزين (Supabase Storage)
--    أنشئ Bucket عاماً باسم media من اللوحة أو بالأمر التالي،
--    ثم ضع الروابط الناتجة في أعمدة images[].
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media" on storage.objects
  for select using (bucket_id = 'media');
-- الرفع يتم من لوحة Supabase (Dashboard > Storage) بدون كود إضافي.

-- ---------------------------------------------------------------
-- بيانات تجريبية
-- ---------------------------------------------------------------
insert into public.institutes (slug, name, description, city, city_key, price_myr, tags, images, whatsapp) values
(
  'elc-kuala-lumpur',
  '{"ar": "مركز اللغة الإنجليزية - كوالالمبور", "en": "English Language Centre KL", "ms": "Pusat Bahasa Inggeris KL"}',
  '{"ar": "معهد معتمد في قلب العاصمة مع فصول مكثفة وأنشطة أسبوعية.", "en": "Accredited institute in the heart of KL with intensive classes and weekly activities."}',
  '{"ar": "كوالالمبور", "en": "Kuala Lumpur", "ms": "Kuala Lumpur"}',
  'kuala_lumpur',
  450.00,
  '[{"ar": "معتمد من وزارة التعليم", "en": "Ministry accredited"}, {"ar": "سكن طلابي", "en": "Student housing"}, {"ar": "دعم التأشيرة", "en": "Visa support"}]',
  '{}',
  '60123456789'
);


-- ========================= [ ٢- الأتمتة والمتطلبات ] =========================

-- =====================================================================
-- EduLink MY — الإصدار 2: محرك الأتمتة الكامل
-- (محرك المتطلبات الديناميكي + المستندات + خط سير الطلب + المساعد الذكي)
-- نفّذ هذا الملف بعد schema.sql
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) توسعة خط سير الطلب (Pipeline)
--    الطلب رحلة من 8 مراحل، وكل مرحلة لها شرح مترجم في جدول pipeline_steps
-- ---------------------------------------------------------------
alter table public.applications drop constraint applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('documents','review','submitted','offer','payment','visa','ticket','completed','rejected'));
alter table public.applications alter column status set default 'documents';
alter table public.applications add column if not exists updated_at timestamptz not null default now();

-- مراحل خط السير: الاسم، الشرح، "المطلوب منك الآن"، والمدة المتوقعة — كلها مترجمة وقابلة للتعديل من اللوحة
create table public.pipeline_steps (
  status       text primary key,
  step_order   int not null,
  title        jsonb not null,
  explanation  jsonb not null,     -- ماذا يحدث في هذه المرحلة
  your_action  jsonb not null,     -- الخطوة التالية المطلوبة من الطالب
  eta_days     int                 -- المدة المتوقعة بالأيام (null = حسب الطالب)
);

insert into public.pipeline_steps (status, step_order, title, explanation, your_action, eta_days) values
('documents', 1,
 '{"ar":"تجهيز المستندات","en":"Preparing documents","ms":"Penyediaan dokumen"}',
 '{"ar":"نجمع منك المستندات المطلوبة للمعهد. كل مستند يُفحص تلقائياً قبل الرفع لتفادي أي رفض لاحق.","en":"We collect the documents the institute requires. Each one is auto-checked before upload to avoid later rejections.","ms":"Kami mengumpul dokumen yang diperlukan. Setiap satu disemak automatik sebelum dimuat naik."}',
 '{"ar":"أكمل رفع جميع المستندات الناقصة من قائمة المتطلبات.","en":"Upload all missing documents from the requirements list.","ms":"Muat naik semua dokumen yang belum lengkap."}', null),
('review', 2,
 '{"ar":"مراجعة داخلية","en":"Internal review","ms":"Semakan dalaman"}',
 '{"ar":"فريقنا يدقق مستنداتك يدوياً. إن وُجدت ملاحظة على أي مستند سيصلك إشعار فوري بسبب الرفض وطريقة الإصلاح بالضبط.","en":"Our team manually verifies your documents. If anything needs fixing you get an instant notification with the exact reason and fix.","ms":"Pasukan kami menyemak dokumen anda. Jika ada masalah, anda akan dimaklumkan serta-merta dengan cara pembetulan."}',
 '{"ar":"لا شيء مطلوب منك — فقط تابع الإشعارات.","en":"Nothing needed from you — just watch for notifications.","ms":"Tiada tindakan diperlukan — tunggu notifikasi."}', 2),
('submitted', 3,
 '{"ar":"مُرسل للمعهد","en":"Sent to institute","ms":"Dihantar ke institut"}',
 '{"ar":"ملفك الكامل الآن لدى قسم القبول في المعهد للبت فيه.","en":"Your complete file is now with the institute admissions team.","ms":"Fail lengkap anda kini bersama pihak kemasukan institut."}',
 '{"ar":"لا شيء مطلوب منك حالياً.","en":"Nothing needed from you right now.","ms":"Tiada tindakan diperlukan buat masa ini."}', 5),
('offer', 4,
 '{"ar":"خطاب القبول","en":"Offer letter","ms":"Surat tawaran"}',
 '{"ar":"مبروك! وصل خطاب القبول (Offer Letter). راجع تفاصيله: تاريخ البداية، عدد الأسابيع، والرسوم النهائية.","en":"Congrats! Your offer letter arrived. Review the start date, duration and final fees.","ms":"Tahniah! Surat tawaran anda telah tiba. Semak tarikh mula dan yuran."}',
 '{"ar":"اقبل العرض للانتقال لمرحلة الدفع.","en":"Accept the offer to move to payment.","ms":"Terima tawaran untuk ke peringkat pembayaran."}', null),
('payment', 5,
 '{"ar":"الدفع","en":"Payment","ms":"Pembayaran"}',
 '{"ar":"سداد رسوم المعهد يتم بتحويل بنكي مباشر للمعهد (لا نستلم أموالاً نيابة عنه). أرفق إيصال التحويل هنا لنؤكده معهم.","en":"Fees are paid by direct bank transfer to the institute (we never hold funds). Upload the transfer receipt so we confirm it.","ms":"Yuran dibayar terus ke institut. Muat naik resit pemindahan untuk pengesahan."}',
 '{"ar":"حوّل الرسوم ثم ارفع صورة الإيصال.","en":"Transfer the fees, then upload the receipt.","ms":"Buat pemindahan, kemudian muat naik resit."}', null),
('visa', 6,
 '{"ar":"التأشيرة / EMGS","en":"Visa / EMGS","ms":"Visa / EMGS"}',
 '{"ar":"للكورسات الطويلة يقدّم المعهد طلب Student Pass عبر بوابة EMGS الحكومية. للكورسات القصيرة (حتى 90 يوماً) السعوديون معفون من التأشيرة المسبقة.","en":"For long courses the institute files your Student Pass via the official EMGS portal. Short courses (up to 90 days) need no advance visa for Saudi citizens.","ms":"Untuk kursus panjang, institut memfailkan Student Pass melalui EMGS. Kursus pendek tidak memerlukan visa awal bagi warga Saudi."}',
 '{"ar":"تابع نسبة إنجاز EMGS هنا — سنحدثها لك أولاً بأول.","en":"Track your EMGS progress here — we update it for you.","ms":"Jejak kemajuan EMGS anda di sini."}', 21),
('ticket', 7,
 '{"ar":"السفر والاستقبال","en":"Travel & arrival","ms":"Perjalanan & ketibaan"}',
 '{"ar":"احجز تذكرتك، وأخبرنا برقم الرحلة لترتيب الاستقبال من المطار والسكن إن رغبت (من صفحة الخدمات).","en":"Book your flight and share the flight number so we arrange airport pickup and housing if you wish.","ms":"Tempah penerbangan anda dan kongsi nombor penerbangan untuk jemputan lapangan terbang."}',
 '{"ar":"أدخل تاريخ وصولك ورقم الرحلة.","en":"Enter your arrival date and flight number.","ms":"Masukkan tarikh ketibaan dan nombor penerbangan."}', null),
('completed', 8,
 '{"ar":"اكتمل التسجيل 🎉","en":"Enrollment complete 🎉","ms":"Pendaftaran selesai 🎉"}',
 '{"ar":"وصلت وبدأت دراستك. نتمنى لك رحلة موفقة! يمكنك دائماً سؤال المساعد عن أي شيء أثناء إقامتك.","en":"You arrived and started your course. You can still ask the assistant anything during your stay.","ms":"Anda telah tiba dan memulakan kursus anda!"}',
 '{"ar":"لا شيء — بالتوفيق!","en":"Nothing — good luck!","ms":"Tiada — semoga berjaya!"}', null);

-- ---------------------------------------------------------------
-- 2) محرك المتطلبات الديناميكي
--    متطلبات عامة (institute_id = null) + متطلبات خاصة بمعهد معين.
--    validation JSONB = قواعد الفحص الفوري على جهاز الطالب قبل الرفع.
-- ---------------------------------------------------------------
create table public.requirements (
  id            uuid primary key default gen_random_uuid(),
  institute_id  uuid references public.institutes (id) on delete cascade,  -- null = ينطبق على الجميع
  key           text not null,                    -- 'passport', 'photo', 'certificate'...
  name          jsonb not null,
  description   jsonb not null default '{}',      -- شرح كامل: ما هو، من أين يستخرجه، بأي صيغة
  input_type    text not null default 'file'
                check (input_type in ('file','text','date','select')),
  validation    jsonb not null default '{}',      -- {"formats":["pdf","jpg"],"max_mb":10,"min_months_valid":18,...}
  is_required   boolean not null default true,
  sort_order    int not null default 0
);

-- المتطلبات القياسية لأي معهد لغة في ماليزيا (وفق اشتراطات EMGS)
insert into public.requirements (key, name, description, input_type, validation, sort_order) values
('passport',
 '{"ar":"جواز السفر","en":"Passport","ms":"Pasport"}',
 '{"ar":"صورة واضحة لصفحة البيانات. شرط EMGS الأساسي: صلاحية الجواز 18 شهراً فأكثر من تاريخ بدء الدراسة — إن كانت أقل جدّد جوازك أولاً عبر أبشر قبل التقديم.","en":"A clear scan of the data page. Core EMGS rule: the passport must be valid for 18+ months from your course start date — renew it first if shorter.","ms":"Imbasan jelas halaman data. Pasport mesti sah 18+ bulan dari tarikh mula kursus."}',
 'file', '{"formats":["pdf","jpg","jpeg","png"],"max_mb":10}', 1),
('passport_expiry',
 '{"ar":"تاريخ انتهاء الجواز","en":"Passport expiry date","ms":"Tarikh tamat pasport"}',
 '{"ar":"نتحقق تلقائياً أن الصلاحية تكفي (18 شهراً+). هذا أكثر سبب يعطّل طلبات الطلاب — نكتشفه لك في أول دقيقة بدل أن يُرفض ملفك بعد أسابيع.","en":"We auto-check the 18-month rule — the single most common blocker. We catch it in minute one instead of a rejection weeks later.","ms":"Kami semak automatik peraturan 18 bulan — penyebab kelewatan paling biasa."}',
 'date', '{"min_months_valid":18}', 2),
('photo',
 '{"ar":"صورة شخصية بخلفية بيضاء","en":"Photo (white background)","ms":"Gambar (latar putih)"}',
 '{"ar":"صورة حديثة بخلفية بيضاء بحجم صورة الجواز (35×45مم). بدون نظارات أو غطاء يحجب ملامح الوجه (الحجاب مقبول مع وضوح الوجه كاملاً).","en":"Recent passport-size photo (35×45mm) on white background. No glasses; head covering is fine if the full face is visible.","ms":"Gambar bersaiz pasport berlatar putih. Tiada cermin mata."}',
 'file', '{"formats":["jpg","jpeg","png"],"max_mb":5}', 3),
('certificate',
 '{"ar":"آخر مؤهل دراسي","en":"Latest academic certificate","ms":"Sijil akademik terkini"}',
 '{"ar":"شهادة الثانوية أو البكالوريوس. لا تحتاج ترجمة إن كانت صادرة بالإنجليزية؛ وإلا أرفق ترجمة معتمدة معها في نفس الملف.","en":"High-school or bachelor certificate. No translation needed if issued in English; otherwise include a certified translation in the same file.","ms":"Sijil SPM/Ijazah. Sertakan terjemahan sah jika bukan Bahasa Inggeris."}',
 'file', '{"formats":["pdf","jpg","jpeg","png"],"max_mb":10}', 4);

-- ⚠️ ملاحظة امتثال (PDPL): لا نجمع بيانات صحية إطلاقاً.
--
-- كان هنا متطلب "الإقرار الصحي" وحُذف عمداً، لأن نظام حماية البيانات
-- الشخصية السعودي يصنّف البيانات الصحية كـ"بيانات حساسة"، وعقوبة
-- الإفصاح عنها دون موافقة قد تصل للسجن — لا غرامة فقط.
--
-- ولا حاجة لها أصلاً:
--   • الإقرار الصحي نموذج بسيط يوفّره المعهد ويستلمه بنفسه.
--   • الفحص الطبي الحقيقي يتم في عيادات EMGS داخل ماليزيا خلال 7 أيام
--     من الوصول، ويرتّبه المعهد (وبعض المعاهد تشمله في رسومها).
--
-- المبدأ: تقليل البيانات — ما لا تخزّنه لا يُسرَّب ولا يُغرّمك.
-- ❌ لا تُضف أي متطلب يجمع بيانات صحية أو دينية أو عرقية أو وراثية.

-- ---------------------------------------------------------------
-- 3) مستندات الطلب + قاموس أسباب الرفض المقننة
-- ---------------------------------------------------------------
create table public.rejection_reasons (
  key      text primary key,                 -- 'blurry', 'expired', 'wrong_doc', 'incomplete'
  title    jsonb not null,
  fix      jsonb not null                    -- شرح الإصلاح بالضبط — يصل للطالب بلغته
);

insert into public.rejection_reasons values
('blurry',    '{"ar":"الصورة غير واضحة","en":"Image is blurry","ms":"Imej kabur"}',
              '{"ar":"أعد التصوير في إضاءة جيدة، وتأكد أن كل النصوص مقروءة قبل الرفع. يفضّل المسح عبر تطبيق مثل CamScanner.","en":"Rescan in good lighting; make sure all text is readable. A scanning app like CamScanner helps.","ms":"Imbas semula dalam pencahayaan baik; pastikan semua teks boleh dibaca."}'),
('expired',   '{"ar":"المستند منتهي الصلاحية","en":"Document expired","ms":"Dokumen tamat tempoh"}',
              '{"ar":"جدّد المستند ثم ارفع النسخة الجديدة. لتجديد الجواز السعودي: خدمة أبشر > جواز السفر (يصدر عادة خلال أيام).","en":"Renew the document and upload the new version.","ms":"Perbaharui dokumen dan muat naik versi baharu."}'),
('wrong_doc', '{"ar":"مستند غير مطابق للمطلوب","en":"Wrong document type","ms":"Jenis dokumen salah"}',
              '{"ar":"المستند المرفوع لا يطابق المطلوب في هذه الخانة. اقرأ وصف المتطلب ثم ارفع المستند الصحيح.","en":"The uploaded file doesn''t match this requirement. Re-read the description and upload the right one.","ms":"Fail tidak sepadan dengan keperluan. Muat naik yang betul."}'),
('incomplete','{"ar":"مستند ناقص الصفحات","en":"Missing pages","ms":"Halaman tidak lengkap"}',
              '{"ar":"بعض الصفحات المطلوبة غير موجودة. ادمج كل الصفحات في ملف PDF واحد وارفعه.","en":"Some required pages are missing. Merge all pages into one PDF and upload it.","ms":"Gabungkan semua halaman dalam satu PDF."}');

create table public.application_documents (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications (id) on delete cascade,
  requirement_key text not null,
  storage_path    text,                            -- documents/{user_id}/{application_id}/{key}
  value_text      text,                            -- لمتطلبات النص/التاريخ
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  rejection_key   text references public.rejection_reasons (key),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (application_id, requirement_key)
);

-- سجل أحداث الطلب (Timeline يظهر للطالب)
create table public.application_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  title          jsonb not null,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 4) قاعدة المعرفة السياقية (FAQ مرتبط بمراحل خط السير)
-- ---------------------------------------------------------------
create table public.faq (
  id           uuid primary key default gen_random_uuid(),
  question     jsonb not null,
  answer       jsonb not null,
  context_tags text[] not null default '{}',   -- ['visa','payment'...] تظهر تلقائياً في مرحلتها
  sort_order   int not null default 0,
  is_active    boolean not null default true
);

insert into public.faq (question, answer, context_tags, sort_order) values
('{"ar":"هل أحتاج تأشيرة قبل السفر؟","en":"Do I need a visa before traveling?","ms":"Perlukah visa sebelum berlepas?"}',
 '{"ar":"السعوديون (ومعظم الخليجيين) معفون من التأشيرة المسبقة لمدة 90 يوماً. الكورسات القصيرة لا تحتاج أكثر من ذلك؛ الكورسات الأطول يقدّم المعهد لك Student Pass عبر EMGS ونحن نتابع حالتها لك داخل التطبيق.","en":"Saudi citizens get 90 days visa-free. Short courses need nothing more; for longer ones the institute files a Student Pass via EMGS and we track it for you in-app.","ms":"Warga Saudi mendapat 90 hari tanpa visa. Kursus panjang memerlukan Student Pass melalui EMGS."}',
 '{visa,documents}', 1),
('{"ar":"لماذا يشترطون صلاحية جواز 18 شهراً؟","en":"Why must my passport be valid 18 months?","ms":"Mengapa pasport perlu sah 18 bulan?"}',
 '{"ar":"هذا شرط EMGS الرسمي لإصدار Student Pass: مدة الدراسة + هامش أمان. نفحصه تلقائياً في أول خطوة كي لا يتعطل ملفك بعد أسابيع.","en":"It''s the official EMGS rule for issuing a Student Pass: course length plus a safety margin. We check it upfront so your file never stalls weeks later.","ms":"Ia peraturan rasmi EMGS untuk Student Pass."}',
 '{documents}', 2),
('{"ar":"كيف أدفع رسوم المعهد؟ هل هو آمن؟","en":"How do I pay the fees? Is it safe?","ms":"Bagaimana membayar yuran?"}',
 '{"ar":"الدفع تحويل بنكي مباشر إلى حساب المعهد الرسمي — لا نستلم أي أموال نيابة عنه، وهذا أضمن لك. ترفع إيصال التحويل هنا فنؤكد الاستلام مع المعهد خلال يوم عمل.","en":"You transfer directly to the institute''s official bank account — we never hold funds, which is safer for you. Upload the receipt here and we confirm within one business day.","ms":"Pindahan terus ke akaun rasmi institut. Muat naik resit di sini."}',
 '{payment,offer}', 3),
('{"ar":"ماذا عن الفحص الطبي؟","en":"What about the medical check?","ms":"Bagaimana pemeriksaan kesihatan?"}',
 '{"ar":"لا تحتاج فحصاً قبل السفر. الفحص الكامل يتم في عيادة EMGS معتمدة داخل ماليزيا خلال أول 7 أيام من وصولك، والمعهد يرتب لك الموعد (وبعض المعاهد تشمل رسومه في الرسوم الإجمالية). ملاحظة: إيدولينك لا تجمع ولا تخزّن أي بيانات صحية — أي إقرار صحي أو نتائج فحص تُقدَّم مباشرة للمعهد وعياداته المعتمدة.","en":"No pre-travel screening is needed. The full check happens at an EMGS-approved clinic in Malaysia within 7 days of arrival; the institute books it for you (some include the fee in their total). Note: EduLink does not collect or store any health data — any health declaration or results go directly to the institute and its approved clinics.","ms":"Saringan penuh dibuat di Malaysia dalam 7 hari selepas ketibaan. Nota: EduLink tidak mengumpul data kesihatan."}',
 '{documents,visa,ticket}', 4),
('{"ar":"أين أسكن أثناء انتظار السكن الدائم؟","en":"Where do I stay while waiting for permanent housing?","ms":"Di mana tinggal sementara?"}',
 '{"ar":"من صفحة السكن في التطبيق تجد خيارات أسبوعية وشهرية قرب معهدك، وتتواصل مع المعلن مباشرة عبر واتساب. ننصح بحجز أسبوعين مبدئياً ثم اختيار الدائم بعد المعاينة.","en":"The housing tab has weekly and monthly options near your institute with direct WhatsApp contact. We suggest booking two weeks first, then choosing long-term after viewing.","ms":"Tab penginapan mempunyai pilihan mingguan berhampiran institut anda."}',
 '{ticket,visa}', 5);

-- ---------------------------------------------------------------
-- 5) محادثات المساعد الذكي
-- ---------------------------------------------------------------
create table public.chat_messages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  role           text not null check (role in ('user','assistant')),
  content        text not null,
  created_at     timestamptz not null default now()
);
create index chat_user_idx on public.chat_messages (user_id, created_at);

-- ---------------------------------------------------------------
-- 6) الأمان RLS
-- ---------------------------------------------------------------
alter table public.pipeline_steps        enable row level security;
alter table public.requirements          enable row level security;
alter table public.rejection_reasons     enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_events    enable row level security;
alter table public.faq                   enable row level security;
alter table public.chat_messages         enable row level security;

create policy "public read steps"   on public.pipeline_steps    for select using (true);
create policy "public read reqs"    on public.requirements      for select using (true);
create policy "public read reasons" on public.rejection_reasons for select using (true);
create policy "public read faq"     on public.faq               for select using (is_active);

-- مستندات وأحداث الطالب: يرى ويضيف ما يخص طلباته فقط
create policy "own docs" on public.application_documents for all
  using (application_id in (select id from public.applications where user_id = auth.uid()))
  with check (application_id in (select id from public.applications where user_id = auth.uid()));

create policy "own events read" on public.application_events for select
  using (application_id in (select id from public.applications where user_id = auth.uid()));

create policy "own chat" on public.chat_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- تحديث حالة الطلب من الطالب: مقيد (قبول العرض فقط) — بقية الانتقالات من اللوحة
create policy "own application update" on public.applications for update
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 7) تخزين المستندات: Bucket خاص (وليس عاماً) — كل طالب يصل لمجلده فقط
--    المسار: documents/{user_id}/{application_id}/{requirement_key}
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "own folder upload" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder read" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder update" on storage.objects for update
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);


-- ========================= [ ٣- بطاقة الوصول MDAC ] =========================

-- =====================================================================
-- EduLink MY — الإصدار 3: بطاقة الوصول الرقمية (MDAC)
-- إجراء إلزامي ضمن مرحلة "السفر والاستقبال" (ticket)
-- نفّذ بعد schema.sql و schema-v2.sql
--
-- قاعدة رسمية حاسمة من دائرة الهجرة الماليزية (JIM):
--   • تُقدَّم MDAC خلال 3 أيام (72 ساعة) فقط قبل الوصول — النظام يرفض الأبكر.
--   • مجانية عبر البوابة الرسمية فقط؛ أي رسوم = احتيال.
--   • متطلب منفصل عن التأشيرة (وجود تأشيرة لا يُغني عنها).
--   • كل مسافر يحتاج بطاقته الخاصة.
-- لذلك نجعلها إجراءً موقوتاً (time-gated): يُفتح تلقائياً قبل 3 أيام من الوصول.
-- =====================================================================

-- 1) حقول رحلة الطالب على الطلب (يعبّئها في مرحلة السفر)
alter table public.applications
  add column if not exists arrival_date  date,        -- تاريخ الوصول لماليزيا
  add column if not exists flight_number text,         -- رقم الرحلة (حقل MDAC)
  add column if not exists entry_point   text,         -- منفذ الدخول: KLIA T1 / T2 ...
  add column if not exists address_my    text,         -- عنوان السكن في ماليزيا (حقل MDAC)
  add column if not exists mdac_done      boolean not null default false,
  add column if not exists mdac_ref       text;        -- الرقم المرجعي / رمز QR بعد التقديم

-- 2) رابط MDAC الرسمي + معلومات ثابتة (يُدار من اللوحة، قابل للتحديث)
create table if not exists public.app_config (
  key   text primary key,
  value jsonb not null
);

insert into public.app_config (key, value) values
('mdac', '{
  "official_url": "https://imigresen-online.imi.gov.my/mdac/main",
  "window_days": 3,
  "fee": "RM 0",
  "entry_points": ["KLIA Terminal 1", "KLIA Terminal 2", "Johor - BSI", "Penang International"]
}')
on conflict (key) do update set value = excluded.value;

alter table public.app_config enable row level security;
create policy "public read config" on public.app_config for select using (true);

-- 3) خطوة MDAC كمتطلب موقوت ضمن مرحلة السفر.
--    validation.time_gated = يظهر فقط ضمن نافذة الأيام قبل الوصول.
--    ملاحظة: نستخدم input_type='select' لأنها إجراء خارجي يؤكده الطالب (وليس رفع ملف).
insert into public.requirements (institute_id, key, name, description, input_type, validation, is_required, sort_order) values
(null, 'mdac',
 '{"ar":"بطاقة الوصول الرقمية (MDAC)","en":"Digital Arrival Card (MDAC)","ms":"Kad Ketibaan Digital (MDAC)"}',
 '{"ar":"إجراء حكومي إلزامي لكل مسافر لماليزيا. تُقدَّم مجاناً عبر البوابة الرسمية خلال 3 أيام فقط قبل وصولك (النظام يرفض التقديم الأبكر). عدم تقديمها = تعطّل في المطار. تحذير: أي موقع يطلب رسوماً احتيالي — البوابة الرسمية مجانية تماماً. ملاحظة: هذه غير التأشيرة، ومطلوبة حتى مع الإعفاء من التأشيرة.","en":"A mandatory government step for every traveler to Malaysia. Submit it free on the official portal within only 3 days before arrival (earlier is rejected). Skipping it means airport delays. Warning: any site charging a fee is a scam. Note: this is separate from a visa and required even when visa-exempt.","ms":"Langkah kerajaan wajib untuk setiap pengembara ke Malaysia. Hantar percuma di portal rasmi dalam tempoh 3 hari sebelum ketibaan sahaja."}',
 'select',
 '{"time_gated": true, "days_before": 3, "external": true, "config_key": "mdac"}',
 true, 20)
on conflict do nothing;

-- 4) تحديث شرح مرحلة السفر ليشمل MDAC صراحةً
update public.pipeline_steps set
  explanation = '{"ar":"احجز تذكرتك وأدخل تاريخ الوصول ورقم الرحلة. مهم جداً: عبّئ بطاقة الوصول الرقمية (MDAC) خلال 3 أيام قبل وصولك — سنفتحها لك هنا في وقتها لتتجنب أي تعطّل في المطار.","en":"Book your flight and enter your arrival date and flight number. Very important: complete the Digital Arrival Card (MDAC) within 3 days before arrival — we open it here at the right time so you avoid airport delays.","ms":"Tempah penerbangan dan masukkan butiran. Penting: lengkapkan MDAC dalam tempoh 3 hari sebelum ketibaan."}',
  your_action = '{"ar":"أدخل تاريخ وصولك ورقم الرحلة، ثم قدّم بطاقة MDAC عند فتحها.","en":"Enter your arrival date and flight number, then submit the MDAC when it opens.","ms":"Masukkan tarikh ketibaan dan nombor penerbangan, kemudian hantar MDAC."}'
where status = 'ticket';

-- 5) FAQ عن MDAC (يظهر سياقياً في مرحلتي السفر والتأشيرة)
insert into public.faq (question, answer, context_tags, sort_order) values
('{"ar":"ما هي بطاقة الوصول الرقمية MDAC ومتى أعبّئها؟","en":"What is the MDAC and when do I fill it?","ms":"Apakah MDAC dan bila perlu diisi?"}',
 '{"ar":"إجراء حكومي إلزامي لكل مسافر لماليزيا (منفصل عن التأشيرة). تُقدَّم مجاناً عبر البوابة الرسمية خلال 3 أيام فقط قبل الوصول — النظام يرفض الأبكر. التطبيق يفتحها لك تلقائياً في وقتها ضمن مرحلة السفر. تحذير: أي موقع يطلب رسوماً احتيالي.","en":"A mandatory government step for every traveler (separate from a visa). Submit it free on the official portal within only 3 days before arrival — earlier is rejected. The app opens it for you at the right time in the travel stage. Warning: any site charging a fee is a scam.","ms":"Langkah kerajaan wajib (berasingan daripada visa). Hantar percuma dalam 3 hari sebelum ketibaan."}',
 '{ticket,visa}', 6)
on conflict do nothing;


-- ========================= [ ٤- الشركاء والعمولات ] =========================

-- =====================================================================
-- EduLink MY — الإصدار 4: الشركاء والعمولات وتدفق البيانات
-- نفّذ بعد schema.sql, schema-v2.sql, schema-v3.sql
--
-- يضيف نموذج العمل:
--   1) الشركاء (معاهد/سكن) وحساباتهم وبوابتهم.
--   2) موافقة الطالب الصريحة قبل مشاركة ملفه (شرط قانوني وأخلاقي).
--   3) العمولات: تُسجَّل تلقائياً عند اكتمال الطلب، ثم تُفوتر وتُسدَّد.
--   4) سجل تحويل البيانات + Webhooks.
--   5) عروض (Views) جاهزة للتقارير والإحصائيات.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) الشركاء
-- ---------------------------------------------------------------
create table public.partners (
  id             uuid primary key default gen_random_uuid(),
  type           text not null check (type in ('institute','housing','service')),
  name           jsonb not null,
  contact_email  text,
  contact_phone  text,
  -- نموذج العمولة: نسبة مئوية من قيمة الكورس، أو مبلغ ثابت لكل طالب
  commission_type text not null default 'percent' check (commission_type in ('percent','fixed')),
  commission_rate numeric(10,2) not null default 0,   -- 8 = 8% أو 150 = RM150 ثابت
  -- طرق تسليم البيانات المفعّلة لهذا الشريك
  delivery_portal  boolean not null default true,
  delivery_webhook boolean not null default false,
  delivery_email   boolean not null default false,
  webhook_url      text,
  webhook_secret   text,                              -- لتوقيع الطلبات (HMAC)
  status         text not null default 'pending' check (status in ('pending','connected','disabled')),
  created_at     timestamptz not null default now()
);

-- ربط المعاهد/الإعلانات بالشريك المالك
alter table public.institutes add column if not exists partner_id uuid references public.partners (id);
alter table public.listings   add column if not exists partner_id uuid references public.partners (id);

-- مستخدمو بوابة الشريك: يربط حساب auth بشريك معيّن
create table public.partner_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  role       text not null default 'staff' check (role in ('owner','staff')),
  created_at timestamptz not null default now()
);

-- دالة مساعدة: معرّف الشريك للمستخدم الحالي (تُستخدم في سياسات RLS)
create or replace function public.current_partner_id()
returns uuid language sql stable security definer set search_path = public as $$
  select partner_id from public.partner_users where user_id = auth.uid();
$$;

-- دور المسؤول (فريقك) — يرى كل شيء
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------
-- 2) موافقة الطالب على مشاركة ملفه (شرط قبل أي تحويل بيانات)
--    الموافقة لكل (طلب + شريك) على حدة — وليست موافقة عامة.
-- ---------------------------------------------------------------
create table public.data_consents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  partner_id     uuid not null references public.partners (id) on delete cascade,
  granted        boolean not null default false,
  granted_at     timestamptz,
  revoked_at     timestamptz,                 -- للطالب حق السحب في أي وقت
  unique (application_id, partner_id)
);

-- ---------------------------------------------------------------
-- 3) سجل تحويل البيانات للشركاء
-- ---------------------------------------------------------------
create table public.data_transfers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  partner_id     uuid not null references public.partners (id) on delete cascade,
  method         text not null check (method in ('portal','webhook','email')),
  status         text not null default 'awaiting_consent'
                 check (status in ('awaiting_consent','sent','viewed','failed')),
  error          text,
  sent_at        timestamptz,
  viewed_at      timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 4) العمولات
-- ---------------------------------------------------------------
create table public.commissions (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  partner_id     uuid not null references public.partners (id),
  base_amount    numeric(12,2) not null,      -- قيمة الكورس بالرينغت (أساس الحساب)
  amount         numeric(12,2) not null,      -- العمولة المحسوبة
  currency       text not null default 'MYR',
  status         text not null default 'due' check (status in ('due','invoiced','paid','cancelled')),
  invoice_ref    text,
  invoiced_at    timestamptz,
  paid_at        timestamptz,
  note           text,
  created_at     timestamptz not null default now(),
  unique (application_id, partner_id)         -- عمولة واحدة لكل طلب/شريك
);
create index commissions_status_idx on public.commissions (status, created_at desc);

/**
 * تسجيل العمولة تلقائياً عند اكتمال الطلب (وصول الطالب).
 * تحسب القيمة من سعر المعهد × عدد الأسابيع، ثم تطبّق نموذج عمولة الشريك.
 * لماذا عند completed؟ لأنها اللحظة التي تتحقق فيها القيمة فعلياً.
 */
create or replace function public.record_commission()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_partner  uuid;
  v_price    numeric;
  v_base     numeric;
  v_type     text;
  v_rate     numeric;
  v_amount   numeric;
begin
  if new.status = 'completed' and coalesce(old.status, '') <> 'completed' then
    select i.partner_id, i.price_myr into v_partner, v_price
    from public.institutes i where i.id = new.institute_id;

    if v_partner is null then return new; end if;

    v_base := coalesce(v_price, 0) * coalesce(new.weeks, 0);

    select commission_type, commission_rate into v_type, v_rate
    from public.partners where id = v_partner;

    v_amount := case when v_type = 'percent' then v_base * (v_rate / 100.0) else v_rate end;

    insert into public.commissions (application_id, partner_id, base_amount, amount)
    values (new.id, v_partner, v_base, round(v_amount, 2))
    on conflict (application_id, partner_id) do nothing;
  end if;
  return new;
end $$;

create trigger on_application_completed
  after update on public.applications
  for each row execute function public.record_commission();

-- ---------------------------------------------------------------
-- 5) عروض التقارير (Views) — تُقرأ مباشرة من اللوحة
-- ---------------------------------------------------------------

-- الطلبات شهرياً
create or replace view public.v_apps_monthly as
select date_trunc('month', created_at)::date as month,
       count(*)                                as total,
       count(*) filter (where status = 'completed') as completed
from public.applications
group by 1 order by 1;

-- مسار التسجيل (Funnel)
create or replace view public.v_funnel as
select
  count(*)                                                              as started,
  count(*) filter (where status <> 'documents')                         as docs_done,
  count(*) filter (where status in ('offer','payment','visa','ticket','completed')) as accepted,
  count(*) filter (where status = 'completed')                          as completed
from public.applications;

-- أداء الشركاء (طلاب + عمولات)
create or replace view public.v_partner_performance as
select p.id,
       p.name,
       p.type,
       count(distinct a.id)                                    as students,
       coalesce(sum(c.amount) filter (where c.status = 'paid'), 0) as earned_paid,
       coalesce(sum(c.amount) filter (where c.status <> 'paid'), 0) as earned_due
from public.partners p
left join public.institutes i on i.partner_id = p.id
left join public.applications a on a.institute_id = i.id and a.status = 'completed'
left join public.commissions c on c.partner_id = p.id
group by p.id, p.name, p.type;

-- ---------------------------------------------------------------
-- 6) الأمان (RLS): الشريك يرى طلابه فقط وبعد الموافقة
-- ---------------------------------------------------------------
alter table public.partners        enable row level security;
alter table public.partner_users   enable row level security;
alter table public.admin_users     enable row level security;
alter table public.data_consents   enable row level security;
alter table public.data_transfers  enable row level security;
alter table public.commissions     enable row level security;

-- المسؤول: صلاحية كاملة على كل شيء
create policy "admin all partners"    on public.partners       for all using (is_admin()) with check (is_admin());
create policy "admin all commissions" on public.commissions    for all using (is_admin()) with check (is_admin());
create policy "admin all transfers"   on public.data_transfers for all using (is_admin()) with check (is_admin());
create policy "admin all pusers"      on public.partner_users  for all using (is_admin()) with check (is_admin());

-- الشريك: يقرأ بيانات شركته وعمولاته فقط
create policy "partner reads self" on public.partners for select
  using (id = current_partner_id());
create policy "partner reads own commissions" on public.commissions for select
  using (partner_id = current_partner_id());
create policy "partner reads own transfers" on public.data_transfers for select
  using (partner_id = current_partner_id());

/**
 * جوهر الأمان: الشريك يرى الطلب فقط إذا:
 *   (أ) الطلب لأحد معاهده، و
 *   (ب) الطالب منح موافقة صريحة سارية (غير مسحوبة).
 * بدون الموافقة لا يرى الشريك شيئاً — تُطبَّق على مستوى قاعدة البيانات لا التطبيق.
 */
create policy "partner reads consented applications" on public.applications for select
  using (
    exists (
      select 1
      from public.institutes i
      join public.data_consents dc
        on dc.application_id = applications.id
       and dc.partner_id = i.partner_id
      where i.id = applications.institute_id
        and i.partner_id = current_partner_id()
        and dc.granted is true
        and dc.revoked_at is null
    )
  );

-- ونفس الشرط لمستندات الطلب
create policy "partner reads consented documents" on public.application_documents for select
  using (
    exists (
      select 1
      from public.applications a
      join public.institutes i on i.id = a.institute_id
      join public.data_consents dc
        on dc.application_id = a.id and dc.partner_id = i.partner_id
      where a.id = application_documents.application_id
        and i.partner_id = current_partner_id()
        and dc.granted is true
        and dc.revoked_at is null
    )
  );

-- الطالب: يقرأ ويمنح/يسحب موافقته بنفسه
create policy "student reads own consents" on public.data_consents for select
  using (application_id in (select id from public.applications where user_id = auth.uid()));
create policy "student manages own consents" on public.data_consents for all
  using (application_id in (select id from public.applications where user_id = auth.uid()))
  with check (application_id in (select id from public.applications where user_id = auth.uid()));

-- الشريك يقرأ ملف مستخدمه فقط
create policy "partner user self" on public.partner_users for select using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- 7) بيانات تجريبية
-- ---------------------------------------------------------------
insert into public.partners (type, name, commission_type, commission_rate, delivery_portal, delivery_webhook, status)
values ('institute', '{"ar":"مركز اللغة الإنجليزية - كوالالمبور","en":"English Language Centre KL"}', 'percent', 8, true, true, 'connected')
on conflict do nothing;


-- ========================= [ ٥- بيانات المعاهد ] =========================

-- =====================================================================
-- EduLink MY — بيانات المعاهد الحقيقية (Seed Data)
-- تاريخ الجمع: 14 يوليو 2026
--
-- مصادر البيانات ودرجة الثقة:
--   ✅ موثّق (اسم، عنوان، إحداثيات، تقييم Google، هاتف): Google Places API
--   ✅ موثّق (الاعتماد): مواقع المعاهد الرسمية + موقع الهجرة الماليزية
--   ⚠️ إرشادي (الأسعار): من منصات وسيطة، تتغير كل فصل — أكّدها من المعهد
--      قبل النشر. مصادر مختلفة أعطت أرقاماً متضاربة لنفس المعهد.
--   ❌ غير مضمّن (الصور): محمية بحقوق ملكية — اطلبها من المعاهد ضمن
--      اتفاقية الشراكة (سيعطونك حزمة رسمية عالية الجودة مجاناً).
--
-- ملاحظة: price_myr هنا = السعر الأسبوعي التقريبي (لتوافق مخطط قاعدة البيانات).
-- الأسعار الفعلية شهرية؛ حُسبت بالقسمة على 4.33 وتحتاج تأكيداً.
-- =====================================================================

-- ---------------------------------------------------------------
-- تنظيف البيانات التجريبية السابقة
-- ---------------------------------------------------------------
delete from public.institutes where slug = 'elc-kuala-lumpur';

-- ---------------------------------------------------------------
-- حقول إضافية تحتاجها البيانات الحقيقية
-- ---------------------------------------------------------------
alter table public.institutes
  add column if not exists rating          numeric(2,1),      -- تقييم Google
  add column if not exists rating_count    int,               -- عدد المراجعات
  add column if not exists website         text,
  add column if not exists phone           text,
  add column if not exists address         text,
  add column if not exists accreditation   jsonb default '[]',-- ["MOE","KDN","EMGS"]
  add column if not exists programs        jsonb default '[]',-- البرامج المترجمة
  add column if not exists hours_per_week  int,
  add column if not exists levels_count    int,
  add column if not exists min_age         int default 18,
  add column if not exists max_age         int default 45,
  add column if not exists price_verified  boolean default false,  -- هل أكّدت السعر؟
  add column if not exists extra_fees      jsonb default '[]',  -- رسوم إضافية موثّقة (يُستخدم أدناه قبل ملف الأسعار)
  add column if not exists data_source     text;               -- مصدر البيانات

-- =====================================================================
-- 1) EMS Language Centre (English Made Simple)
--    ✅ الأقوى توثيقاً: MOE + KDN، موقع عربي رسمي، خبرة منذ 2011
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, website, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, hours_per_week, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'ems-language-centre',
  '{"ar":"مركز EMS للغة الإنجليزية (English Made Simple)","en":"EMS Language Centre (English Made Simple)","ms":"Pusat Bahasa EMS"}',
  '{"ar":"من أعرق المعاهد في كوالالمبور وأكثرها توثيقاً. تأسس 2011 تحت شركة Citinetics (خبرة +30 سنة في التدريب). معتمد من وزارة التعليم الماليزية (MOE) ومرخّص من وزارة الداخلية (KDN) لقبول الطلاب الدوليين. يقع على بُعد دقائق مشياً من برجي بتروناس ومحطة KLCC. خيار شائع جداً لطلاب الشرق الأوسط وشمال أفريقيا، ويوفر موقعاً رسمياً بالعربية. 10 مستويات من المبتدئ للمتقدم؛ المستوى العاشر يعادل IELTS 5.5. يضم مصلّى ومختبر لغة ومكتبة، ونظام English Only Zones لفرض التحدث بالإنجليزية داخل المركز. رحلات وأنشطة كل جمعة (Cool Fridays).","en":"One of KL''s most established and best-documented centres. Founded 2011 under Citinetics (30+ years in training). Approved by Malaysia''s Ministry of Education (MOE) and licensed by the Ministry of Home Affairs (KDN) to enrol international students. Minutes on foot from the Petronas Twin Towers and KLCC LRT. Very popular with Middle-Eastern and North African students, with an official Arabic website. 10 levels from beginner to advanced; level 10 equals roughly IELTS 5.5. Facilities include a prayer room, language lab and library, plus English Only Zones. Weekly trips and activities (Cool Fridays).","ms":"Pusat bahasa mapan di KL, diluluskan MOE dan dilesenkan KDN untuk pelajar antarabangsa. Berdekatan KLCC."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  665.00,   -- ⚠️ تقريبي: ~RM2,880/شهر (من وكيل) ÷ 4.33 — أكّده
  4, 48,
  '[{"ar":"معتمد من وزارة التعليم (MOE)","en":"MOE approved","ms":"Diluluskan MOE"},
    {"ar":"مرخّص لقبول الدوليين (KDN)","en":"KDN licensed for international students","ms":"Dilesenkan KDN"},
    {"ar":"موقع رسمي بالعربية","en":"Official Arabic website","ms":"Laman web Arab rasmi"},
    {"ar":"مصلّى داخل المركز","en":"Prayer room on site","ms":"Surau"},
    {"ar":"على بُعد دقائق من KLCC","en":"Minutes from KLCC","ms":"Beberapa minit dari KLCC"},
    {"ar":"مساعدة في السكن","en":"Accommodation help","ms":"Bantuan penginapan"},
    {"ar":"استشارات جامعية مجانية","en":"Free university consultancy","ms":"Perundingan universiti percuma"}]',
  '{}',   -- ❌ الصور: اطلبها من المعهد
  '60321811219', '+60 3-2181 1219', 'https://ems.edu.my',
  'B-7-1, B-7-2, B-7-3, Block B, Megan Avenue 2, Jalan Yap Kwan Seng, 50450 Kuala Lumpur',
  3.1617137, 101.7117827,
  4.6, 522,
  '["MOE","KDN","EMGS"]',
  '[{"ar":"الإنجليزية العامة المكثفة (IGE)","en":"Intensive General English (IGE)","ms":"Bahasa Inggeris Am Intensif"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"},
    {"ar":"تحضير PTE (بيرسون)","en":"PTE Preparation","ms":"Persediaan PTE"},
    {"ar":"الإنجليزية للعمل","en":"English for Work","ms":"Bahasa Inggeris untuk Kerja"},
    {"ar":"كورس المحادثة","en":"Speaking Course","ms":"Kursus Pertuturan"},
    {"ar":"كورس الكتابة","en":"Writing Course","ms":"Kursus Penulisan"},
    {"ar":"المعسكر الصيفي/الشتوي","en":"Summer/Winter Camp","ms":"Kem Musim Panas"}]',
  30, 10, 18, 45,
  false,
  'Google Places + ems.edu.my (official) — 2026-07-14',
  true, 1
);

-- =====================================================================
-- 2) Bright Language Center
--    ✅ أسعاره الأوضح توثيقاً بين الجميع
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, hours_per_week, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'bright-language-center',
  '{"ar":"مركز برايت للغات","en":"Bright Language Center","ms":"Pusat Bahasa Bright"}',
  '{"ar":"مركز نشط في قلب كوالالمبور (Megan Avenue 2) بتقييم عالٍ ومراجعات كثيرة من طلاب عرب وآسيويين وأوروبيين. يقدّم 28-30 ساعة تدريس أسبوعياً بمنهج Headway العالمي، مع 10 مستويات وبرامج IELTS. أسعاره من أوضح الأسعار المنشورة: حوالي RM1,650 شهرياً للحجوزات من 4 أشهر فأكثر. يشتهر بالأنشطة والرحلات وبيئة متعددة الجنسيات. يوفر أيضاً برامج للصغار (Bright Flex/Elite) في الفترات الصيفية.","en":"An active, highly-rated centre in central KL (Megan Avenue 2) with many reviews from Arab, Asian and European students. Offers 28–30 teaching hours weekly using the international Headway coursebook, 10 levels and IELTS programs. Its pricing is among the most clearly published: roughly RM1,650/month for bookings of 4+ months. Known for activities, trips and a multinational environment. Also runs junior programs (Bright Flex/Elite) in summer.","ms":"Pusat aktif di tengah KL dengan penilaian tinggi. 28-30 jam seminggu menggunakan Headway."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  381.00,   -- ⚠️ RM1,650/شهر ÷ 4.33 ≈ RM381/أسبوع (+RM100 SST شهرياً)
  4, 48,
  '[{"ar":"منهج Headway العالمي","en":"Headway international coursebook","ms":"Buku Headway"},
    {"ar":"30 ساعة أسبوعياً","en":"30 hours per week","ms":"30 jam seminggu"},
    {"ar":"10 مستويات + IELTS","en":"10 levels + IELTS","ms":"10 tahap + IELTS"},
    {"ar":"أسعار واضحة ومنشورة","en":"Clearly published pricing","ms":"Harga jelas"},
    {"ar":"أنشطة ورحلات دورية","en":"Regular activities & trips","ms":"Aktiviti & lawatan"},
    {"ar":"بيئة متعددة الجنسيات","en":"Multinational environment","ms":"Persekitaran pelbagai bangsa"}]',
  '{}',
  '60321816496', '+60 3-2181 6496',
  'Unit A-5-1, A-5-2, A-6-1, Block A, Megan Avenue 2, Jalan Yap Kwan Seng, 50450 Kuala Lumpur',
  3.1628878, 101.7126118,
  4.7, 334,
  '["MOE"]',
  '[{"ar":"الإنجليزية العامة المكثفة","en":"Intensive General English","ms":"Bahasa Inggeris Am Intensif"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"},
    {"ar":"برنامج الصغار (صيفي)","en":"Junior program (summer)","ms":"Program Junior"}]',
  30, 10, 18, 44,
  false,
  'Google Places + languagecourse.net (aggregator) — 2026-07-14',
  true, 2
);

-- =====================================================================
-- 3) ELS Language Centres Kuala Lumpur
--    ✅ العلامة العالمية الأعرق: شبكة منذ 1961، في ماليزيا منذ 1990
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, website, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, hours_per_week, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'els-kuala-lumpur',
  '{"ar":"مراكز ELS للغات - كوالالمبور","en":"ELS Language Centres Kuala Lumpur","ms":"Pusat Bahasa ELS Kuala Lumpur"}',
  '{"ar":"الاسم الأعرق عالمياً في هذه القائمة: شبكة ELS تأسست في واشنطن 1961 ولها +60 مركزاً في أمريكا، وفرع ماليزيا قائم منذ 1990 (خبرة +30 سنة محلياً). ميزته الحاسمة: خريجوه معفون من تقديم IELTS أو TOEFL عند التقديم لأكثر من 650 جامعة حول العالم — وهذا يوفر على الطالب وقتاً ومالاً كبيرين إن كان هدفه الجامعة. معتمد من وزارة التعليم و EMGS و IDP. يقع في المثلث الذهبي (منطقة الأعمال) على بُعد 10 دقائق مشياً من محطة KLCC. 30 ساعة أسبوعياً، والفصول بحد أقصى 20 طالباً. يشترط على الطلاب الدوليين التسجيل 4 أشهر كحد أدنى.","en":"The most globally established name here: the ELS network began in Washington D.C. in 1961 with 60+ US centres, and its Malaysia branch has operated since 1990 (30+ years locally). Its decisive advantage: graduates are exempt from submitting IELTS or TOEFL when applying to 650+ universities worldwide — a major saving of time and money for university-bound students. Accredited by the Ministry of Education, EMGS and IDP. Located in the Golden Triangle business district, a 10-minute walk from KLCC LRT. 30 hours weekly, max 20 students per class. International students must enrol for a minimum of 4 months.","ms":"Rangkaian global ELS sejak 1961, di Malaysia sejak 1990. Graduan dikecualikan IELTS/TOEFL untuk 650+ universiti."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,   -- ⚠️ لم يُنشر سعر موثوق — اطلبه من المعهد مباشرة
  16, 48, -- الحد الأدنى 4 أشهر للطلاب الدوليين
  '[{"ar":"إعفاء من IELTS لـ +650 جامعة","en":"IELTS waiver at 650+ universities","ms":"Pengecualian IELTS 650+ universiti"},
    {"ar":"شبكة عالمية منذ 1961","en":"Global network since 1961","ms":"Rangkaian global sejak 1961"},
    {"ar":"معتمد MOE + EMGS + IDP","en":"MOE + EMGS + IDP accredited","ms":"Diiktiraf MOE + EMGS + IDP"},
    {"ar":"حد أقصى 20 طالباً بالفصل","en":"Max 20 students per class","ms":"Maksimum 20 pelajar"},
    {"ar":"المثلث الذهبي - قرب KLCC","en":"Golden Triangle near KLCC","ms":"Golden Triangle"},
    {"ar":"مسار جامعي معتمد","en":"University pathway","ms":"Laluan universiti"}]',
  '{}',
  '60392128167', '+60 3-9212 8167', 'https://www.els.edu.my',
  'A-3-1 & A-3-2, Wisma HB, Megan Avenue 2, 12, Jalan Yap Kwan Seng, 50450 Kuala Lumpur',
  3.1618593, 101.7117667,
  4.6, 156,
  '["MOE","EMGS","IDP"]',
  '[{"ar":"الإنجليزية العامة المكثفة","en":"Intensive English","ms":"Bahasa Inggeris Intensif"},
    {"ar":"إنجليزية الأعمال","en":"Business English","ms":"Bahasa Inggeris Perniagaan"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"},
    {"ar":"تحضير TOEFL","en":"TOEFL Preparation","ms":"Persediaan TOEFL"},
    {"ar":"تحضير CAE و FCE","en":"CAE & FCE Preparation","ms":"Persediaan CAE & FCE"},
    {"ar":"دروس فردية","en":"One-to-one lessons","ms":"Kelas persendirian"}]',
  30, 10, 18, 45,
  false,
  'Google Places + your-uni.com + smapse.com — 2026-07-14 ⚠️ السعر غير منشور',
  true, 3
);

-- =====================================================================
-- 4) Big Ben Education Group
--    ✅ الأعلى في عدد المراجعات (987) — مؤشر حجم قوي
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, hours_per_week, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'big-ben-education',
  '{"ar":"مجموعة بيغ بن التعليمية","en":"Big Ben Education Group","ms":"Big Ben Education Group"}',
  '{"ar":"الأعلى في عدد المراجعات بين معاهد كوالالمبور (987 مراجعة بتقييم 4.9) — مؤشر قوي على حجم الطلاب وحيويته. يقع في Megan Avenue 2 قرب KLCC. تتكرر في مراجعات طلابه العرب الإشادة بالمعلمين والبيئة الودودة، ويضم مقهى داخلياً يذكره الطلاب كثيراً. بيئة متعددة الجنسيات. ⚠️ لم نجد وثيقة رسمية منشورة تؤكد اعتماده لدى EMGS — تحقق من ترخيصه لقبول الطلاب الدوليين قبل الشراكة.","en":"The highest review count among KL centres (987 reviews at 4.9★) — a strong signal of student volume and activity. Located at Megan Avenue 2 near KLCC. Arab students'' reviews repeatedly praise the teachers and friendly atmosphere, and the in-house café is frequently mentioned. Multinational environment. ⚠️ We found no published official document confirming EMGS registration — verify its licence to enrol international students before partnering.","ms":"Bilangan ulasan tertinggi di KL (987 ulasan, 4.9★). Terletak di Megan Avenue 2 berhampiran KLCC."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,   -- ⚠️ غير منشور
  4, 48,
  '[{"ar":"الأعلى تقييماً وعدد مراجعات","en":"Highest rating & review count","ms":"Penilaian & ulasan tertinggi"},
    {"ar":"قرب KLCC","en":"Near KLCC","ms":"Berhampiran KLCC"},
    {"ar":"مقهى داخل المعهد","en":"In-house café","ms":"Kafe dalaman"},
    {"ar":"بيئة متعددة الجنسيات","en":"Multinational environment","ms":"Persekitaran pelbagai bangsa"}]',
  '{}',
  '60358705588', '+60 3-5870 5588',
  'B-0-10, Megan Avenue 2, Jalan Yap Kwan Seng, 50450 Kuala Lumpur',
  3.1628878, 101.7126118,
  4.9, 987,
  '[]',   -- ⚠️ يحتاج تحقق
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"}]',
  null, null, 18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ الاعتماد والسعر يحتاجان تحققاً',
  false, 4   -- is_active = false حتى تتحقق من الاعتماد
);

-- =====================================================================
-- 5) Manchester Language Centre (Mont Kiara)
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'manchester-language-centre',
  '{"ar":"مركز مانشستر للغة","en":"Manchester Language Centre","ms":"Pusat Bahasa Manchester"}',
  '{"ar":"تقييم مثالي 5.0 من 297 مراجعة. يقع في مونت كيارا — الحي الراقي للمغتربين في كوالالمبور، وهو موقع مختلف عن باقي المعاهد المتجمعة قرب KLCC، ومناسب لمن يفضّل بيئة أهدأ وأرقى. مراجعات الطلاب تُشيد بمعلمين ناطقين أصليين وبيئة دولية (طلاب من أوروبا وآسيا الوسطى). ⚠️ الاعتماد والأسعار تحتاج تأكيداً مباشراً.","en":"A perfect 5.0 rating from 297 reviews. Located in Mont Kiara — KL''s upscale expat neighbourhood — a different setting from the cluster near KLCC, suiting those who prefer a quieter, more upmarket environment. Reviews praise native-speaker teachers and an international mix (European and Central Asian students). ⚠️ Accreditation and pricing need direct confirmation.","ms":"Penilaian 5.0 daripada 297 ulasan. Terletak di Mont Kiara, kawasan ekspatriat."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"تقييم مثالي 5.0","en":"Perfect 5.0 rating","ms":"Penilaian 5.0"},
    {"ar":"مونت كيارا - حي المغتربين","en":"Mont Kiara expat area","ms":"Mont Kiara"},
    {"ar":"معلمون ناطقون أصليون","en":"Native-speaker teachers","ms":"Guru penutur asli"},
    {"ar":"دوام مسائي حتى 8م","en":"Open until 8pm","ms":"Buka hingga 8 malam"}]',
  '{}',
  '601111015154', '+60 11-1101 5154',
  'Premier Suite, No: 21.02, Menara 1, Mont Kiara, 50480 Kuala Lumpur',
  3.1657965, 101.6531132,
  5.0, 297,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ يحتاج تحققاً',
  false, 5
);

-- =====================================================================
-- 6) Stratford International Language Centre
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'stratford-international',
  '{"ar":"مركز ستراتفورد الدولي للغات","en":"Stratford International Language Centre","ms":"Pusat Bahasa Antarabangsa Stratford"}',
  '{"ar":"تقييم 4.8 من 187 مراجعة. يقع في برج G Tower على شارع تون رزاق — مبنى مكاتب راقٍ. مراجعات الطلاب (كثير منهم من آسيا الوسطى وروسيا) تُشيد ببرنامج تحضير IELTS وبالتركيز العملي على المحادثة وكسر حاجز الخوف من الكلام. ⚠️ الاعتماد والأسعار تحتاج تأكيداً.","en":"Rated 4.8 from 187 reviews. Located in G Tower on Jalan Tun Razak — an upscale office building. Student reviews (many from Central Asia and Russia) praise the IELTS preparation program and the practical focus on speaking and overcoming the fear of making mistakes. ⚠️ Accreditation and pricing need confirmation.","ms":"Penilaian 4.8 daripada 187 ulasan. Terletak di G Tower, Jalan Tun Razak."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"برنامج IELTS قوي","en":"Strong IELTS program","ms":"Program IELTS kukuh"},
    {"ar":"تركيز على المحادثة","en":"Speaking-focused","ms":"Fokus pertuturan"},
    {"ar":"برج G Tower الراقي","en":"Upscale G Tower","ms":"G Tower"}]',
  '{}',
  '60350333118', '+60 3-5033 3118',
  'Suite 17-01, 17-03 & 17-06, Level 17, G Tower, 199 Jalan Tun Razak, 50400 Kuala Lumpur',
  3.1590931, 101.7199587,
  4.8, 187,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ يحتاج تحققاً',
  false, 6
);

-- =====================================================================
-- 7) California KL Language Academy (KLCC)
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'california-kl-academy',
  '{"ar":"أكاديمية كاليفورنيا كوالالمبور للغات","en":"California KL Language Academy","ms":"Akademi Bahasa California KL"}',
  '{"ar":"يقع داخل مجمّع Avenue K التجاري مقابل برجي بتروناس مباشرة — أفضل موقع من ناحية السهولة والمواصلات (فوق محطة KLCC). يفتح 7 أيام أسبوعياً حتى 10 مساءً، وهي مرونة نادرة. معلمون ناطقون بالإنجليزية الأمريكية. يقدّم معسكرات صيفية وشتوية. تقييمه 4.4 (137 مراجعة) وهو أقل من غيره لكن ضمن النطاق الجيد. ⚠️ الاعتماد والأسعار تحتاج تأكيداً.","en":"Located inside the Avenue K mall directly opposite the Petronas Twin Towers — the most convenient location of all (above KLCC station). Open 7 days a week until 10pm, unusually flexible. American-English native teachers. Runs summer and winter camps. Rated 4.4 (137 reviews), lower than others but still solid. ⚠️ Accreditation and pricing need confirmation.","ms":"Terletak di dalam Avenue K bertentangan Menara Berkembar Petronas. Buka 7 hari hingga 10 malam."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"مقابل برجي بتروناس","en":"Opposite Petronas Towers","ms":"Bertentangan Menara Petronas"},
    {"ar":"مفتوح 7 أيام حتى 10م","en":"Open 7 days until 10pm","ms":"Buka 7 hari hingga 10 malam"},
    {"ar":"إنجليزية أمريكية","en":"American English","ms":"Bahasa Inggeris Amerika"},
    {"ar":"معسكرات صيفية وشتوية","en":"Summer & winter camps","ms":"Kem musim panas & sejuk"},
    {"ar":"داخل مجمّع تجاري","en":"Inside a shopping mall","ms":"Dalam pusat beli-belah"}]',
  '{}',
  '601123591043', '+60 11-2359 1043',
  'Lot 16A, Level 2, Avenue K Shopping Mall, 156 Jalan Ampang, 50450 Kuala Lumpur',
  3.1594766, 101.7135149,
  4.4, 137,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"},
    {"ar":"المعسكر الصيفي/الشتوي","en":"Summer/Winter Camp","ms":"Kem"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ يحتاج تحققاً',
  false, 7
);

-- =====================================================================
-- 8) ELC (English Language Company) Malaysia — Bukit Bintang
--    ⚠️ تنبيه: مراجعة تشير لتغيير السعر حسب الجنسية — راجع التقرير
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'elc-bukit-bintang',
  '{"ar":"شركة اللغة الإنجليزية ELC - بوكيت بينتانج","en":"ELC (English Language Company) Malaysia","ms":"ELC Malaysia"}',
  '{"ar":"يقع في بوكيت بينتانج (منطقة التسوق والحياة الليلية). بيئة متعددة الجنسيات (يابان، الصين، روسيا، كوريا). ⚠️ تنبيه مهم: مراجعة عامة تتهم المعهد برفع السعر بعد رؤية جنسية الطالب، ومراجعة أخرى ترى أن الكورس المكثف ركّز على القواعد أكثر من المهارات. تقييمه 4.3 هو الأدنى في القائمة. راجع هذه النقاط بدقة قبل أي شراكة.","en":"Located in Bukit Bintang (shopping and nightlife district). Multinational mix (Japan, China, Russia, Korea). ⚠️ Important caution: a public review accuses the centre of raising the quoted price after seeing the student''s nationality, and another felt the intensive course over-focused on grammar. Its 4.3 rating is the lowest here. Review these points carefully before partnering.","ms":"Terletak di Bukit Bintang. Persekitaran pelbagai bangsa."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"بوكيت بينتانج","en":"Bukit Bintang","ms":"Bukit Bintang"},
    {"ar":"بيئة متعددة الجنسيات","en":"Multinational environment","ms":"Pelbagai bangsa"}]',
  '{}',
  '60321488211', '+60 3-2148 8211',
  '3.01, 3rd Floor, Jalan Bukit Bintang, 50480 Kuala Lumpur',
  3.1450227, 101.7088126,
  4.3, 89,
  '[]',
  '[{"ar":"الإنجليزية العامة المكثفة","en":"Intensive General English","ms":"Bahasa Inggeris Intensif"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ يحتاج تحققاً + تنبيه تسعير',
  false, 8
);

-- =====================================================================
-- 9) Direct English International Language Centre
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'direct-english-kl',
  '{"ar":"مركز دايركت إنجلش الدولي","en":"Direct English International Language Centre","ms":"Direct English"}',
  '{"ar":"تقييم 5.0 لكن من 18 مراجعة فقط (عيّنة صغيرة — تعامل معها بحذر). يقع قرب بوكيت نانس. مراجعات الطلاب (اليابان، الصين، فرنسا، روسيا، ميانمار) تُشيد بالفصول الصغيرة والتدريس بإيقاع يناسب مستوى الطالب. ⚠️ الاعتماد والأسعار تحتاج تأكيداً.","en":"Rated 5.0 but from only 18 reviews (small sample — treat with caution). Located near Bukit Nanas. Reviews (Japan, China, France, Russia, Myanmar) praise small classes and teaching paced to the student''s level. ⚠️ Accreditation and pricing need confirmation.","ms":"Penilaian 5.0 daripada 18 ulasan sahaja. Berhampiran Bukit Nanas."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"فصول صغيرة","en":"Small classes","ms":"Kelas kecil"},
    {"ar":"بيئة دولية","en":"International mix","ms":"Antarabangsa"}]',
  '{}',
  '60320224138', '+60 3-2022 4138',
  'Level 3, Jalan Bukit Nanas, 50250 Kuala Lumpur',
  3.150168, 101.6985123,
  5.0, 18,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ عيّنة مراجعات صغيرة',
  false, 9
);

-- =====================================================================
-- 10) Excel Language Center Malaysia (KL)
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'excel-language-kl',
  '{"ar":"مركز إكسل للغات","en":"Excel Language Center Malaysia","ms":"Pusat Bahasa Excel"}',
  '{"ar":"تقييم 5.0 من 21 مراجعة فقط (عيّنة صغيرة). يقع في Megan Avenue 4. مراجعات الطلاب تذكر أن رسومه أقل نسبياً من غيره، ومرافقه حديثة بعد تجديد. يستخدم أسلوباً عملياً (Simulation Street) لفرض التحدث من اليوم الأول، وبرنامج IELTS. ⚠️ الاعتماد والأسعار تحتاج تأكيداً.","en":"Rated 5.0 from only 21 reviews (small sample). Located at Megan Avenue 4. Reviews note relatively lower fees than others and modern, recently refurbished facilities. Uses a practical approach (Simulation Street) to force speaking from day one, plus IELTS prep. ⚠️ Accreditation and pricing need confirmation.","ms":"Penilaian 5.0 daripada 21 ulasan. Yuran agak rendah, kemudahan moden."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"رسوم أقل نسبياً","en":"Relatively lower fees","ms":"Yuran lebih rendah"},
    {"ar":"مرافق مجددة حديثاً","en":"Recently refurbished","ms":"Kemudahan baharu"},
    {"ar":"أسلوب Simulation Street","en":"Simulation Street method","ms":"Kaedah Simulation Street"}]',
  '{}',
  '601139998060', '+60 11-3999 8060',
  'Unit B-3-8, Megan Avenue 4, Jalan Mayang Sari, 50450 Kuala Lumpur',
  3.1623624, 101.716883,
  5.0, 21,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ عيّنة مراجعات صغيرة',
  false, 10
);

-- =====================================================================
-- تحديث قواعد التطبيق بناءً على الاشتراطات الرسمية المكتشفة
-- =====================================================================

-- ⚠️ اكتشاف مهم: طلاب مراكز اللغة ممنوعون من العمل (خلافاً لطلاب الجامعات)
-- ولا يمكنهم إحضار مرافقين. ونطاق العمر 18-45.
insert into public.faq (question, answer, context_tags, sort_order) values
('{"ar":"هل أستطيع العمل بدوام جزئي أثناء دراسة اللغة؟","en":"Can I work part-time while studying English?","ms":"Bolehkah saya bekerja sambilan?"}',
 '{"ar":"لا. تنص دائرة الهجرة الماليزية صراحةً على أن تصريح العمل الجزئي (20 ساعة أسبوعياً) متاح فقط لطلاب الجامعات العامة والخاصة — أما حاملو تأشيرة الطالب عبر مراكز اللغة والتدريب فغير مسموح لهم بالعمل إطلاقاً. انتبه: بعض مواقع المعاهد تذكر معلومة قديمة تخالف ذلك، والمصدر الرسمي هو المعتمد.","en":"No. Malaysia''s Immigration Department states explicitly that part-time work (20 hours/week) is available only to students at public and private universities — Student Pass holders under the Language Centre and Training Centre category are NOT permitted to work at all. Note: some institute websites carry outdated information contradicting this; the official source prevails.","ms":"Tidak. Pemegang Pas Pelajar di bawah kategori Pusat Bahasa TIDAK dibenarkan bekerja."}',
 '{visa,documents}', 7),
('{"ar":"ما شروط العمر لدراسة اللغة في ماليزيا؟","en":"What are the age requirements?","ms":"Apakah syarat umur?"}',
 '{"ar":"لأغراض التأشيرة، مراكز اللغة تقبل فقط من هم بين 18 و45 سنة. من هو داخل ماليزيا بتأشيرة سارية لا ينطبق عليه هذا القيد.","en":"For visa purposes, language centres can only accept students aged 18–45. Anyone already in Malaysia on a valid visa is not bound by this limit.","ms":"Untuk tujuan visa, pusat bahasa hanya menerima pelajar berumur 18-45 tahun."}',
 '{documents}', 8),
('{"ar":"هل أستطيع إحضار عائلتي معي؟","en":"Can I bring my family with me?","ms":"Bolehkah saya membawa keluarga?"}',
 '{"ar":"لا. تنص قواعد الهجرة على أن حاملي تأشيرة الطالب عبر مراكز اللغة غير مسموح لهم بإحضار مرافقين (Dependents). هذه الميزة متاحة فقط لطلاب الماجستير والدكتوراه.","en":"No. Immigration rules state that Student Pass holders under the Language Centre category are not permitted to bring dependents. This is available only to Master''s and PhD students.","ms":"Tidak. Pemegang Pas Pelajar Pusat Bahasa tidak dibenarkan membawa tanggungan."}',
 '{visa}', 9),
('{"ar":"كم مدة تأشيرة الطالب لمراكز اللغة؟","en":"How long is the Student Pass for language centres?","ms":"Berapa lama Pas Pelajar?"}',
 '{"ar":"تصدر دائرة الهجرة تأشيرة الطالب لمراكز اللغة لمدة أقصاها 12 شهراً، أو لمدة الكورس إن كانت أقل من ذلك. ويجب أن تكون خارج ماليزيا وقت تقديم الطلب.","en":"Immigration issues Student Passes for language centres for a maximum of 12 months, or for the course duration if shorter. You must be outside Malaysia when the application is submitted.","ms":"Pas Pelajar untuk pusat bahasa maksimum 12 bulan."}',
 '{visa,documents}', 10)
on conflict do nothing;

-- تحديث نطاق العمر في المتطلبات
update public.requirements
set description = '{"ar":"صورة واضحة لصفحة البيانات. شرط EMGS الأساسي: صلاحية الجواز 18 شهراً فأكثر — إن كانت أقل جدّد جوازك أولاً عبر أبشر. ملاحظة: مراكز اللغة تقبل فقط من هم بين 18 و45 سنة لأغراض التأشيرة.","en":"A clear scan of the data page. Core EMGS rule: passport valid 18+ months — renew first if shorter. Note: language centres accept only ages 18-45 for visa purposes.","ms":"Imbasan jelas halaman data. Pasport sah 18+ bulan. Umur 18-45."}'
where key = 'passport';

-- =====================================================================
-- 11) Britannia Language Centre
--     ✅ جاهز للنشر — التوثيق ممتاز من موقعه الرسمي britannia.edu.my
--     ⭐ ميزته الحاسمة لسوقك: معتمد من الملحقية الثقافية السعودية بكوالالمبور
--        (لا يملكها أي معهد آخر في قائمتنا) + مركز IELTS رسمي بشراكة IDP
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, website, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'britannia-language-centre',
  '{"ar":"مركز بريتانيا للغة الإنجليزية","en":"Britannia Language Centre","ms":"Pusat Bahasa Britannia"}',
  '{"ar":"الخيار الأقوى للطالب السعودي تحديداً: معتمد من وزارة التعليم العالي الماليزية، ومعتمد من الملحقية الثقافية السعودية في كوالالمبور — وهذا اعتماد لا يملكه أغلب المعاهد ويهم كل طالب مبتعث أو يريد معادلة دراسته. يقدّم بريتانيا طلب تأشيرة الطالب نيابةً عنك عبر EMGS مباشرة. كما أنه مركز IELTS رسمي بشراكة IDP — تتحضر وتؤدي الاختبار في نفس المكان دون تنقل. يقع في برج Menara Genesis على شارع سلطان إسماعيل في قلب بوكيت بينتانج، على بعد خطوات من محطتي MRT ومونوريل بوكيت بينتانج، ومحاط بمطاعم شرق أوسطية. معلموه ناطقون أصليون من بريطانيا وأستراليا ونيوزيلندا، ومتوسط حجم الفصل 10 طلاب فقط. طلابه من أكثر من 40 دولة. 4 مستويات (مبتدئ، ما قبل المتوسط، متوسط، متقدم) بالإضافة لبرامج IELTS. ملاحظة مهمة: رسوم الفحص الطبي بعد الوصول مشمولة في الرسوم الإجمالية.","en":"The strongest choice specifically for Saudi students: accredited by Malaysia''s Ministry of Higher Education AND approved by the Saudi Cultural Mission in Kuala Lumpur — an approval most centres lack, and one that matters to any sponsored student or anyone needing their studies recognised back home. Britannia files your Student Pass application on your behalf directly through EMGS. It is also an official IELTS centre in partnership with IDP — you prepare and sit the exam in the same place. Located in Menara Genesis on Jalan Sultan Ismail in the heart of Bukit Bintang, steps from the Bukit Bintang MRT and Monorail stations, surrounded by Middle Eastern restaurants. Native teachers from the UK, Australia and New Zealand; average class size of just 10 students. Students from 40+ countries. Four levels (Elementary, Pre-Intermediate, Intermediate, Advanced) plus IELTS programs. Note: the post-arrival medical checkup fee is included in the total fees.","ms":"Diluluskan Kementerian Pengajian Tinggi dan Misi Kebudayaan Saudi. Pusat IELTS rasmi dengan IDP. Terletak di Menara Genesis, Bukit Bintang."}',
  '{"ar":"كوالالمبور — بوكيت بينتانج","en":"Kuala Lumpur — Bukit Bintang","ms":"Kuala Lumpur — Bukit Bintang"}',
  'kuala_lumpur',
  0.00,   -- يُضبط في seed-prices.sql
  4, 48,
  '[{"ar":"معتمد من الملحقية الثقافية السعودية","en":"Saudi Cultural Mission approved","ms":"Diluluskan Misi Kebudayaan Saudi"},
    {"ar":"مركز IELTS رسمي (شراكة IDP)","en":"Official IELTS centre (IDP partner)","ms":"Pusat IELTS rasmi (IDP)"},
    {"ar":"معتمد من وزارة التعليم العالي","en":"Ministry of Higher Education accredited","ms":"Diiktiraf KPT"},
    {"ar":"يقدّم طلب التأشيرة عبر EMGS نيابةً عنك","en":"Files your EMGS visa application for you","ms":"Memfailkan visa EMGS untuk anda"},
    {"ar":"متوسط 10 طلاب بالفصل","en":"Average 10 students per class","ms":"Purata 10 pelajar sekelas"},
    {"ar":"معلمون من بريطانيا وأستراليا ونيوزيلندا","en":"Teachers from UK, Australia, New Zealand","ms":"Guru dari UK, Australia, NZ"},
    {"ar":"خطوات من مترو بوكيت بينتانج","en":"Steps from Bukit Bintang MRT","ms":"Berdekatan MRT Bukit Bintang"},
    {"ar":"الفحص الطبي مشمول بالرسوم","en":"Medical checkup included in fees","ms":"Pemeriksaan perubatan termasuk"},
    {"ar":"طلاب من +40 دولة","en":"Students from 40+ countries","ms":"Pelajar dari 40+ negara"}]',
  '{}',
  '60327327278', '+60 3-2732 7278', 'https://britannia.edu.my',
  'Menara Genesis, 33 Jalan Sultan Ismail, Bukit Bintang, 50250 Kuala Lumpur',
  3.1482306, 101.7108416,
  4.5, 168,
  '["MOHE","EMGS","IDP","Saudi Cultural Mission"]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"الإنجليزية المكثفة","en":"Intensive English","ms":"Bahasa Inggeris Intensif"},
    {"ar":"تحضير IELTS + أداء الاختبار","en":"IELTS preparation + exam sitting","ms":"Persediaan IELTS + peperiksaan"},
    {"ar":"إنجليزية الأعمال","en":"Business English","ms":"Bahasa Inggeris Perniagaan"}]',
  4, 18, 45,
  false,
  'Google Places + britannia.edu.my (official) + edumize.com — 2026-07-14',
  true, 4
);

-- الرسوم الموثّقة من موقع بريتانيا الرسمي
update public.institutes set
  extra_fees = '[{"key":"registration_visa","amount":2000,"label":{"ar":"رسوم التسجيل ومعالجة التأشيرة (تُدفع مقدماً)","en":"Registration & visa processing fee (paid upfront)","ms":"Yuran pendaftaran & visa"}}]'
where slug = 'britannia-language-centre';

-- سؤال شائع: اعتماد الملحقية الثقافية (يهم المبتعثين تحديداً)
insert into public.faq (question, answer, context_tags, sort_order) values
('{"ar":"هل المعهد معتمد من الملحقية الثقافية السعودية؟","en":"Is the institute approved by the Saudi Cultural Mission?","ms":"Adakah institut diluluskan Misi Kebudayaan Saudi?"}',
 '{"ar":"هذا مهم جداً إن كنت مبتعثاً أو تريد الاعتراف بدراستك في السعودية. من معاهدنا الحالية، بريتانيا هو المعتمد من الملحقية الثقافية السعودية في كوالالمبور. قبل التسجيل في أي معهد آخر، تحقق من قائمة الملحقية المحدّثة — الاعتماد قد يتغير.","en":"This matters greatly if you are a sponsored student or need your studies recognised in Saudi Arabia. Among our current centres, Britannia is approved by the Saudi Cultural Mission in Kuala Lumpur. Before enrolling anywhere else, check the Mission''s updated list — approvals can change.","ms":"Penting jika anda pelajar tajaan. Britannia diluluskan Misi Kebudayaan Saudi."}',
 '{documents,offer}', 11)
on conflict do nothing;


-- ========================= [ ٦- الأسعار ] =========================

-- =====================================================================
-- EduLink MY — نظام الأسعار
-- نفّذ بعد seed-institutes.sql
--
-- الفلسفة (بناءً على دورة العمل الفعلية):
--   السعر يمرّ بثلاث مراحل طبيعية:
--     1) تقديري (متوسط سوق) → يراه الطالب في التصفح ليقارن.
--     2) مؤكَّد من المعهد   → عند تحديثك الدوري لأسعارهم.
--     3) نهائي للطالب       → عند صدور خطاب القبول (Offer Letter).
--   النظام يدعم الثلاثة ويميّزها بوضوح للطالب في كل مرحلة.
--
-- المتوسط ليس اختراعاً: بُني على مراسٍ حقيقية موثّقة (جدول price_anchors).
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) أعمدة نظام التسعير
-- ---------------------------------------------------------------
alter table public.institutes
  add column if not exists price_estimated  boolean not null default true,
  add column if not exists price_verified   boolean not null default false,
  add column if not exists price_month_myr  numeric(10,2),
  add column if not exists price_min_myr    numeric(10,2),
  add column if not exists price_max_myr    numeric(10,2),
  add column if not exists price_updated_at timestamptz,
  add column if not exists price_note       jsonb default '{}',
  add column if not exists extra_fees       jsonb default '[]';

-- ---------------------------------------------------------------
-- 2) مراسي السوق — الأدلة التي بُني عليها المتوسط (شفافية كاملة)
-- ---------------------------------------------------------------
create table if not exists public.price_anchors (
  id           uuid primary key default gen_random_uuid(),
  institute    text not null,
  amount_myr   numeric(10,2) not null,
  unit         text not null,
  hours_week   int,
  source       text not null,
  collected_at date not null default current_date,
  note         text
);

insert into public.price_anchors (institute, amount_myr, unit, hours_week, source, note) values
('Bright Language Center',  1650.00, 'month', 30, 'languagecourse.net (بيانات مزوّدة من المعهد)', 'حجوزات 4 أشهر فأكثر — أقوى مرساة موثّقة'),
('EMS Language Centre',     2880.00, 'month', 30, 'riyada.agency (وكيل)',                          'قد يشمل هامش وكيل أو رسوماً إضافية'),
('Premier Language Centre', 1184.00, 'month', 20, 'languagecourse.net (USD 266 ~ RM1,184)',        'كثافة أقل (20 حصة) — الطرف الأدنى'),
('ACE Language Centre',      143.00, 'week',   4, 'languagecourse.net',                            'كورس خفيف (4 حصص) — غير مقارن بالمكثف');

-- ---------------------------------------------------------------
-- 3) المتوسط
--    المراسي المقارنة (مكثف 20-30 ساعة/أسبوع): 1650 / 2880 / 1184
--    المتوسط الحسابي ~RM1,905 — نعتمد RM1,800 تحفّظاً (أقرب للوسيط)
--    النطاق المعلن للطالب: RM1,200 - RM2,900 | أسبوعياً: 1800/4.33 ~ RM416
-- ---------------------------------------------------------------
create or replace function public.estimate_note()
returns jsonb language sql immutable as $$
  select '{"ar":"سعر تقديري بمتوسط السوق — يُؤكَّد السعر النهائي في خطاب القبول. الأسعار تتغير بحسب الموسم ومدة الكورس.","en":"Estimated market-average price — the final price is confirmed in your offer letter. Prices vary by season and course length.","ms":"Harga anggaran purata pasaran — harga muktamad disahkan dalam surat tawaran."}'::jsonb;
$$;

-- ---------------------------------------------------------------
-- 4) تطبيق الأسعار
-- ---------------------------------------------------------------

-- Bright — سعر منشور (المرساة الأقوى)
update public.institutes set
  price_month_myr  = 1650.00,
  price_myr        = round(1650.00 / 4.33, 2),
  price_estimated  = false,
  price_verified   = false,
  price_min_myr    = 1650.00,
  price_max_myr    = 1650.00,
  price_updated_at = now(),
  price_note = '{"ar":"سعر منشور من المعهد لحجوزات 4 أشهر فأكثر. يُضاف: رسوم طالب دولي RM3,300 + اختبار تحديد مستوى RM200 + ضريبة SST RM100 شهرياً.","en":"Published by the centre for bookings of 4+ months. Add: international student fee RM3,300 + placement test RM200 + SST RM100/month.","ms":"Harga diterbitkan untuk tempahan 4+ bulan."}',
  extra_fees = '[{"key":"intl_student_fee","amount":3300,"label":{"ar":"رسوم طالب دولي","en":"International student fee"}},
                 {"key":"placement_test","amount":200,"label":{"ar":"اختبار تحديد المستوى","en":"Placement test"}},
                 {"key":"sst_monthly","amount":100,"label":{"ar":"ضريبة SST (شهرياً)","en":"SST (monthly)"}}]'
where slug = 'bright-language-center';

-- EMS — سعر من وكيل (تقديري حتى تؤكده)
update public.institutes set
  price_month_myr  = 2880.00,
  price_myr        = round(2880.00 / 4.33, 2),
  price_estimated  = true,
  price_min_myr    = 2000.00,
  price_max_myr    = 2880.00,
  price_updated_at = now(),
  price_note = '{"ar":"سعر من وكيل معتمد وقد يشمل هامشه — يُؤكَّد في خطاب القبول. يُضاف: رسوم طالب دولي RM2,000 (4+ أشهر) + تأمين وفحص طبي RM800.","en":"Price from an authorised agent and may include their margin — confirmed in the offer letter. Add: international student fee RM2,000 (4+ months) + insurance & medical RM800.","ms":"Harga daripada ejen — disahkan dalam surat tawaran."}',
  extra_fees = '[{"key":"intl_student_fee","amount":2000,"label":{"ar":"رسوم طالب دولي (4+ أشهر)","en":"International student fee (4+ months)"}},
                 {"key":"insurance_medical","amount":800,"label":{"ar":"تأمين وفحص طبي","en":"Insurance & medical screening"}}]'
where slug = 'ems-language-centre';

-- الباقي — متوسط السوق التقديري RM1,800/شهر
update public.institutes set
  price_month_myr  = 1800.00,
  price_myr        = round(1800.00 / 4.33, 2),
  price_estimated  = true,
  price_verified   = false,
  price_min_myr    = 1200.00,
  price_max_myr    = 2900.00,
  price_updated_at = now(),
  price_note       = public.estimate_note()
where price_month_myr is null;

-- ELS: علامة عالمية — الطرف الأعلى أقرب لواقعه
update public.institutes set
  price_month_myr = 2200.00,
  price_myr       = round(2200.00 / 4.33, 2),
  price_min_myr   = 1800.00,
  price_max_myr   = 2900.00,
  price_note = '{"ar":"تقدير للطرف الأعلى من السوق (علامة عالمية، حد أدنى 4 أشهر). يُؤكَّد في خطاب القبول.","en":"Estimated at the upper end of the market (global brand, 4-month minimum). Confirmed in the offer letter.","ms":"Anggaran hujung atas pasaran."}'
where slug = 'els-kuala-lumpur';

-- Excel: مراجعات تذكر رسوماً أقل نسبياً
update public.institutes set
  price_month_myr = 1500.00,
  price_myr       = round(1500.00 / 4.33, 2),
  price_min_myr   = 1200.00,
  price_max_myr   = 1800.00,
  price_note = '{"ar":"تقدير للطرف الأدنى (مراجعات الطلاب تذكر رسوماً أقل نسبياً). يُؤكَّد في خطاب القبول.","en":"Estimated at the lower end (student reviews mention relatively lower fees). Confirmed in the offer letter.","ms":"Anggaran hujung bawah."}'
where slug = 'excel-language-kl';

-- ---------------------------------------------------------------
-- 5) سجل تاريخ الأسعار — لتتبّع تحديثات المعاهد عبر المواسم
-- ---------------------------------------------------------------
create table if not exists public.price_history (
  id              uuid primary key default gen_random_uuid(),
  institute_id    uuid not null references public.institutes (id) on delete cascade,
  price_month_myr numeric(10,2) not null,
  was_estimated   boolean not null,
  source          text,
  effective_from  date,
  recorded_by     uuid references auth.users (id),
  recorded_at     timestamptz not null default now(),
  note            text
);
create index if not exists price_history_inst_idx on public.price_history (institute_id, recorded_at desc);

create or replace function public.log_price_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.price_month_myr is distinct from old.price_month_myr then
    insert into public.price_history (institute_id, price_month_myr, was_estimated, source, recorded_by)
    values (new.id, new.price_month_myr, new.price_estimated,
            case when new.price_verified then 'institute_confirmed' else 'estimate' end,
            auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists on_price_change on public.institutes;
create trigger on_price_change
  after update on public.institutes
  for each row execute function public.log_price_change();

-- ---------------------------------------------------------------
-- 6) دالة التحديث السريع — عند وصول سعر من معهد
--    select update_institute_price('bright-language-center', 1750, 'institute_email', '2026-09-01');
-- ---------------------------------------------------------------
create or replace function public.update_institute_price(
  p_slug      text,
  p_month_myr numeric,
  p_source    text default 'institute_email',
  p_effective date default current_date
) returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'admin only'; end if;

  update public.institutes set
    price_month_myr  = p_month_myr,
    price_myr        = round(p_month_myr / 4.33, 2),
    price_estimated  = false,
    price_verified   = true,
    price_min_myr    = p_month_myr,
    price_max_myr    = p_month_myr,
    price_updated_at = now(),
    price_note       = '{"ar":"سعر مؤكّد من المعهد. السعر النهائي لطلبك يصلك في خطاب القبول.","en":"Price confirmed by the institute. Your final price arrives in the offer letter.","ms":"Harga disahkan oleh institut."}'
  where slug = p_slug
  returning id into v_id;

  if v_id is null then raise exception 'institute not found: %', p_slug; end if;

  insert into public.price_history (institute_id, price_month_myr, was_estimated, source, effective_from, recorded_by)
  values (v_id, p_month_myr, false, p_source, p_effective, auth.uid());
end $$;

-- =====================================================================
-- 7) قفل السعر عند خطاب القبول (Offer Letter)  ← جوهر دورة العمل
--    السعر التقديري الذي رآه الطالب يُحفظ لحظة التقديم،
--    ثم يُقفل السعر النهائي عند صدور الموافقة — ويرى الطالب الفرق بشفافية.
-- =====================================================================
alter table public.applications
  add column if not exists quoted_price_myr numeric(10,2),   -- ما رآه الطالب عند التقديم
  add column if not exists quoted_estimated boolean,          -- هل كان تقديرياً؟
  add column if not exists final_price_myr  numeric(10,2),   -- السعر النهائي من خطاب القبول
  add column if not exists final_fees       jsonb default '[]',
  add column if not exists offer_issued_at  timestamptz;

/**
 * عند إنشاء الطلب: نلتقط السعر المعروض وقتها (Snapshot).
 * أهميته: يحمي الطالب ويحميك — سجل موثّق لما رآه وقت القرار.
 */
create or replace function public.snapshot_quoted_price()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_price numeric; v_est boolean;
begin
  select price_month_myr, price_estimated into v_price, v_est
  from public.institutes where id = new.institute_id;

  new.quoted_price_myr := v_price;
  new.quoted_estimated := v_est;
  return new;
end $$;

drop trigger if exists on_application_created on public.applications;
create trigger on_application_created
  before insert on public.applications
  for each row execute function public.snapshot_quoted_price();

/**
 * إصدار خطاب القبول بالسعر النهائي.
 * استدعِها من اللوحة عند وصول Offer Letter من المعهد:
 *   select issue_offer('APPLICATION_UUID', 7200, '[{"key":"visa","amount":800}]');
 * تنقل الطلب لمرحلة offer وتقفل السعر النهائي.
 */
create or replace function public.issue_offer(
  p_application_id uuid,
  p_final_price    numeric,
  p_fees           jsonb default '[]'
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;

  update public.applications set
    final_price_myr = p_final_price,
    final_fees      = p_fees,
    offer_issued_at = now(),
    status          = 'offer',
    updated_at      = now()
  where id = p_application_id;

  insert into public.application_events (application_id, title)
  values (p_application_id,
    '{"ar":"صدر خطاب القبول — السعر النهائي مؤكَّد الآن","en":"Offer letter issued — final price now confirmed","ms":"Surat tawaran dikeluarkan"}');
end $$;

-- عرض للطالب: مقارنة التقديري بالنهائي
create or replace view public.v_application_pricing as
select
  a.id,
  a.user_id,
  a.quoted_price_myr,
  a.quoted_estimated,
  a.final_price_myr,
  a.offer_issued_at,
  case
    when a.final_price_myr is null then 'pending_offer'
    when a.final_price_myr > a.quoted_price_myr then 'higher'
    when a.final_price_myr < a.quoted_price_myr then 'lower'
    else 'same'
  end as vs_quote,
  case when a.final_price_myr is not null and a.quoted_price_myr is not null
       then round(a.final_price_myr - a.quoted_price_myr, 2) end as difference_myr
from public.applications a;

-- ---------------------------------------------------------------
-- 8) عرض للوحة: أي الأسعار تحتاج تحديثاً؟
-- ---------------------------------------------------------------
create or replace view public.v_prices_status as
select
  i.slug,
  i.name,
  i.price_month_myr,
  i.price_estimated,
  i.price_verified,
  i.price_updated_at,
  (current_date - i.price_updated_at::date) as days_since_update,
  case
    when i.price_verified and (current_date - i.price_updated_at::date) > 120 then 'needs_refresh'
    when i.price_estimated then 'estimated'
    else 'ok'
  end as status
from public.institutes i
order by i.price_estimated desc, i.price_updated_at asc;

-- ---------------------------------------------------------------
-- 9) الأمان
-- ---------------------------------------------------------------
alter table public.price_anchors enable row level security;
alter table public.price_history enable row level security;
create policy "public read anchors" on public.price_anchors for select using (true);
create policy "admin reads history" on public.price_history for select using (is_admin());

-- تحديث شرح مرحلة خطاب القبول ليذكر تأكيد السعر صراحةً
update public.pipeline_steps set
  explanation = '{"ar":"مبروك! وصل خطاب القبول (Offer Letter) — وفيه السعر النهائي المؤكَّد من المعهد (وقد يختلف قليلاً عن السعر التقديري الذي رأيته عند التصفح). راجع: تاريخ البداية، عدد الأسابيع، والرسوم النهائية كاملة.","en":"Congrats! Your offer letter arrived — it contains the final price confirmed by the institute (which may differ slightly from the estimate you saw while browsing). Review the start date, duration and full final fees.","ms":"Tahniah! Surat tawaran anda tiba dengan harga muktamad."}',
  your_action = '{"ar":"راجع السعر النهائي والرسوم، ثم اقبل العرض للانتقال لمرحلة الدفع.","en":"Review the final price and fees, then accept the offer to move to payment.","ms":"Semak harga muktamad, kemudian terima tawaran."}'
where status = 'offer';

-- ---------------------------------------------------------------
-- Britannia — رسوم التسجيل والتأشيرة موثّقة (RM2,000) لكن الرسوم الدراسية غير منشورة
-- ---------------------------------------------------------------
update public.institutes set
  price_month_myr  = 1800.00,
  price_myr        = round(1800.00 / 4.33, 2),
  price_estimated  = true,
  price_verified   = false,
  price_min_myr    = 1200.00,
  price_max_myr    = 2900.00,
  price_updated_at = now(),
  price_note = '{"ar":"سعر تقديري بمتوسط السوق — الرسوم الدراسية غير منشورة. الموثّق رسمياً: رسوم التسجيل ومعالجة التأشيرة RM2,000 تُدفع مقدماً قبل السفر. السعر النهائي يُؤكَّد في خطاب القبول.","en":"Estimated market-average — tuition is not published. Officially documented: a RM2,000 registration & visa processing fee paid upfront before travel. Final price confirmed in your offer letter.","ms":"Anggaran purata pasaran — yuran pengajian tidak diterbitkan. Yuran pendaftaran & visa RM2,000 dibayar awal."}'
where slug = 'britannia-language-centre';


-- ========================= [ ٧- نظام SEO والمدونة ] =========================

-- =====================================================================
-- EduLink MY — نظام SEO والمدونة
-- نفّذ بعد «٦- الأسعار.sql»
--
-- الاستراتيجية (مبنية على مسح فعلي للمنافسة في يوليو 2026):
--
-- ما اكتشفته: المنافسة الإنجليزية **مشبعة** — مواقع المعاهد نفسها،
-- ووسطاء دوليون (languagecourse.net)، ومنصات مدرّسين (Preply).
-- لكن **المحتوى العربي شبه غائب تماماً** عن هذا السوق.
-- وكذلك محتوى آسيا الوسطى (روسي/كازاخي/أوزبكي) — ومراجعات المعاهد
-- الحقيقية تُظهر أعداداً كبيرة من طلاب تلك المنطقة.
--
-- لذلك ترتيب الأولويات:
--   1) العربية — منافسة شبه معدومة + سوقك الأول + أنت تفهمه
--   2) الروسية — طلب حقيقي مثبت من مراجعات المعاهد، منافسة ضعيفة
--   3) الإنجليزية — الأصعب، ندخلها بزوايا طويلة الذيل فقط
--
-- ⚠️ ملاحظة صريحة: لا أملك بيانات حجم بحث (تحتاج Ahrefs/SEMrush).
--    الكلمات أدناه مبنية على **نية البحث ومسح المنافسة**، لا أرقام مخترعة.
--    تحقق من الأحجام مجاناً عبر: Google Keyword Planner · Google Trends
--    · اقتراحات بحث Google · "بحث الأشخاص أيضاً عن".
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) الكلمات المفتاحية — بنية مبنية على نية البحث
-- ---------------------------------------------------------------
create table if not exists public.seo_keywords (
  id          uuid primary key default gen_random_uuid(),
  lang        text not null references public.languages (code),
  keyword     text not null,
  intent      text not null check (intent in ('informational','commercial','transactional','navigational')),
  funnel      text not null check (funnel in ('awareness','consideration','decision')),
  difficulty  text check (difficulty in ('low','medium','high')),  -- تقدير المنافسة
  priority    int not null default 3,   -- 1 = الأعلى
  target_page text,                     -- المسار المستهدف
  notes       text,
  unique (lang, keyword)
);

-- الروسية مستهدَفة في محتوى SEO (طلاب آسيا الوسطى). نضيفها كلغة معروفة
-- لإرضاء المفتاح الأجنبي، لكن is_active=false فلا تظهر في مبدّل لغة التطبيق
-- حتى تجهّز ترجمتها الكاملة.
insert into public.languages (code, native_name, is_rtl, is_active, sort_order)
values ('ru', 'Русский', false, false, 4)
on conflict (code) do nothing;

-- ===== العربية: أولويتك القصوى (منافسة شبه معدومة) =====
insert into public.seo_keywords (lang, keyword, intent, funnel, difficulty, priority, target_page, notes) values
-- تجارية (نية شراء واضحة) — الأثمن
('ar','معاهد اللغة الانجليزية في ماليزيا','commercial','consideration','low',1,'/institutes','الكلمة الأم — استهدفها بالصفحة الرئيسية'),
('ar','افضل معهد لغة انجليزية في كوالالمبور','commercial','decision','low',1,'/blog/best-institutes-kl','نية قرار عالية'),
('ar','دراسة اللغة الانجليزية في ماليزيا','informational','awareness','low',1,'/guide/study-english-malaysia','الدليل الشامل'),
('ar','تكلفة دراسة اللغة في ماليزيا','commercial','consideration','low',1,'/guide/costs','الأسعار = أكثر ما يبحثونه'),
('ar','معهد لغة انجليزية كوالالمبور','commercial','decision','low',1,'/institutes?city=kuala_lumpur',null),
-- التأشيرة والإجراءات (ألمك الشخصي = محتواك الأقوى)
('ar','فيزا طالب ماليزيا','informational','consideration','low',1,'/guide/student-visa','EMGS — معلومة نادرة بالعربي'),
('ar','شروط دراسة اللغة في ماليزيا','informational','consideration','low',1,'/guide/requirements','العمر 18-45 + جواز 18 شهر'),
('ar','اجراءات الدراسة في ماليزيا','informational','consideration','low',2,'/guide/process',null),
('ar','بطاقة الوصول الرقمية ماليزيا','informational','decision','low',2,'/guide/mdac','MDAC — تخصص نادر'),
('ar','هل السعوديين يحتاجون فيزا لماليزيا','informational','awareness','low',2,'/guide/visa-exemption','إعفاء 90 يوم'),
('ar','الفحص الطبي للطلاب في ماليزيا','informational','decision','low',3,'/guide/medical','EMGS خلال 7 أيام'),
-- السكن والحياة
('ar','سكن طلاب في كوالالمبور','commercial','decision','low',2,'/housing',null),
('ar','تكلفة المعيشة في ماليزيا للطلاب','informational','consideration','low',2,'/guide/cost-of-living',null),
('ar','الحياة في كوالالمبور للطلاب العرب','informational','awareness','low',3,'/blog/life-in-kl',null),
-- طويلة الذيل (سهلة التصدر)
('ar','معهد لغة معتمد من الملحقية الثقافية في ماليزيا','commercial','decision','low',1,'/blog/saudi-cultural-mission','⭐ ميزة Britannia الحصرية'),
('ar','دراسة الايلتس في ماليزيا','commercial','consideration','low',2,'/guide/ielts',null),
('ar','كم مدة دراسة اللغة الانجليزية في ماليزيا','informational','consideration','low',3,'/guide/duration',null),
('ar','هل يمكن العمل اثناء دراسة اللغة في ماليزيا','informational','consideration','low',2,'/guide/work-rules','⚠️ الجواب: لا — معلومة يخطئ فيها الجميع'),
('ar','ماليزيا او بريطانيا لدراسة اللغة','commercial','awareness','low',3,'/blog/malaysia-vs-uk','مقارنة = زيارات عالية');

-- ===== الروسية: طلب مثبت من مراجعات المعاهد =====
insert into public.seo_keywords (lang, keyword, intent, funnel, difficulty, priority, target_page, notes) values
('ru','курсы английского в Малайзии','commercial','consideration','low',1,'/institutes','طلاب آسيا الوسطى — منافسة ضعيفة'),
('ru','изучение английского в Куала-Лумпуре','commercial','consideration','low',1,'/institutes?city=kuala_lumpur',null),
('ru','студенческая виза Малайзия','informational','consideration','low',2,'/guide/student-visa',null),
('ru','стоимость обучения английскому в Малайзии','commercial','consideration','low',2,'/guide/costs',null),
('ru','языковая школа Малайзия отзывы','commercial','decision','low',2,'/institutes',null);

-- ===== الإنجليزية: منافسة عالية — ندخل بزوايا طويلة الذيل فقط =====
insert into public.seo_keywords (lang, keyword, intent, funnel, difficulty, priority, target_page, notes) values
('en','english language school kuala lumpur','commercial','decision','high',3,'/institutes','مشبعة — لا تنافس مباشرةً'),
('en','study english in malaysia cost','commercial','consideration','medium',2,'/guide/costs',null),
('en','malaysia student pass language centre requirements','informational','consideration','low',1,'/guide/requirements','⭐ طويلة الذيل + نية عالية'),
('en','can language centre students work in malaysia','informational','consideration','low',1,'/guide/work-rules','⭐ سؤال محدد + الجواب نادر'),
('en','malaysia digital arrival card students','informational','decision','low',1,'/guide/mdac','⭐ تخصص'),
('en','emgs student pass 18 months passport rule','informational','consideration','low',1,'/guide/requirements','⭐ دقيق جداً'),
('en','best english language centre kuala lumpur for arab students','commercial','decision','low',2,'/blog/best-institutes-kl',null);

-- ===== الملايوية (سوق محلي + بحث المقيمين) =====
insert into public.seo_keywords (lang, keyword, intent, funnel, difficulty, priority, target_page) values
('ms','pusat bahasa inggeris kuala lumpur','commercial','decision','medium',3,'/institutes'),
('ms','kursus bahasa inggeris intensif KL','commercial','consideration','low',3,'/institutes');

-- ---------------------------------------------------------------
-- 2) صفحات الهبوط — تُولَّد من بياناتك الحقيقية
-- ---------------------------------------------------------------
create table if not exists public.seo_pages (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  lang          text not null references public.languages (code),
  type          text not null check (type in ('institute','guide','comparison','city','blog','home')),
  title         text not null,               -- 50-60 حرفاً
  meta_desc     text not null,               -- 150-160 حرفاً
  h1            text not null,
  body_md       text,                        -- المحتوى (Markdown)
  keywords      text[] default '{}',
  institute_id  uuid references public.institutes (id) on delete cascade,
  faq_ids       uuid[] default '{}',         -- لبناء FAQPage schema
  og_image      text,
  is_published  boolean not null default false,
  published_at  timestamptz,
  updated_at    timestamptz not null default now(),
  unique (slug, lang)
);
create index if not exists seo_pages_pub_idx on public.seo_pages (lang, type) where is_published;

-- ---------------------------------------------------------------
-- 3) المدونة
-- ---------------------------------------------------------------
create table if not exists public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null,
  lang         text not null references public.languages (code),
  title        text not null,
  excerpt      text,
  body_md      text not null,
  cover_image  text,
  keywords     text[] default '{}',
  category     text,                          -- 'visa' | 'costs' | 'life' | 'institutes'
  reading_min  int,
  -- ربط الترجمات: نفس الـ group_id = نفس المقال بلغات مختلفة (لـ hreflang)
  group_id     uuid not null default gen_random_uuid(),
  is_published boolean not null default false,
  published_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (slug, lang)
);
create index if not exists blog_group_idx on public.blog_posts (group_id);

-- ---------------------------------------------------------------
-- 4) إعدادات SEO العامة
-- ---------------------------------------------------------------
insert into public.app_config (key, value) values
('seo', '{
  "site_name": "EduLink",
  "domain": "https://edulink.app",
  "default_og": "/og-default.png",
  "twitter": "@edulink",
  "organization": {
    "name": "EduLink",
    "type": "EducationalOrganization",
    "description": "منصة تسجيل الطلاب في معاهد اللغة الإنجليزية بماليزيا"
  }
}')
on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------
-- 5) عرض: خريطة الموقع (sitemap) — تقرأها دالة التوليد
-- ---------------------------------------------------------------
create or replace view public.v_sitemap as
select
  '/' || p.lang || '/' || p.slug as path,
  p.lang,
  p.updated_at,
  case p.type when 'home' then 1.0 when 'institute' then 0.9
              when 'guide' then 0.8 else 0.6 end as priority
from public.seo_pages p where p.is_published
union all
select
  '/' || b.lang || '/blog/' || b.slug,
  b.lang,
  b.updated_at,
  0.7
from public.blog_posts b where b.is_published;

-- ---------------------------------------------------------------
-- 6) عرض: ما الذي ينقصه محتوى؟ (فجوات SEO)
-- ---------------------------------------------------------------
create or replace view public.v_seo_gaps as
select
  k.lang,
  k.keyword,
  k.priority,
  k.difficulty,
  k.target_page,
  case when exists (
    select 1 from public.seo_pages p
    where p.lang = k.lang and p.is_published
      and ('/' || p.slug) = k.target_page
  ) then 'covered' else '❌ missing' end as status
from public.seo_keywords k
order by k.priority, k.lang;

alter table public.seo_keywords enable row level security;
alter table public.seo_pages    enable row level security;
alter table public.blog_posts   enable row level security;

create policy "public read pages" on public.seo_pages  for select using (is_published);
create policy "public read blog"  on public.blog_posts for select using (is_published);
create policy "admin keywords"    on public.seo_keywords for all using (is_admin()) with check (is_admin());
create policy "admin pages"       on public.seo_pages    for all using (is_admin()) with check (is_admin());
create policy "admin blog"        on public.blog_posts   for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------
-- 7) حقول مراجع المستندات الذكي (Edge Function: doc-review)
--    ⚠️ رأي المساعد يُخزَّن منفصلاً عن status — القرار يبقى بشرياً
-- ---------------------------------------------------------------
alter table public.application_documents
  add column if not exists ai_verdict            text check (ai_verdict in ('pass','review','fail')),
  add column if not exists ai_confidence         numeric(3,2),
  add column if not exists ai_findings           text[] default '{}',
  add column if not exists ai_extracted          jsonb default '{}',
  add column if not exists ai_suggested_rejection text references public.rejection_reasons (key),
  add column if not exists ai_reviewed_at        timestamptz;

-- طابور المراجعة مرتّب بذكاء: ما يحتاج عينك أولاً
create or replace view public.v_review_queue as
select
  d.id,
  d.application_id,
  d.requirement_key,
  d.status,
  d.ai_verdict,
  d.ai_confidence,
  d.ai_findings,
  d.ai_suggested_rejection,
  a.user_id,
  p.full_name,
  i.name as institute_name,
  d.created_at,
  case
    when d.ai_verdict = 'fail'   then 1   -- مخالفة صريحة: اعتمد الرفض بضغطة
    when d.ai_verdict = 'review' then 2   -- يحتاج عينك فعلاً
    when d.ai_verdict is null    then 3   -- لم يُفحص بعد
    else 4                                -- pass: تصفّحه سريعاً
  end as sort_rank
from public.application_documents d
join public.applications a on a.id = d.application_id
join public.profiles    p on p.id = a.user_id
join public.institutes  i on i.id = a.institute_id
where d.status = 'pending'
order by sort_rank, d.created_at;


-- ========================= [ ٩- إصلاحات حرجة ] =========================

-- =====================================================================
-- ٩ - إصلاحات حرجة (نسخة مُصحّحة ومُقوّاة)
-- نفّذه في Supabase → SQL Editor بعد الملفات ١..٧ (ويغني عن ٨).
-- آمن لإعادة التشغيل (idempotent) ولا يتوقف إن اختلف مخططك قليلاً.
--
-- يعالج (بنفس نيّة ملفك الأصلي + إصلاح أخطائه):
--   ١) الـViews التي تتجاوز RLS  → تسريب أسماء الطلاب وأسعارهم وعمولاتك
--   ٢) الطالب يرقّي نفسه ويولّد عمولة وهمية (تحديثاً + إدراجاً)
--   ٣) حذف الحساب يمحو سجلاتك المالية وسجل الامتثال + يترك ملفاته
--   ٤) خلط الوحدات: شهري مقابل إجمالي في مقارنة السعر
--   ٥) غياب صلاحيات المسؤول (لا لوحة تحكم عملياً)
--
-- ⚠️ ما صُحّح مقارنةً بملفك:
--   • [عطل قاتل] كنت تعدّل v_application_pricing (السطر ٢٦) قبل إنشائه
--     (السطر ٢٣٨) → الملف كله كان يتوقف فوراً ولا ينفّذ شيئاً.
--   • [عطل] كان تعديل v_prices_status وغيره يتوقف إن لم يوجد الـView.
--     الآن كل تعديل view محروس بفحص وجوده.
--   • [عطل] دالة snapshot_quoted_price كانت معرّفة بلا trigger → لا
--     تُلتقط أسعار العرض إطلاقاً. أضفنا المُشغّل.
--   • [هشاشة] drop constraint بالاسم الافتراضي قد يفشل بصمت؛ الآن
--     نكتشف اسم المفتاح الأجنبي فعلياً من الكتالوج.
--   • [أعمدة ناقصة] الدوال تعتمد أعمدة (final_price_myr…) قد لا تكون
--     موجودة → نضيفها بأمان أولاً حتى لا تنهار المُشغّلات وقت التنفيذ.
--   • [ثغرة] الطالب يستطيع حقن status/final_price عند الإدراج (لا التحديث
--     فقط) → أغلقناها في مُشغّل الإدراج.
-- =====================================================================


-- =====================================================================
-- ٠) أساسات المسؤول (حتى يعمل الملف بمفرده مهما كان ترتيب تنفيذك)
-- =====================================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- تستدعيها لوحة التحكم للتحقق من الصلاحية
create or replace function public.am_i_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;
grant execute on function public.am_i_admin() to authenticated;


-- =====================================================================
-- ١) أعمدة قد تكون ناقصة — نضيفها أولاً حتى لا تنهار الدوال لاحقاً
-- =====================================================================
alter table public.institutes
  add column if not exists price_month_myr numeric(10,2),
  add column if not exists price_estimated boolean not null default true,
  add column if not exists price_verified  boolean not null default false;

alter table public.applications
  add column if not exists quoted_price_myr numeric(10,2),   -- إجمالي تقديري
  add column if not exists quoted_month_myr numeric(10,2),   -- الرقم الشهري المعروض
  add column if not exists quoted_estimated boolean,
  add column if not exists final_price_myr  numeric(10,2),   -- إجمالي نهائي (خطاب القبول)
  add column if not exists final_fees       jsonb,
  add column if not exists offer_issued_at  timestamptz,
  add column if not exists updated_at       timestamptz not null default now();


-- =====================================================================
-- ٢) خلط الوحدات + العمولة على السعر الفعلي + View المقارنة الصحيح
--    (نُنشئ الـView هنا أولاً ثم نضبط security_invoker — عكس ملفك)
-- =====================================================================
create or replace function public.snapshot_quoted_price()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_month numeric; v_est boolean;
begin
  select price_month_myr, price_estimated into v_month, v_est
  from public.institutes where id = new.institute_id;

  new.quoted_month_myr := v_month;
  new.quoted_estimated := v_est;
  -- 4.33 = متوسط أسابيع الشهر. الإجمالي بنفس وحدة final_price_myr.
  new.quoted_price_myr := case
    when v_month is null then null
    else round(v_month / 4.33 * coalesce(new.weeks, 0), 2)
  end;

  -- تحصين: عند الإدراج، الطالب لا يحقن مرحلة متقدمة أو سعراً نهائياً
  if auth.uid() is not null and not public.is_admin() then
    new.status          := 'documents';
    new.final_price_myr := null;
    new.final_fees      := null;
    new.offer_issued_at := null;
  end if;

  return new;
end $$;

-- نستبدل مُشغّل الإدراج القديم (on_application_created من ملف ٦) بواحد
-- مصحّح — نحذف القديم أولاً كي لا يُطلق المُشغّلان معاً على نفس الصف.
drop trigger if exists on_application_created   on public.applications;
drop trigger if exists snapshot_quoted_price_trg on public.applications;
create trigger snapshot_quoted_price_trg
  before insert on public.applications
  for each row execute function public.snapshot_quoted_price();

-- العمولة تُحسب على السعر النهائي المقفل ← ثم التقدير ← ثم صفر
create or replace function public.record_commission()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_partner uuid; v_base numeric; v_type text; v_rate numeric; v_amount numeric;
begin
  if new.status = 'completed' and coalesce(old.status, '') <> 'completed' then
    select i.partner_id into v_partner from public.institutes i where i.id = new.institute_id;
    if v_partner is null then return new; end if;

    v_base := coalesce(new.final_price_myr, new.quoted_price_myr, 0);

    select commission_type, commission_rate into v_type, v_rate
    from public.partners where id = v_partner;

    v_amount := case when v_type = 'percent' then v_base * (v_rate / 100.0) else v_rate end;

    insert into public.commissions (application_id, partner_id, base_amount, amount)
    values (new.id, v_partner, v_base, round(v_amount, 2))
    on conflict (application_id, partner_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_application_completed on public.applications;
create trigger on_application_completed
  after update on public.applications
  for each row execute function public.record_commission();

-- ترميم الطلبات القائمة التي حُفظت بالوحدة الخاطئة (مرة واحدة، آمن التكرار)
update public.applications a
   set quoted_month_myr = a.quoted_price_myr,
       quoted_price_myr = round(a.quoted_price_myr / 4.33 * a.weeks, 2)
 where a.quoted_month_myr is null
   and a.quoted_price_myr is not null
   and a.weeks is not null;

-- View المقارنة الصحيح. نحذفه أولاً لأن ملف ٦ أنشأه بترتيب أعمدة مختلف،
-- و create or replace view لا يسمح بتغيير ترتيب/أسماء الأعمدة القائمة.
drop view if exists public.v_application_pricing;
create or replace view public.v_application_pricing as
select
  a.id, a.user_id, a.weeks,
  a.quoted_month_myr,
  a.quoted_price_myr,          -- إجمالي تقديري
  a.quoted_estimated,
  a.final_price_myr,           -- إجمالي نهائي
  a.offer_issued_at,
  case
    when a.final_price_myr is null then 'pending_offer'
    when a.final_price_myr > a.quoted_price_myr then 'higher'
    when a.final_price_myr < a.quoted_price_myr then 'lower'
    else 'same'
  end as vs_quote,
  case when a.final_price_myr is not null and a.quoted_price_myr is not null
       then round(a.final_price_myr - a.quoted_price_myr, 2) end as difference_myr
from public.applications a;


-- =====================================================================
-- ٣) الـVIEWS — إغلاق تسريب RLS (محروس ضد الـViews غير الموجودة)
-- =====================================================================
do $$
declare v text;
begin
  foreach v in array array[
    'v_application_pricing','v_apps_monthly','v_funnel','v_partner_performance',
    'v_prices_status','v_review_queue','v_seo_gaps','v_sitemap'
  ] loop
    if to_regclass('public.'||v) is not null then
      execute format('alter view public.%I set (security_invoker = on)', v);
    end if;
  end loop;
end $$;

-- الـViews الإدارية لا يحتاجها anon إطلاقاً (revoke محروس)
do $$
declare v text;
begin
  foreach v in array array[
    'v_review_queue','v_partner_performance','v_funnel','v_apps_monthly',
    'v_seo_gaps','v_application_pricing'
  ] loop
    if to_regclass('public.'||v) is not null then
      execute format('revoke all on public.%I from anon', v);
    end if;
  end loop;
end $$;

-- لوحة التحكم (authenticated/admin) تحتاج قراءة تقارير القيادة
do $$
declare v text;
begin
  foreach v in array array[
    'v_apps_monthly','v_funnel','v_partner_performance','v_application_pricing'
  ] loop
    if to_regclass('public.'||v) is not null then
      execute format('grant select on public.%I to authenticated', v);
    end if;
  end loop;
end $$;


-- =====================================================================
-- ٤) منع الطالب من ترقية نفسه أو العبث بالحقول المالية (تحديثاً)
-- =====================================================================
create or replace function public.guard_application_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- السيرفر (service_role: auth.uid() = null) والمسؤول: مرور كامل
  if auth.uid() is null or public.is_admin() then
    new.updated_at := now();
    return new;
  end if;

  -- الطالب: الانتقال المسموح الوحيد هو documents ← review
  if new.status is distinct from old.status
     and not (old.status = 'documents' and new.status = 'review') then
    raise exception 'status_change_not_allowed'
      using hint = 'تغيير مرحلة الطلب من صلاحية الإدارة فقط';
  end if;

  -- حقول مالية وتعاقدية: تُعاد لقيمتها الأصلية بصمت
  new.user_id          := old.user_id;
  new.institute_id     := old.institute_id;
  new.weeks            := old.weeks;
  new.quoted_price_myr := old.quoted_price_myr;
  new.quoted_month_myr := old.quoted_month_myr;
  new.quoted_estimated := old.quoted_estimated;
  new.final_price_myr  := old.final_price_myr;
  new.final_fees       := old.final_fees;
  new.offer_issued_at  := old.offer_issued_at;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists guard_application_update_trg on public.applications;
create trigger guard_application_update_trg
  before update on public.applications
  for each row execute function public.guard_application_update();

-- ٤-ب) منع الطالب من اعتماد مستنداته بنفسه أو تزوير رأي الذكاء الاصطناعي
create or replace function public.guard_document_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- كل ما يرفعه الطالب يبدأ pending — دائماً
  new.status        := 'pending';
  new.rejection_key := null;
  new.reviewed_at   := null;

  if tg_op = 'UPDATE' then
    new.ai_verdict             := old.ai_verdict;
    new.ai_confidence          := old.ai_confidence;
    new.ai_findings            := old.ai_findings;
    new.ai_extracted           := old.ai_extracted;
    new.ai_suggested_rejection := old.ai_suggested_rejection;
    new.ai_reviewed_at         := old.ai_reviewed_at;
  end if;

  return new;
end $$;

drop trigger if exists guard_document_write_trg on public.application_documents;
create trigger guard_document_write_trg
  before insert or update on public.application_documents
  for each row execute function public.guard_document_write();


-- =====================================================================
-- ٥) حذف الحساب لا يمحو سجلاتك المالية وسجل الامتثال
--    (نكتشف اسم المفتاح الأجنبي فعلياً — لا نفترض الاسم الافتراضي)
-- =====================================================================
do $$
declare r record;
begin
  for r in
    select rel.relname, con.conname
    from pg_constraint con
    join pg_class rel     on rel.oid = con.conrelid
    join pg_namespace ns  on ns.oid = rel.relnamespace
    where con.contype = 'f'
      and ns.nspname = 'public'
      and rel.relname in ('commissions','data_transfers')
      and (select attname from pg_attribute
             where attrelid = con.conrelid and attnum = con.conkey[1]) = 'application_id'
  loop
    execute format('alter table public.%I drop constraint %I', r.relname, r.conname);
  end loop;
end $$;

create index if not exists commissions_app_idx    on public.commissions (application_id);
create index if not exists data_transfers_app_idx on public.data_transfers (application_id);

comment on column public.commissions.application_id is
  'مرجع تاريخي — بلا مفتاح أجنبي عمداً حتى لا يمحو حذفُ الحساب سجلاً مالياً';
comment on column public.data_transfers.application_id is
  'مرجع تاريخي — سجل الامتثال يبقى بعد حذف حساب الطالب';

-- ٥-ب) حذف الحساب يحذف الملفات المرفوعة أيضاً (حق المحو)
create or replace function public.delete_current_user()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  delete from storage.objects
   where bucket_id = 'documents'
     and (storage.foldername(name))[1] = v_uid::text;

  delete from auth.users where id = v_uid;
end $$;

revoke execute on function public.delete_current_user() from anon;
grant  execute on function public.delete_current_user() to authenticated;


-- =====================================================================
-- ٦) صلاحيات المسؤول — بدونها لا توجد لوحة تحكم فعلياً (محروسة)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'institutes','listings','applications','application_documents',
    'application_events','requirements','pipeline_steps','rejection_reasons',
    'faq','languages','currencies','app_config','price_anchors',
    'data_consents','profiles','partners','commissions','data_transfers',
    'partner_users','admin_users','blog_posts','seo_pages','seo_keywords'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists "admin manage %1$s" on public.%1$I', t);
      execute format(
        'create policy "admin manage %1$s" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', t);
    end if;
  end loop;
end $$;


-- =====================================================================
-- ٦-ب) 🔴 إصلاح تكرار لا نهائي في سياسات RLS (خطأ حرج في ملف ٤)
--   سياسة applications «partner reads consented» تستعلم من data_consents،
--   وسياسة data_consents «student manages own consents» تستعلم من
--   applications → حلقة لا نهائية: أي طالب يقرأ طلباته يحصل على
--   "infinite recursion detected in policy". النتيجة: التطبيق معطّل تماماً
--   لكل مستخدم مسجّل.
--
--   الحل: دالة security definer تفحص ملكية الطلب دون إعادة تفعيل RLS،
--   فتُكسر الحلقة من جهة data_consents.
-- =====================================================================
create or replace function public.is_application_owner(p_app uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.applications where id = p_app and user_id = auth.uid());
$$;

drop policy if exists "student reads own consents" on public.data_consents;
create policy "student reads own consents" on public.data_consents for select
  using (public.is_application_owner(application_id));

drop policy if exists "student manages own consents" on public.data_consents;
create policy "student manages own consents" on public.data_consents for all
  using (public.is_application_owner(application_id))
  with check (public.is_application_owner(application_id));


-- =====================================================================
-- ٧) تقوية: قيد الحالة + تاريخ سعر الصرف
-- =====================================================================
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add  constraint applications_status_check
  check (status in ('documents','review','submitted','offer','payment','visa','ticket','completed','rejected'));

alter table public.currencies
  add column if not exists rate_updated_at timestamptz not null default now();
comment on column public.currencies.rate_updated_at is
  'راجعه شهرياً. سعر صرف قديم = كل سعر تعرضه خاطئ بصمت.';


-- =====================================================================
-- ٨) صلاحية المدير على مخزن الوسائط العام (رفع صور المعاهد/الإعلانات
--    مباشرةً من لوحة التحكم). القراءة عامة أصلاً؛ نضيف الرفع/التعديل/الحذف.
-- =====================================================================
insert into storage.buckets (id, name, public) values ('media','media',true)
on conflict (id) do nothing;

drop policy if exists "admin upload media" on storage.objects;
create policy "admin upload media" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin delete media" on storage.objects;
create policy "admin delete media" on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());


-- =====================================================================
-- ⭐ ترقية أول مدير (نفّذه يدوياً مرة واحدة — استبدل البريد)
-- =====================================================================
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict (user_id) do nothing;

-- =====================================================================
-- ✅ تحقّق سريع بعد التنفيذ:
--   select c.relname, c.reloptions from pg_class c
--   join pg_namespace n on n.oid=c.relnamespace
--   where n.nspname='public' and c.relkind='v';   -- كلها security_invoker=true
-- =====================================================================

