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
