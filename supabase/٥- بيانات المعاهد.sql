-- =====================================================================
-- EduLink MY — بيانات المعاهد الحقيقية (Seed Data)
-- تاريخ الجمع: 14 يوليو 2026
--
-- مصادر البيانات ودرجة الثقة:
--   ✅ موثّق (اسم، عنوان، إحداثيات، تقييم Google، هاتف): Google Places API
--   ✅ موثّق (الاعتماد): مواقع المعاهد الرسمية + موقع الهجرة الماليزية
--   ⚠️ إرشادي (الأسعار): من منصات وسيطة، تتغير كل فصل — أكّدها من المعهد
--      قبل النشر. مصادر مختلفة أعطت أرقاماً متضاربة لنفس المعهد.
--   ❌ غير مضمّن (الصور): محمية بحقوق ملكية — اطلبها من المعاهد ضمن
--      اتفاقية الشراكة (سيعطونك حزمة رسمية عالية الجودة مجاناً).
--
-- ملاحظة: price_myr هنا = السعر الأسبوعي التقريبي (لتوافق مخطط قاعدة البيانات).
-- الأسعار الفعلية شهرية؛ حُسبت بالقسمة على 4.33 وتحتاج تأكيداً.
-- =====================================================================

-- ---------------------------------------------------------------
-- تنظيف البيانات التجريبية السابقة
-- ---------------------------------------------------------------
delete from public.institutes where slug = 'elc-kuala-lumpur';

-- ---------------------------------------------------------------
-- حقول إضافية تحتاجها البيانات الحقيقية
-- ---------------------------------------------------------------
alter table public.institutes
  add column if not exists rating          numeric(2,1),      -- تقييم Google
  add column if not exists rating_count    int,               -- عدد المراجعات
  add column if not exists website         text,
  add column if not exists phone           text,
  add column if not exists address         text,
  add column if not exists accreditation   jsonb default '[]',-- ["MOE","KDN","EMGS"]
  add column if not exists programs        jsonb default '[]',-- البرامج المترجمة
  add column if not exists hours_per_week  int,
  add column if not exists levels_count    int,
  add column if not exists min_age         int default 18,
  add column if not exists max_age         int default 45,
  add column if not exists price_verified  boolean default false,  -- هل أكّدت السعر؟
  add column if not exists extra_fees      jsonb default '[]',  -- رسوم إضافية موثّقة (يُستخدم أدناه قبل ملف الأسعار)
  add column if not exists data_source     text;               -- مصدر البيانات

-- =====================================================================
-- 1) EMS Language Centre (English Made Simple)
--    ✅ الأقوى توثيقاً: MOE + KDN، موقع عربي رسمي، خبرة منذ 2011
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, website, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, hours_per_week, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'ems-language-centre',
  '{"ar":"مركز EMS للغة الإنجليزية (English Made Simple)","en":"EMS Language Centre (English Made Simple)","ms":"Pusat Bahasa EMS"}',
  '{"ar":"من أعرق المعاهد في كوالالمبور وأكثرها توثيقاً. تأسس 2011 تحت شركة Citinetics (خبرة +30 سنة في التدريب). معتمد من وزارة التعليم الماليزية (MOE) ومرخّص من وزارة الداخلية (KDN) لقبول الطلاب الدوليين. يقع على بُعد دقائق مشياً من برجي بتروناس ومحطة KLCC. خيار شائع جداً لطلاب الشرق الأوسط وشمال أفريقيا، ويوفر موقعاً رسمياً بالعربية. 10 مستويات من المبتدئ للمتقدم؛ المستوى العاشر يعادل IELTS 5.5. يضم مصلّى ومختبر لغة ومكتبة، ونظام English Only Zones لفرض التحدث بالإنجليزية داخل المركز. رحلات وأنشطة كل جمعة (Cool Fridays).","en":"One of KL''s most established and best-documented centres. Founded 2011 under Citinetics (30+ years in training). Approved by Malaysia''s Ministry of Education (MOE) and licensed by the Ministry of Home Affairs (KDN) to enrol international students. Minutes on foot from the Petronas Twin Towers and KLCC LRT. Very popular with Middle-Eastern and North African students, with an official Arabic website. 10 levels from beginner to advanced; level 10 equals roughly IELTS 5.5. Facilities include a prayer room, language lab and library, plus English Only Zones. Weekly trips and activities (Cool Fridays).","ms":"Pusat bahasa mapan di KL, diluluskan MOE dan dilesenkan KDN untuk pelajar antarabangsa. Berdekatan KLCC."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  665.00,   -- ⚠️ تقريبي: ~RM2,880/شهر (من وكيل) ÷ 4.33 — أكّده
  4, 48,
  '[{"ar":"معتمد من وزارة التعليم (MOE)","en":"MOE approved","ms":"Diluluskan MOE"},
    {"ar":"مرخّص لقبول الدوليين (KDN)","en":"KDN licensed for international students","ms":"Dilesenkan KDN"},
    {"ar":"موقع رسمي بالعربية","en":"Official Arabic website","ms":"Laman web Arab rasmi"},
    {"ar":"مصلّى داخل المركز","en":"Prayer room on site","ms":"Surau"},
    {"ar":"على بُعد دقائق من KLCC","en":"Minutes from KLCC","ms":"Beberapa minit dari KLCC"},
    {"ar":"مساعدة في السكن","en":"Accommodation help","ms":"Bantuan penginapan"},
    {"ar":"استشارات جامعية مجانية","en":"Free university consultancy","ms":"Perundingan universiti percuma"}]',
  '{}',   -- ❌ الصور: اطلبها من المعهد
  '60321811219', '+60 3-2181 1219', 'https://ems.edu.my',
  'B-7-1, B-7-2, B-7-3, Block B, Megan Avenue 2, Jalan Yap Kwan Seng, 50450 Kuala Lumpur',
  3.1617137, 101.7117827,
  4.6, 522,
  '["MOE","KDN","EMGS"]',
  '[{"ar":"الإنجليزية العامة المكثفة (IGE)","en":"Intensive General English (IGE)","ms":"Bahasa Inggeris Am Intensif"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"},
    {"ar":"تحضير PTE (بيرسون)","en":"PTE Preparation","ms":"Persediaan PTE"},
    {"ar":"الإنجليزية للعمل","en":"English for Work","ms":"Bahasa Inggeris untuk Kerja"},
    {"ar":"كورس المحادثة","en":"Speaking Course","ms":"Kursus Pertuturan"},
    {"ar":"كورس الكتابة","en":"Writing Course","ms":"Kursus Penulisan"},
    {"ar":"المعسكر الصيفي/الشتوي","en":"Summer/Winter Camp","ms":"Kem Musim Panas"}]',
  30, 10, 18, 45,
  false,
  'Google Places + ems.edu.my (official) — 2026-07-14',
  true, 1
);

-- =====================================================================
-- 2) Bright Language Center
--    ✅ أسعاره الأوضح توثيقاً بين الجميع
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, hours_per_week, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'bright-language-center',
  '{"ar":"مركز برايت للغات","en":"Bright Language Center","ms":"Pusat Bahasa Bright"}',
  '{"ar":"مركز نشط في قلب كوالالمبور (Megan Avenue 2) بتقييم عالٍ ومراجعات كثيرة من طلاب عرب وآسيويين وأوروبيين. يقدّم 28-30 ساعة تدريس أسبوعياً بمنهج Headway العالمي، مع 10 مستويات وبرامج IELTS. أسعاره من أوضح الأسعار المنشورة: حوالي RM1,650 شهرياً للحجوزات من 4 أشهر فأكثر. يشتهر بالأنشطة والرحلات وبيئة متعددة الجنسيات. يوفر أيضاً برامج للصغار (Bright Flex/Elite) في الفترات الصيفية.","en":"An active, highly-rated centre in central KL (Megan Avenue 2) with many reviews from Arab, Asian and European students. Offers 28–30 teaching hours weekly using the international Headway coursebook, 10 levels and IELTS programs. Its pricing is among the most clearly published: roughly RM1,650/month for bookings of 4+ months. Known for activities, trips and a multinational environment. Also runs junior programs (Bright Flex/Elite) in summer.","ms":"Pusat aktif di tengah KL dengan penilaian tinggi. 28-30 jam seminggu menggunakan Headway."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  381.00,   -- ⚠️ RM1,650/شهر ÷ 4.33 ≈ RM381/أسبوع (+RM100 SST شهرياً)
  4, 48,
  '[{"ar":"منهج Headway العالمي","en":"Headway international coursebook","ms":"Buku Headway"},
    {"ar":"30 ساعة أسبوعياً","en":"30 hours per week","ms":"30 jam seminggu"},
    {"ar":"10 مستويات + IELTS","en":"10 levels + IELTS","ms":"10 tahap + IELTS"},
    {"ar":"أسعار واضحة ومنشورة","en":"Clearly published pricing","ms":"Harga jelas"},
    {"ar":"أنشطة ورحلات دورية","en":"Regular activities & trips","ms":"Aktiviti & lawatan"},
    {"ar":"بيئة متعددة الجنسيات","en":"Multinational environment","ms":"Persekitaran pelbagai bangsa"}]',
  '{}',
  '60321816496', '+60 3-2181 6496',
  'Unit A-5-1, A-5-2, A-6-1, Block A, Megan Avenue 2, Jalan Yap Kwan Seng, 50450 Kuala Lumpur',
  3.1628878, 101.7126118,
  4.7, 334,
  '["MOE"]',
  '[{"ar":"الإنجليزية العامة المكثفة","en":"Intensive General English","ms":"Bahasa Inggeris Am Intensif"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"},
    {"ar":"برنامج الصغار (صيفي)","en":"Junior program (summer)","ms":"Program Junior"}]',
  30, 10, 18, 44,
  false,
  'Google Places + languagecourse.net (aggregator) — 2026-07-14',
  true, 2
);

-- =====================================================================
-- 3) ELS Language Centres Kuala Lumpur
--    ✅ العلامة العالمية الأعرق: شبكة منذ 1961، في ماليزيا منذ 1990
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, website, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, hours_per_week, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'els-kuala-lumpur',
  '{"ar":"مراكز ELS للغات - كوالالمبور","en":"ELS Language Centres Kuala Lumpur","ms":"Pusat Bahasa ELS Kuala Lumpur"}',
  '{"ar":"الاسم الأعرق عالمياً في هذه القائمة: شبكة ELS تأسست في واشنطن 1961 ولها +60 مركزاً في أمريكا، وفرع ماليزيا قائم منذ 1990 (خبرة +30 سنة محلياً). ميزته الحاسمة: خريجوه معفون من تقديم IELTS أو TOEFL عند التقديم لأكثر من 650 جامعة حول العالم — وهذا يوفر على الطالب وقتاً ومالاً كبيرين إن كان هدفه الجامعة. معتمد من وزارة التعليم و EMGS و IDP. يقع في المثلث الذهبي (منطقة الأعمال) على بُعد 10 دقائق مشياً من محطة KLCC. 30 ساعة أسبوعياً، والفصول بحد أقصى 20 طالباً. يشترط على الطلاب الدوليين التسجيل 4 أشهر كحد أدنى.","en":"The most globally established name here: the ELS network began in Washington D.C. in 1961 with 60+ US centres, and its Malaysia branch has operated since 1990 (30+ years locally). Its decisive advantage: graduates are exempt from submitting IELTS or TOEFL when applying to 650+ universities worldwide — a major saving of time and money for university-bound students. Accredited by the Ministry of Education, EMGS and IDP. Located in the Golden Triangle business district, a 10-minute walk from KLCC LRT. 30 hours weekly, max 20 students per class. International students must enrol for a minimum of 4 months.","ms":"Rangkaian global ELS sejak 1961, di Malaysia sejak 1990. Graduan dikecualikan IELTS/TOEFL untuk 650+ universiti."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,   -- ⚠️ لم يُنشر سعر موثوق — اطلبه من المعهد مباشرة
  16, 48, -- الحد الأدنى 4 أشهر للطلاب الدوليين
  '[{"ar":"إعفاء من IELTS لـ +650 جامعة","en":"IELTS waiver at 650+ universities","ms":"Pengecualian IELTS 650+ universiti"},
    {"ar":"شبكة عالمية منذ 1961","en":"Global network since 1961","ms":"Rangkaian global sejak 1961"},
    {"ar":"معتمد MOE + EMGS + IDP","en":"MOE + EMGS + IDP accredited","ms":"Diiktiraf MOE + EMGS + IDP"},
    {"ar":"حد أقصى 20 طالباً بالفصل","en":"Max 20 students per class","ms":"Maksimum 20 pelajar"},
    {"ar":"المثلث الذهبي - قرب KLCC","en":"Golden Triangle near KLCC","ms":"Golden Triangle"},
    {"ar":"مسار جامعي معتمد","en":"University pathway","ms":"Laluan universiti"}]',
  '{}',
  '60392128167', '+60 3-9212 8167', 'https://www.els.edu.my',
  'A-3-1 & A-3-2, Wisma HB, Megan Avenue 2, 12, Jalan Yap Kwan Seng, 50450 Kuala Lumpur',
  3.1618593, 101.7117667,
  4.6, 156,
  '["MOE","EMGS","IDP"]',
  '[{"ar":"الإنجليزية العامة المكثفة","en":"Intensive English","ms":"Bahasa Inggeris Intensif"},
    {"ar":"إنجليزية الأعمال","en":"Business English","ms":"Bahasa Inggeris Perniagaan"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"},
    {"ar":"تحضير TOEFL","en":"TOEFL Preparation","ms":"Persediaan TOEFL"},
    {"ar":"تحضير CAE و FCE","en":"CAE & FCE Preparation","ms":"Persediaan CAE & FCE"},
    {"ar":"دروس فردية","en":"One-to-one lessons","ms":"Kelas persendirian"}]',
  30, 10, 18, 45,
  false,
  'Google Places + your-uni.com + smapse.com — 2026-07-14 ⚠️ السعر غير منشور',
  true, 3
);

-- =====================================================================
-- 4) Big Ben Education Group
--    ✅ الأعلى في عدد المراجعات (987) — مؤشر حجم قوي
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, hours_per_week, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'big-ben-education',
  '{"ar":"مجموعة بيغ بن التعليمية","en":"Big Ben Education Group","ms":"Big Ben Education Group"}',
  '{"ar":"الأعلى في عدد المراجعات بين معاهد كوالالمبور (987 مراجعة بتقييم 4.9) — مؤشر قوي على حجم الطلاب وحيويته. يقع في Megan Avenue 2 قرب KLCC. تتكرر في مراجعات طلابه العرب الإشادة بالمعلمين والبيئة الودودة، ويضم مقهى داخلياً يذكره الطلاب كثيراً. بيئة متعددة الجنسيات. ⚠️ لم نجد وثيقة رسمية منشورة تؤكد اعتماده لدى EMGS — تحقق من ترخيصه لقبول الطلاب الدوليين قبل الشراكة.","en":"The highest review count among KL centres (987 reviews at 4.9★) — a strong signal of student volume and activity. Located at Megan Avenue 2 near KLCC. Arab students'' reviews repeatedly praise the teachers and friendly atmosphere, and the in-house café is frequently mentioned. Multinational environment. ⚠️ We found no published official document confirming EMGS registration — verify its licence to enrol international students before partnering.","ms":"Bilangan ulasan tertinggi di KL (987 ulasan, 4.9★). Terletak di Megan Avenue 2 berhampiran KLCC."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,   -- ⚠️ غير منشور
  4, 48,
  '[{"ar":"الأعلى تقييماً وعدد مراجعات","en":"Highest rating & review count","ms":"Penilaian & ulasan tertinggi"},
    {"ar":"قرب KLCC","en":"Near KLCC","ms":"Berhampiran KLCC"},
    {"ar":"مقهى داخل المعهد","en":"In-house café","ms":"Kafe dalaman"},
    {"ar":"بيئة متعددة الجنسيات","en":"Multinational environment","ms":"Persekitaran pelbagai bangsa"}]',
  '{}',
  '60358705588', '+60 3-5870 5588',
  'B-0-10, Megan Avenue 2, Jalan Yap Kwan Seng, 50450 Kuala Lumpur',
  3.1628878, 101.7126118,
  4.9, 987,
  '[]',   -- ⚠️ يحتاج تحقق
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"}]',
  null, null, 18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ الاعتماد والسعر يحتاجان تحققاً',
  false, 4   -- is_active = false حتى تتحقق من الاعتماد
);

-- =====================================================================
-- 5) Manchester Language Centre (Mont Kiara)
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'manchester-language-centre',
  '{"ar":"مركز مانشستر للغة","en":"Manchester Language Centre","ms":"Pusat Bahasa Manchester"}',
  '{"ar":"تقييم مثالي 5.0 من 297 مراجعة. يقع في مونت كيارا — الحي الراقي للمغتربين في كوالالمبور، وهو موقع مختلف عن باقي المعاهد المتجمعة قرب KLCC، ومناسب لمن يفضّل بيئة أهدأ وأرقى. مراجعات الطلاب تُشيد بمعلمين ناطقين أصليين وبيئة دولية (طلاب من أوروبا وآسيا الوسطى). ⚠️ الاعتماد والأسعار تحتاج تأكيداً مباشراً.","en":"A perfect 5.0 rating from 297 reviews. Located in Mont Kiara — KL''s upscale expat neighbourhood — a different setting from the cluster near KLCC, suiting those who prefer a quieter, more upmarket environment. Reviews praise native-speaker teachers and an international mix (European and Central Asian students). ⚠️ Accreditation and pricing need direct confirmation.","ms":"Penilaian 5.0 daripada 297 ulasan. Terletak di Mont Kiara, kawasan ekspatriat."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"تقييم مثالي 5.0","en":"Perfect 5.0 rating","ms":"Penilaian 5.0"},
    {"ar":"مونت كيارا - حي المغتربين","en":"Mont Kiara expat area","ms":"Mont Kiara"},
    {"ar":"معلمون ناطقون أصليون","en":"Native-speaker teachers","ms":"Guru penutur asli"},
    {"ar":"دوام مسائي حتى 8م","en":"Open until 8pm","ms":"Buka hingga 8 malam"}]',
  '{}',
  '601111015154', '+60 11-1101 5154',
  'Premier Suite, No: 21.02, Menara 1, Mont Kiara, 50480 Kuala Lumpur',
  3.1657965, 101.6531132,
  5.0, 297,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ يحتاج تحققاً',
  false, 5
);

-- =====================================================================
-- 6) Stratford International Language Centre
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'stratford-international',
  '{"ar":"مركز ستراتفورد الدولي للغات","en":"Stratford International Language Centre","ms":"Pusat Bahasa Antarabangsa Stratford"}',
  '{"ar":"تقييم 4.8 من 187 مراجعة. يقع في برج G Tower على شارع تون رزاق — مبنى مكاتب راقٍ. مراجعات الطلاب (كثير منهم من آسيا الوسطى وروسيا) تُشيد ببرنامج تحضير IELTS وبالتركيز العملي على المحادثة وكسر حاجز الخوف من الكلام. ⚠️ الاعتماد والأسعار تحتاج تأكيداً.","en":"Rated 4.8 from 187 reviews. Located in G Tower on Jalan Tun Razak — an upscale office building. Student reviews (many from Central Asia and Russia) praise the IELTS preparation program and the practical focus on speaking and overcoming the fear of making mistakes. ⚠️ Accreditation and pricing need confirmation.","ms":"Penilaian 4.8 daripada 187 ulasan. Terletak di G Tower, Jalan Tun Razak."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"برنامج IELTS قوي","en":"Strong IELTS program","ms":"Program IELTS kukuh"},
    {"ar":"تركيز على المحادثة","en":"Speaking-focused","ms":"Fokus pertuturan"},
    {"ar":"برج G Tower الراقي","en":"Upscale G Tower","ms":"G Tower"}]',
  '{}',
  '60350333118', '+60 3-5033 3118',
  'Suite 17-01, 17-03 & 17-06, Level 17, G Tower, 199 Jalan Tun Razak, 50400 Kuala Lumpur',
  3.1590931, 101.7199587,
  4.8, 187,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ يحتاج تحققاً',
  false, 6
);

-- =====================================================================
-- 7) California KL Language Academy (KLCC)
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'california-kl-academy',
  '{"ar":"أكاديمية كاليفورنيا كوالالمبور للغات","en":"California KL Language Academy","ms":"Akademi Bahasa California KL"}',
  '{"ar":"يقع داخل مجمّع Avenue K التجاري مقابل برجي بتروناس مباشرة — أفضل موقع من ناحية السهولة والمواصلات (فوق محطة KLCC). يفتح 7 أيام أسبوعياً حتى 10 مساءً، وهي مرونة نادرة. معلمون ناطقون بالإنجليزية الأمريكية. يقدّم معسكرات صيفية وشتوية. تقييمه 4.4 (137 مراجعة) وهو أقل من غيره لكن ضمن النطاق الجيد. ⚠️ الاعتماد والأسعار تحتاج تأكيداً.","en":"Located inside the Avenue K mall directly opposite the Petronas Twin Towers — the most convenient location of all (above KLCC station). Open 7 days a week until 10pm, unusually flexible. American-English native teachers. Runs summer and winter camps. Rated 4.4 (137 reviews), lower than others but still solid. ⚠️ Accreditation and pricing need confirmation.","ms":"Terletak di dalam Avenue K bertentangan Menara Berkembar Petronas. Buka 7 hari hingga 10 malam."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"مقابل برجي بتروناس","en":"Opposite Petronas Towers","ms":"Bertentangan Menara Petronas"},
    {"ar":"مفتوح 7 أيام حتى 10م","en":"Open 7 days until 10pm","ms":"Buka 7 hari hingga 10 malam"},
    {"ar":"إنجليزية أمريكية","en":"American English","ms":"Bahasa Inggeris Amerika"},
    {"ar":"معسكرات صيفية وشتوية","en":"Summer & winter camps","ms":"Kem musim panas & sejuk"},
    {"ar":"داخل مجمّع تجاري","en":"Inside a shopping mall","ms":"Dalam pusat beli-belah"}]',
  '{}',
  '601123591043', '+60 11-2359 1043',
  'Lot 16A, Level 2, Avenue K Shopping Mall, 156 Jalan Ampang, 50450 Kuala Lumpur',
  3.1594766, 101.7135149,
  4.4, 137,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"},
    {"ar":"المعسكر الصيفي/الشتوي","en":"Summer/Winter Camp","ms":"Kem"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ يحتاج تحققاً',
  false, 7
);

-- =====================================================================
-- 8) ELC (English Language Company) Malaysia — Bukit Bintang
--    ⚠️ تنبيه: مراجعة تشير لتغيير السعر حسب الجنسية — راجع التقرير
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'elc-bukit-bintang',
  '{"ar":"شركة اللغة الإنجليزية ELC - بوكيت بينتانج","en":"ELC (English Language Company) Malaysia","ms":"ELC Malaysia"}',
  '{"ar":"يقع في بوكيت بينتانج (منطقة التسوق والحياة الليلية). بيئة متعددة الجنسيات (يابان، الصين، روسيا، كوريا). ⚠️ تنبيه مهم: مراجعة عامة تتهم المعهد برفع السعر بعد رؤية جنسية الطالب، ومراجعة أخرى ترى أن الكورس المكثف ركّز على القواعد أكثر من المهارات. تقييمه 4.3 هو الأدنى في القائمة. راجع هذه النقاط بدقة قبل أي شراكة.","en":"Located in Bukit Bintang (shopping and nightlife district). Multinational mix (Japan, China, Russia, Korea). ⚠️ Important caution: a public review accuses the centre of raising the quoted price after seeing the student''s nationality, and another felt the intensive course over-focused on grammar. Its 4.3 rating is the lowest here. Review these points carefully before partnering.","ms":"Terletak di Bukit Bintang. Persekitaran pelbagai bangsa."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"بوكيت بينتانج","en":"Bukit Bintang","ms":"Bukit Bintang"},
    {"ar":"بيئة متعددة الجنسيات","en":"Multinational environment","ms":"Pelbagai bangsa"}]',
  '{}',
  '60321488211', '+60 3-2148 8211',
  '3.01, 3rd Floor, Jalan Bukit Bintang, 50480 Kuala Lumpur',
  3.1450227, 101.7088126,
  4.3, 89,
  '[]',
  '[{"ar":"الإنجليزية العامة المكثفة","en":"Intensive General English","ms":"Bahasa Inggeris Intensif"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ يحتاج تحققاً + تنبيه تسعير',
  false, 8
);

-- =====================================================================
-- 9) Direct English International Language Centre
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'direct-english-kl',
  '{"ar":"مركز دايركت إنجلش الدولي","en":"Direct English International Language Centre","ms":"Direct English"}',
  '{"ar":"تقييم 5.0 لكن من 18 مراجعة فقط (عيّنة صغيرة — تعامل معها بحذر). يقع قرب بوكيت نانس. مراجعات الطلاب (اليابان، الصين، فرنسا، روسيا، ميانمار) تُشيد بالفصول الصغيرة والتدريس بإيقاع يناسب مستوى الطالب. ⚠️ الاعتماد والأسعار تحتاج تأكيداً.","en":"Rated 5.0 but from only 18 reviews (small sample — treat with caution). Located near Bukit Nanas. Reviews (Japan, China, France, Russia, Myanmar) praise small classes and teaching paced to the student''s level. ⚠️ Accreditation and pricing need confirmation.","ms":"Penilaian 5.0 daripada 18 ulasan sahaja. Berhampiran Bukit Nanas."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"فصول صغيرة","en":"Small classes","ms":"Kelas kecil"},
    {"ar":"بيئة دولية","en":"International mix","ms":"Antarabangsa"}]',
  '{}',
  '60320224138', '+60 3-2022 4138',
  'Level 3, Jalan Bukit Nanas, 50250 Kuala Lumpur',
  3.150168, 101.6985123,
  5.0, 18,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ عيّنة مراجعات صغيرة',
  false, 9
);

-- =====================================================================
-- 10) Excel Language Center Malaysia (KL)
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, min_age, max_age,
  price_verified, data_source, is_active, sort_order
) values (
  'excel-language-kl',
  '{"ar":"مركز إكسل للغات","en":"Excel Language Center Malaysia","ms":"Pusat Bahasa Excel"}',
  '{"ar":"تقييم 5.0 من 21 مراجعة فقط (عيّنة صغيرة). يقع في Megan Avenue 4. مراجعات الطلاب تذكر أن رسومه أقل نسبياً من غيره، ومرافقه حديثة بعد تجديد. يستخدم أسلوباً عملياً (Simulation Street) لفرض التحدث من اليوم الأول، وبرنامج IELTS. ⚠️ الاعتماد والأسعار تحتاج تأكيداً.","en":"Rated 5.0 from only 21 reviews (small sample). Located at Megan Avenue 4. Reviews note relatively lower fees than others and modern, recently refurbished facilities. Uses a practical approach (Simulation Street) to force speaking from day one, plus IELTS prep. ⚠️ Accreditation and pricing need confirmation.","ms":"Penilaian 5.0 daripada 21 ulasan. Yuran agak rendah, kemudahan moden."}',
  '{"ar":"كوالالمبور","en":"Kuala Lumpur","ms":"Kuala Lumpur"}',
  'kuala_lumpur',
  0.00,
  4, 48,
  '[{"ar":"رسوم أقل نسبياً","en":"Relatively lower fees","ms":"Yuran lebih rendah"},
    {"ar":"مرافق مجددة حديثاً","en":"Recently refurbished","ms":"Kemudahan baharu"},
    {"ar":"أسلوب Simulation Street","en":"Simulation Street method","ms":"Kaedah Simulation Street"}]',
  '{}',
  '601139998060', '+60 11-3999 8060',
  'Unit B-3-8, Megan Avenue 4, Jalan Mayang Sari, 50450 Kuala Lumpur',
  3.1623624, 101.716883,
  5.0, 21,
  '[]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"تحضير IELTS","en":"IELTS Preparation","ms":"Persediaan IELTS"}]',
  18, 45,
  false,
  'Google Places — 2026-07-14 ⚠️ عيّنة مراجعات صغيرة',
  false, 10
);

-- =====================================================================
-- تحديث قواعد التطبيق بناءً على الاشتراطات الرسمية المكتشفة
-- =====================================================================

-- ⚠️ اكتشاف مهم: طلاب مراكز اللغة ممنوعون من العمل (خلافاً لطلاب الجامعات)
-- ولا يمكنهم إحضار مرافقين. ونطاق العمر 18-45.
insert into public.faq (question, answer, context_tags, sort_order) values
('{"ar":"هل أستطيع العمل بدوام جزئي أثناء دراسة اللغة؟","en":"Can I work part-time while studying English?","ms":"Bolehkah saya bekerja sambilan?"}',
 '{"ar":"لا. تنص دائرة الهجرة الماليزية صراحةً على أن تصريح العمل الجزئي (20 ساعة أسبوعياً) متاح فقط لطلاب الجامعات العامة والخاصة — أما حاملو تأشيرة الطالب عبر مراكز اللغة والتدريب فغير مسموح لهم بالعمل إطلاقاً. انتبه: بعض مواقع المعاهد تذكر معلومة قديمة تخالف ذلك، والمصدر الرسمي هو المعتمد.","en":"No. Malaysia''s Immigration Department states explicitly that part-time work (20 hours/week) is available only to students at public and private universities — Student Pass holders under the Language Centre and Training Centre category are NOT permitted to work at all. Note: some institute websites carry outdated information contradicting this; the official source prevails.","ms":"Tidak. Pemegang Pas Pelajar di bawah kategori Pusat Bahasa TIDAK dibenarkan bekerja."}',
 '{visa,documents}', 7),
('{"ar":"ما شروط العمر لدراسة اللغة في ماليزيا؟","en":"What are the age requirements?","ms":"Apakah syarat umur?"}',
 '{"ar":"لأغراض التأشيرة، مراكز اللغة تقبل فقط من هم بين 18 و45 سنة. من هو داخل ماليزيا بتأشيرة سارية لا ينطبق عليه هذا القيد.","en":"For visa purposes, language centres can only accept students aged 18–45. Anyone already in Malaysia on a valid visa is not bound by this limit.","ms":"Untuk tujuan visa, pusat bahasa hanya menerima pelajar berumur 18-45 tahun."}',
 '{documents}', 8),
('{"ar":"هل أستطيع إحضار عائلتي معي؟","en":"Can I bring my family with me?","ms":"Bolehkah saya membawa keluarga?"}',
 '{"ar":"لا. تنص قواعد الهجرة على أن حاملي تأشيرة الطالب عبر مراكز اللغة غير مسموح لهم بإحضار مرافقين (Dependents). هذه الميزة متاحة فقط لطلاب الماجستير والدكتوراه.","en":"No. Immigration rules state that Student Pass holders under the Language Centre category are not permitted to bring dependents. This is available only to Master''s and PhD students.","ms":"Tidak. Pemegang Pas Pelajar Pusat Bahasa tidak dibenarkan membawa tanggungan."}',
 '{visa}', 9),
('{"ar":"كم مدة تأشيرة الطالب لمراكز اللغة؟","en":"How long is the Student Pass for language centres?","ms":"Berapa lama Pas Pelajar?"}',
 '{"ar":"تصدر دائرة الهجرة تأشيرة الطالب لمراكز اللغة لمدة أقصاها 12 شهراً، أو لمدة الكورس إن كانت أقل من ذلك. ويجب أن تكون خارج ماليزيا وقت تقديم الطلب.","en":"Immigration issues Student Passes for language centres for a maximum of 12 months, or for the course duration if shorter. You must be outside Malaysia when the application is submitted.","ms":"Pas Pelajar untuk pusat bahasa maksimum 12 bulan."}',
 '{visa,documents}', 10)
on conflict do nothing;

-- تحديث نطاق العمر في المتطلبات
update public.requirements
set description = '{"ar":"صورة واضحة لصفحة البيانات. شرط EMGS الأساسي: صلاحية الجواز 18 شهراً فأكثر — إن كانت أقل جدّد جوازك أولاً عبر أبشر. ملاحظة: مراكز اللغة تقبل فقط من هم بين 18 و45 سنة لأغراض التأشيرة.","en":"A clear scan of the data page. Core EMGS rule: passport valid 18+ months — renew first if shorter. Note: language centres accept only ages 18-45 for visa purposes.","ms":"Imbasan jelas halaman data. Pasport sah 18+ bulan. Umur 18-45."}'
where key = 'passport';

-- =====================================================================
-- 11) Britannia Language Centre
--     ✅ جاهز للنشر — التوثيق ممتاز من موقعه الرسمي britannia.edu.my
--     ⭐ ميزته الحاسمة لسوقك: معتمد من الملحقية الثقافية السعودية بكوالالمبور
--        (لا يملكها أي معهد آخر في قائمتنا) + مركز IELTS رسمي بشراكة IDP
-- =====================================================================
insert into public.institutes (
  slug, name, description, city, city_key, price_myr, min_weeks, max_weeks,
  tags, images, whatsapp, phone, website, address, location_lat, location_lng,
  rating, rating_count, accreditation, programs, levels_count,
  min_age, max_age, price_verified, data_source, is_active, sort_order
) values (
  'britannia-language-centre',
  '{"ar":"مركز بريتانيا للغة الإنجليزية","en":"Britannia Language Centre","ms":"Pusat Bahasa Britannia"}',
  '{"ar":"الخيار الأقوى للطالب السعودي تحديداً: معتمد من وزارة التعليم العالي الماليزية، ومعتمد من الملحقية الثقافية السعودية في كوالالمبور — وهذا اعتماد لا يملكه أغلب المعاهد ويهم كل طالب مبتعث أو يريد معادلة دراسته. يقدّم بريتانيا طلب تأشيرة الطالب نيابةً عنك عبر EMGS مباشرة. كما أنه مركز IELTS رسمي بشراكة IDP — تتحضر وتؤدي الاختبار في نفس المكان دون تنقل. يقع في برج Menara Genesis على شارع سلطان إسماعيل في قلب بوكيت بينتانج، على بعد خطوات من محطتي MRT ومونوريل بوكيت بينتانج، ومحاط بمطاعم شرق أوسطية. معلموه ناطقون أصليون من بريطانيا وأستراليا ونيوزيلندا، ومتوسط حجم الفصل 10 طلاب فقط. طلابه من أكثر من 40 دولة. 4 مستويات (مبتدئ، ما قبل المتوسط، متوسط، متقدم) بالإضافة لبرامج IELTS. ملاحظة مهمة: رسوم الفحص الطبي بعد الوصول مشمولة في الرسوم الإجمالية.","en":"The strongest choice specifically for Saudi students: accredited by Malaysia''s Ministry of Higher Education AND approved by the Saudi Cultural Mission in Kuala Lumpur — an approval most centres lack, and one that matters to any sponsored student or anyone needing their studies recognised back home. Britannia files your Student Pass application on your behalf directly through EMGS. It is also an official IELTS centre in partnership with IDP — you prepare and sit the exam in the same place. Located in Menara Genesis on Jalan Sultan Ismail in the heart of Bukit Bintang, steps from the Bukit Bintang MRT and Monorail stations, surrounded by Middle Eastern restaurants. Native teachers from the UK, Australia and New Zealand; average class size of just 10 students. Students from 40+ countries. Four levels (Elementary, Pre-Intermediate, Intermediate, Advanced) plus IELTS programs. Note: the post-arrival medical checkup fee is included in the total fees.","ms":"Diluluskan Kementerian Pengajian Tinggi dan Misi Kebudayaan Saudi. Pusat IELTS rasmi dengan IDP. Terletak di Menara Genesis, Bukit Bintang."}',
  '{"ar":"كوالالمبور — بوكيت بينتانج","en":"Kuala Lumpur — Bukit Bintang","ms":"Kuala Lumpur — Bukit Bintang"}',
  'kuala_lumpur',
  0.00,   -- يُضبط في seed-prices.sql
  4, 48,
  '[{"ar":"معتمد من الملحقية الثقافية السعودية","en":"Saudi Cultural Mission approved","ms":"Diluluskan Misi Kebudayaan Saudi"},
    {"ar":"مركز IELTS رسمي (شراكة IDP)","en":"Official IELTS centre (IDP partner)","ms":"Pusat IELTS rasmi (IDP)"},
    {"ar":"معتمد من وزارة التعليم العالي","en":"Ministry of Higher Education accredited","ms":"Diiktiraf KPT"},
    {"ar":"يقدّم طلب التأشيرة عبر EMGS نيابةً عنك","en":"Files your EMGS visa application for you","ms":"Memfailkan visa EMGS untuk anda"},
    {"ar":"متوسط 10 طلاب بالفصل","en":"Average 10 students per class","ms":"Purata 10 pelajar sekelas"},
    {"ar":"معلمون من بريطانيا وأستراليا ونيوزيلندا","en":"Teachers from UK, Australia, New Zealand","ms":"Guru dari UK, Australia, NZ"},
    {"ar":"خطوات من مترو بوكيت بينتانج","en":"Steps from Bukit Bintang MRT","ms":"Berdekatan MRT Bukit Bintang"},
    {"ar":"الفحص الطبي مشمول بالرسوم","en":"Medical checkup included in fees","ms":"Pemeriksaan perubatan termasuk"},
    {"ar":"طلاب من +40 دولة","en":"Students from 40+ countries","ms":"Pelajar dari 40+ negara"}]',
  '{}',
  '60327327278', '+60 3-2732 7278', 'https://britannia.edu.my',
  'Menara Genesis, 33 Jalan Sultan Ismail, Bukit Bintang, 50250 Kuala Lumpur',
  3.1482306, 101.7108416,
  4.5, 168,
  '["MOHE","EMGS","IDP","Saudi Cultural Mission"]',
  '[{"ar":"الإنجليزية العامة","en":"General English","ms":"Bahasa Inggeris Am"},
    {"ar":"الإنجليزية المكثفة","en":"Intensive English","ms":"Bahasa Inggeris Intensif"},
    {"ar":"تحضير IELTS + أداء الاختبار","en":"IELTS preparation + exam sitting","ms":"Persediaan IELTS + peperiksaan"},
    {"ar":"إنجليزية الأعمال","en":"Business English","ms":"Bahasa Inggeris Perniagaan"}]',
  4, 18, 45,
  false,
  'Google Places + britannia.edu.my (official) + edumize.com — 2026-07-14',
  true, 4
);

-- الرسوم الموثّقة من موقع بريتانيا الرسمي
update public.institutes set
  extra_fees = '[{"key":"registration_visa","amount":2000,"label":{"ar":"رسوم التسجيل ومعالجة التأشيرة (تُدفع مقدماً)","en":"Registration & visa processing fee (paid upfront)","ms":"Yuran pendaftaran & visa"}}]'
where slug = 'britannia-language-centre';

-- سؤال شائع: اعتماد الملحقية الثقافية (يهم المبتعثين تحديداً)
insert into public.faq (question, answer, context_tags, sort_order) values
('{"ar":"هل المعهد معتمد من الملحقية الثقافية السعودية؟","en":"Is the institute approved by the Saudi Cultural Mission?","ms":"Adakah institut diluluskan Misi Kebudayaan Saudi?"}',
 '{"ar":"هذا مهم جداً إن كنت مبتعثاً أو تريد الاعتراف بدراستك في السعودية. من معاهدنا الحالية، بريتانيا هو المعتمد من الملحقية الثقافية السعودية في كوالالمبور. قبل التسجيل في أي معهد آخر، تحقق من قائمة الملحقية المحدّثة — الاعتماد قد يتغير.","en":"This matters greatly if you are a sponsored student or need your studies recognised in Saudi Arabia. Among our current centres, Britannia is approved by the Saudi Cultural Mission in Kuala Lumpur. Before enrolling anywhere else, check the Mission''s updated list — approvals can change.","ms":"Penting jika anda pelajar tajaan. Britannia diluluskan Misi Kebudayaan Saudi."}',
 '{documents,offer}', 11)
on conflict do nothing;
