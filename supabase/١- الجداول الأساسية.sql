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
