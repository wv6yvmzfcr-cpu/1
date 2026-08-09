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

-- ١) عمود نسبة تقدّم EMGS -------------------------------------------------
alter table public.applications
  add column if not exists emgs_progress smallint not null default 0
    check (emgs_progress between 0 and 100);

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

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists guard_application_update_trg on public.applications;
create trigger guard_application_update_trg
  before update on public.applications
  for each row execute function public.guard_application_update();

-- ٣) إعداد الدفع (يعدّله المدير لاحقاً من لوحة التحكم) --------------------
insert into public.app_config (key, value) values
('payment', '{
  "note": {
    "ar": "بعد التحويل، ارفق صورة إيصال الدفع في الأسفل لنبدأ إجراءات تأشيرتك مباشرةً.",
    "en": "After transferring, attach your payment receipt below so we start your visa procedures right away."
  },
  "methods": [
    {
      "type": "bank",
      "title": {"ar": "تحويل بنكي", "en": "Bank transfer"},
      "bank_name": "Maybank Malaysia",
      "account_name": "EduLink Sdn Bhd",
      "account_number": "5140xxxxxxxx",
      "iban": "",
      "swift": "MBBEMYKL",
      "note": {"ar": "اكتب رقم طلبك في خانة الملاحظات عند التحويل.", "en": "Put your application ID in the transfer note."}
    },
    {
      "type": "institute_site",
      "title": {"ar": "الدفع عبر موقع المعهد", "en": "Pay via institute website"},
      "url": "",
      "steps": [
        {"ar": "افتح رابط الدفع الخاص بالمعهد أعلاه.", "en": "Open the institute payment link above."},
        {"ar": "أدخل رقم خطاب القبول ومبلغ الرسوم كما هو موضّح.", "en": "Enter your offer letter number and the fee amount as shown."},
        {"ar": "أكمل الدفع، ثم احفظ الإيصال وارفعه في الأسفل.", "en": "Complete payment, then save the receipt and upload it below."}
      ]
    }
  ]
}')
on conflict (key) do update set value = excluded.value;

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
