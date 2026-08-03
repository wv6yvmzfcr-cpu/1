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
