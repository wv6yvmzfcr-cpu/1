-- =====================================================================
-- ملف ١١ — المرحلة الثانية: خطاب القبول، الدفع، وتقدّم تأشيرة EMGS
-- =====================================================================
-- يُشغّل بعد الملفات ١..١٠. آمن للتكرار (idempotent).
--
-- ماذا يضيف؟
--   ١) عمود emgs_progress (0..100) على applications لعرض نسبة تقدّم
--      معاملة التأشيرة للطالب، وعند 70% نبلغه أننا سنتواصل لتنسيق
--      الخطوات الأخيرة (e-Visa، استقبال المطار، السكن).
--   ٢) حماية العمود من عبث الطالب داخل guard_application_update.
--   ٣) إعداد app_config('payment') = تفاصيل التحويل البنكي + خطوات
--      الدفع عبر موقع المعهد (يعدّلها المدير من لوحة التحكم).
--
-- ملاحظة على المستندات:
--   • 'offer_letter'   = يرفعه المدير في مجلد الطالب فيحمّله الطالب.
--   • 'payment_receipt'= يرفعه الطالب بعد الدفع (نتحقق ثم نكمل التأشيرة).
--   كلاهما مفتاح حرّ في application_documents (لا FK)، فلا يلزم صفّ
--   requirements، ولا يظهران في معالج المستندات (المرحلة الأولى).
-- =====================================================================

-- ١) عمود نسبة تقدّم EMGS + رابط دفع المعهد (اختياري) --------------------
alter table public.applications
  add column if not exists emgs_progress smallint not null default 0
    check (emgs_progress between 0 and 100),
  add column if not exists pay_url text;   -- رابط دفع المعهد (رسوم التأشيرة) — يضعه المدير

-- رقم تواصل إضافي (اختياري) يضيفه الطالب بنفسه ليُتواصل معه عليه أيضاً
alter table public.profiles
  add column if not exists alt_phone text;

-- ٢) حماية emgs_progress من تعديل الطالب (يظل بصلاحية الإدارة/الخادم) -----
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
  new.emgs_progress    := old.emgs_progress;   -- 🆕 تقدّم التأشيرة بيد الإدارة
  new.pay_url          := old.pay_url;          -- 🆕 رابط دفع المعهد بيد الإدارة

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists guard_application_update_trg on public.applications;
create trigger guard_application_update_trg
  before update on public.applications
  for each row execute function public.guard_application_update();

-- ٣) إعداد الدفع (رسوم التأشيرة تُدفع للمعهد — المنصّة لا تستقبل أموالاً) --
-- مهم: الدفع للمعهد مباشرةً، وفقط للطالب الذي تستدعي مدة دراسته تأشيرة
-- (Student Pass عبر EMGS). الطالب المُعفى (≤ 90 يوماً) لا يدفع رسوم تأشيرة.
insert into public.app_config (key, value) values
('payment', '{
  "disclaimer": {
    "ar": "المنصّة لا تستقبل أي مبالغ ولا تتحمّل مسؤوليتها. رسوم تقديم التأشيرة تُدفع للمعهد مباشرةً، وذلك فقط إن كانت مدة دراستك تتطلّب تأشيرة (Student Pass). للدورات القصيرة المُعفاة لا توجد رسوم تأشيرة.",
    "en": "The platform collects no money and holds no funds. The visa application fee is paid directly to the institute, and only if your study duration requires a Student Pass. Visa-exempt short courses have no visa fee."
  },
  "note": {
    "ar": "ادفع رسوم التأشيرة للمعهد حسب التعليمات في خطاب القبول، ثم ارفق الإيصال في الأسفل لنستكمل إجراءات تأشيرتك. أي استفسار تواصل معنا عبر واتساب.",
    "en": "Pay the visa fee to the institute per the offer letter, then attach the receipt below so we continue your visa procedures. Any question — reach us on WhatsApp."
  },
  "steps": [
    {"ar": "افتح خطاب القبول واطّلع على مبلغ رسوم التأشيرة وطريقة دفعها للمعهد.", "en": "Open the offer letter and review the visa fee and how to pay the institute."},
    {"ar": "ادفع للمعهد مباشرةً (عبر رابط الدفع إن وُجد، أو حسب تعليمات الخطاب).", "en": "Pay the institute directly (via the payment link if provided, or per the letter)."},
    {"ar": "احفظ الإيصال وارفعه في الأسفل لنبدأ إجراءات تأشيرتك.", "en": "Save the receipt and upload it below so we start your visa procedures."}
  ]
}')
on conflict (key) do update set value = excluded.value;

-- ٣-ب) توضيح نصوص مرحلتَي القبول والدفع على الموقع ----------------------
update public.pipeline_steps set
  explanation = '{"ar":"مبروك! وصل خطاب القبول (Offer Letter). حمّله وراجع تفاصيله. إن كانت مدة دراستك تتطلّب تأشيرة (أكثر من 90 يوماً) ستجد رسوم تقديم التأشيرة تُدفع للمعهد. أما الدورات القصيرة المُعفاة فلا رسوم تأشيرة عليها.","en":"Congrats! Your offer letter arrived. Download and review it. If your duration needs a visa (over 90 days) you will find the visa fee paid to the institute. Visa-exempt short courses have no visa fee.","ms":"Tahniah! Surat tawaran anda telah tiba. Muat turun dan semak."}',
  your_action = '{"ar":"حمّل خطاب القبول. إن طُلبت رسوم تأشيرة، ادفعها للمعهد وارفق الإيصال.","en":"Download the offer letter. If a visa fee is due, pay the institute and attach the receipt.","ms":"Muat turun surat tawaran."}'
where status = 'offer';

update public.pipeline_steps set
  explanation = '{"ar":"هذه المرحلة تخصّ الطلاب الذين تتطلّب مدة دراستهم تأشيرة فقط. رسوم تقديم التأشيرة تُدفع للمعهد مباشرةً — المنصّة لا تستقبل أي مبالغ. أرفق إيصال الدفع لنستكمل إجراءات التأشيرة، وسيتم التواصل معك عبر واتساب لتنسيق باقي التفاصيل.","en":"This stage applies only to students whose duration requires a visa. The visa fee is paid directly to the institute — the platform collects nothing. Upload the receipt so we continue, and you will be contacted on WhatsApp to coordinate the rest.","ms":"Peringkat ini untuk pelajar yang memerlukan visa sahaja. Yuran dibayar terus ke institut."}',
  your_action = '{"ar":"ادفع رسوم التأشيرة للمعهد حسب خطاب القبول، ثم ارفع صورة الإيصال.","en":"Pay the institute the visa fee per the offer letter, then upload the receipt.","ms":"Bayar yuran visa kepada institut, kemudian muat naik resit."}'
where status = 'payment';

-- ٤) سياسات تخزين للمدير: يرفع خطاب القبول في مجلد الطالب ليحمّله ------
-- سياسات الطالب تحصره في مجلده (foldername[1]=uid). المدير يحتاج كتابة
-- في مجلد أي طالب ليضع 'offer_letter'. نضيف صلاحية مدير على bucket
-- المستندات فقط (القراءة/الرفع/التعديل/الحذف) دون فتحه للعامة.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='admin manage documents read') then
    create policy "admin manage documents read"   on storage.objects for select
      using (bucket_id = 'documents' and public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='admin manage documents write') then
    create policy "admin manage documents write"  on storage.objects for insert
      with check (bucket_id = 'documents' and public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='admin manage documents update') then
    create policy "admin manage documents update" on storage.objects for update
      using (bucket_id = 'documents' and public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='admin manage documents delete') then
    create policy "admin manage documents delete" on storage.objects for delete
      using (bucket_id = 'documents' and public.is_admin());
  end if;
end $$;

-- =====================================================================
-- سطر واحد جاهز لقاعدتك الحيّة (إن شغّلت الملفات سابقاً ولا تريد إعادتها):
--   alter table public.applications
--     add column if not exists emgs_progress smallint not null default 0
--       check (emgs_progress between 0 and 100);
-- ثم شغّل هذا الملف كاملاً لتحديث دالة الحماية وإعداد الدفع.
-- =====================================================================
