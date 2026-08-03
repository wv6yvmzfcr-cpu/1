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
