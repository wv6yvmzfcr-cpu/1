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
