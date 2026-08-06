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
