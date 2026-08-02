-- =====================================================================
-- EduLink MY — الإصدار 8: صلاحيات لوحة التحكم (Admin RLS Policies)
-- نفّذ هذا الملف بعد كل الملفات السابقة (وخصوصاً «٤- الشركاء والعمولات.sql»
-- لأنه يعرّف الدالة public.is_admin()).
--
-- لماذا هذا الملف ضروري؟
--   المخطط الأصلي فعّل RLS على كل الجداول لكنه أعطى "قراءة عامة" فقط
--   لمحتوى الموقع (المعاهد، الإعلانات، اللغات، العملات، المتطلبات، FAQ...).
--   لم توجد أي سياسة "كتابة" للمدير على هذه الجداول، فكانت لوحة التحكم
--   عاجزة عن الإضافة/التعديل/الحذف. هذا الملف يضيف صلاحية كاملة للمدير
--   عبر الدالة is_admin() — بأمان ودون الحاجة لكشف مفتاح service_role
--   في المتصفح.
--
-- كل السياسات هنا "إضافية" (permissive) فتُدمج مع سياسات القراءة العامة
-- الموجودة (OR)، ولا تكسر أي شيء قائم.
-- =====================================================================

-- ---------------------------------------------------------------
-- 0) إصلاح عمود مفقود: price_verified
--    ملف «٦- الأسعار.sql» يستخدم العمود price_verified في عبارات UPDATE
--    لكنه لم يُضِفه في ALTER TABLE، ما يسبب خطأ "column does not exist".
--    نضيفه هنا بأمان (idempotent) قبل أي شيء.
-- ---------------------------------------------------------------
alter table public.institutes
  add column if not exists price_verified boolean not null default false;

-- ---------------------------------------------------------------
-- 1) دالة مساعدة: تنفيذ آمن حتى لو نُفّذ الملف أكثر من مرة
--    نحذف السياسة إن وُجدت ثم نُنشئها (drop policy if exists ... ).
-- ---------------------------------------------------------------

-- محتوى الموقع العام: صلاحية كاملة للمدير (إضافة/تعديل/حذف)
do $$
declare
  t text;
  content_tables text[] := array[
    'languages','currencies','institutes','listings',
    'requirements','rejection_reasons','pipeline_steps','faq',
    'price_anchors','seo_keywords','seo_pages','blog_posts','app_config'
  ];
begin
  foreach t in array content_tables loop
    -- بعض الجداول اختيارية (SEO/المدونة) قد لا تكون موجودة بعد
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "admin manage %1$s" on public.%1$I;', t);
      execute format(
        'create policy "admin manage %1$s" on public.%1$I for all
           using (public.is_admin()) with check (public.is_admin());', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------
-- 2) بيانات الطلاب والطلبات: المدير يرى ويدير الكل
--    (السياسات الأصلية تقصر الرؤية على المالك فقط — نضيف صلاحية المدير)
-- ---------------------------------------------------------------

-- الطلبات: قراءة + تحديث الحالة من اللوحة
drop policy if exists "admin all applications" on public.applications;
create policy "admin all applications" on public.applications for all
  using (public.is_admin()) with check (public.is_admin());

-- مستندات الطلب: مراجعة/اعتماد/رفض
drop policy if exists "admin all documents" on public.application_documents;
create policy "admin all documents" on public.application_documents for all
  using (public.is_admin()) with check (public.is_admin());

-- أحداث الطلب (Timeline): المدير يضيف أحداثاً يراها الطالب
drop policy if exists "admin all events" on public.application_events;
create policy "admin all events" on public.application_events for all
  using (public.is_admin()) with check (public.is_admin());

-- الملفات الشخصية: المدير يقرأ الجميع (لإدارة المستخدمين)
drop policy if exists "admin read profiles" on public.profiles;
create policy "admin read profiles" on public.profiles for select
  using (public.is_admin());

-- رموز الإشعارات: المدير يقرأها لإرسال الحملات
drop policy if exists "admin read tokens" on public.push_tokens;
create policy "admin read tokens" on public.push_tokens for select
  using (public.is_admin());

-- رسائل المساعد: قراءة للمدير (دعم/جودة)
drop policy if exists "admin read chat" on public.chat_messages;
create policy "admin read chat" on public.chat_messages for select
  using (public.is_admin());

-- الموافقات وتحويلات البيانات: إدارة كاملة للمدير
drop policy if exists "admin all consents" on public.data_consents;
create policy "admin all consents" on public.data_consents for all
  using (public.is_admin()) with check (public.is_admin());

-- إدارة قائمة المديرين نفسها (من داخل اللوحة)
drop policy if exists "admin manage admins" on public.admin_users;
create policy "admin manage admins" on public.admin_users for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- 3) عروض التقارير: منح صلاحية القراءة للمستخدمين المسجّلين
--    (الـ Views لا يُطبَّق عليها RLS مباشرة؛ نتحكم عبر GRANT وأمان الجداول).
--    لوحة التحكم تقرأها بحساب المدير المسجّل.
-- ---------------------------------------------------------------
grant select on public.v_apps_monthly       to authenticated;
grant select on public.v_funnel             to authenticated;
grant select on public.v_partner_performance to authenticated;

-- ---------------------------------------------------------------
-- 4) دالة لوحة التحكم: هل المستخدم الحالي مدير؟
--    تُستدعى من اللوحة بعد تسجيل الدخول للتحقق من الصلاحية (RPC).
-- ---------------------------------------------------------------
create or replace function public.am_i_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;
grant execute on function public.am_i_admin() to authenticated;

-- ---------------------------------------------------------------
-- 5) ⭐ ترقية أول مدير (نفّذ هذا يدوياً مرة واحدة)
--    استبدل البريد ببريد حسابك الذي سجّلت به في Supabase Auth، ثم شغّله.
-- ---------------------------------------------------------------
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict (user_id) do nothing;

-- للتأكد من نجاح الترقية:
-- select u.email from public.admin_users a join auth.users u on u.id = a.user_id;
