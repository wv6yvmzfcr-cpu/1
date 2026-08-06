-- =====================================================================
-- ١٠ - منح صلاحيات الوصول للأدوار العامة (anon / authenticated)
-- نفّذه بعد الملفات ١..٩.
--
-- لماذا؟ واجهة REST في Supabase تعمل بدور anon (للزائر) و authenticated
-- (للمسجّل). إن لم يملك هذان الدوران صلاحية على مستوى الجدول، تظهر رسالة
-- "permission denied for table ...". هذه الصلاحيات قياسية في Supabase،
-- والحماية الفعلية تبقى عبر Row Level Security (RLS) صفّاً بصف.
--
-- آمن: منح الصلاحية على مستوى الجدول لا يكشف بيانات — سياسات RLS التي
-- بنيناها هي التي تحدد أي صفوف يراها كل دور (الزائر: المحتوى المفعّل فقط،
-- المسجّل: بياناته هو فقط).
-- =====================================================================

grant usage on schema public to anon, authenticated;

-- القراءة العامة (الفلترة عبر RLS)
grant select on all tables in schema public to anon, authenticated;

-- الكتابة للمسجّلين (الفلترة عبر RLS: كلٌّ على بياناته)
grant insert, update, delete on all tables in schema public to authenticated;

-- التسلسلات (للأعمدة التلقائية)
grant usage, select on all sequences in schema public to anon, authenticated;

-- الجداول المستقبلية تُمنح تلقائياً أيضاً
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
