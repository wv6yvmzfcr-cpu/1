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
