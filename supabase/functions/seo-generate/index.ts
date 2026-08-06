// =====================================================================
// مولّد محتوى SEO — Supabase Edge Function (Deno)
// supabase/functions/seo-generate/index.ts
//
// المهمة: يولّد صفحات هبوط ومقالات مدونة **من بياناتك الحقيقية**.
//
// ⚠️ المبدأ الحاكم: المحتوى يُبنى على حقائق من قاعدة بياناتك فقط
//    (تقييمات Google الفعلية، الاعتمادات الموثّقة، اشتراطات EMGS الرسمية).
//    لا حشو ولا مبالغات — Google صار يعاقب المحتوى الفارغ بقسوة،
//    ومحتوى مبني على حقائق هو ميزتك الوحيدة أمام مواقع المعاهد نفسها.
//
// ⚠️ ولا يُنشر تلقائياً: is_published = false حتى تراجعه.
//
// النشر: supabase functions deploy seo-generate
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    // مسؤول فقط
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return json({ error: "admin_only" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { type, lang = "ar", slug, instituteSlug, topic } = await req.json();

    // ---- بناء السياق الحقيقي من قاعدة البيانات ----
    let facts = "";
    let keywords: string[] = [];

    const { data: kws } = await admin
      .from("seo_keywords").select("keyword, intent")
      .eq("lang", lang).lte("priority", 2).limit(15);
    keywords = (kws ?? []).map((k) => k.keyword);

    if (type === "institute") {
      const { data: inst } = await admin
        .from("institutes").select("*").eq("slug", instituteSlug).single();
      if (!inst) return json({ error: "institute_not_found" }, 404);

      facts = `## حقائق المعهد (من قاعدة البيانات — لا تخترع غيرها)
الاسم: ${pick(inst.name, lang)}
المدينة: ${pick(inst.city, lang)}
العنوان: ${inst.address ?? "غير محدد"}
تقييم Google: ${inst.rating ?? "غير متوفر"} من ${inst.rating_count ?? 0} مراجعة
الاعتمادات الموثّقة: ${(inst.accreditation ?? []).join(", ") || "لم تُوثّق بعد"}
السعر: ${inst.price_month_myr ?? "غير منشور"} رينغت/شهر ${inst.price_estimated ? "(تقديري — يجب ذكر ذلك صراحةً)" : "(مؤكّد)"}
النطاق السعري: ${inst.price_min_myr}-${inst.price_max_myr} رينغت
ساعات أسبوعية: ${inst.hours_per_week ?? "غير محدد"}
المستويات: ${inst.levels_count ?? "غير محدد"}
العمر المقبول: ${inst.min_age}-${inst.max_age}
البرامج: ${(inst.programs ?? []).map((p: Record<string,string>) => pick(p, lang)).join(" · ")}
المميزات: ${(inst.tags ?? []).map((t: Record<string,string>) => pick(t, lang)).join(" · ")}
الوصف: ${pick(inst.description, lang)}
الرسوم الإضافية: ${JSON.stringify(inst.extra_fees ?? [])}`;
    }

    if (type === "guide" || type === "blog") {
      const { data: faqs } = await admin.from("faq").select("question, answer").eq("is_active", true);
      const { data: steps } = await admin.from("pipeline_steps").select("*").order("step_order");
      const { data: reqs } = await admin.from("requirements").select("name, description");
      const { data: insts } = await admin
        .from("institutes").select("name, city, rating, rating_count, accreditation, price_month_myr, price_estimated")
        .eq("is_active", true).order("sort_order");

      facts = `## قاعدة المعرفة الموثّقة (المصدر الوحيد المسموح — لا تخترع)

### الأسئلة الشائعة المعتمدة
${(faqs ?? []).map((f) => `س: ${pick(f.question, lang)}\nج: ${pick(f.answer, lang)}`).join("\n\n")}

### مراحل التسجيل
${(steps ?? []).map((s) => `${s.step_order}. ${pick(s.title, lang)} — ${pick(s.explanation, lang)}`).join("\n")}

### المستندات المطلوبة
${(reqs ?? []).map((r) => `- ${pick(r.name, lang)}: ${pick(r.description, lang)}`).join("\n")}

### المعاهد المنشورة
${(insts ?? []).map((i) => `- ${pick(i.name, lang)} (${pick(i.city, lang)}) — ⭐${i.rating}/${i.rating_count} مراجعة — اعتماد: ${(i.accreditation ?? []).join("/") || "قيد التحقق"} — ${i.price_month_myr} رينغت/شهر${i.price_estimated ? " (تقديري)" : ""}`).join("\n")}

### اشتراطات رسمية حاسمة (من دائرة الهجرة الماليزية و EMGS)
- العمر المقبول لمراكز اللغة: 18–45 سنة
- صلاحية الجواز: 18 شهراً فأكثر من بدء الدراسة
- **ممنوع العمل نهائياً** لطلاب مراكز اللغة (تصريح الـ20 ساعة لطلاب الجامعات فقط)
- ممنوع إحضار مرافقين (للماجستير والدكتوراه فقط)
- مدة تأشيرة الطالب: 12 شهراً كحد أقصى
- يجب أن يكون الطالب خارج ماليزيا وقت تقديم طلب التأشيرة
- الفحص الطبي: في عيادة EMGS داخل ماليزيا خلال 7 أيام من الوصول
- بطاقة الوصول الرقمية MDAC: تُقدَّم مجاناً خلال 3 أيام فقط قبل الوصول (الأبكر يُرفض)
- السعوديون: إعفاء تأشيرة 90 يوماً للزيارة`;
    }

    // ---- التعليمات ----
    const system = `أنت كاتب محتوى SEO محترف لمنصة "إيدولينك" — تسجيل الطلاب في معاهد اللغة بماليزيا.

## قواعد غير قابلة للتفاوض
1. **لا تخترع أي حقيقة.** استخدم الحقائق المعطاة فقط. إن نقصت معلومة، قل "يُؤكَّد من المعهد" ولا تملأ الفراغ بالتخمين.
2. **السعر التقديري يُذكر صراحةً كتقديري** — مع النطاق. الطالب سيبني ميزانيته على كلامك.
3. **لا مبالغات تسويقية فارغة** ("الأفضل!"، "لا يُقاوَم!"). Google يعاقبها، والقارئ لا يصدقها.
4. اكتب بلغة ${lang} **أصيلة** — لا ترجمة حرفية. بالعربية: فصحى مبسّطة يفهمها طالب في العشرين.
5. **الصدق ميزتنا التنافسية**: إن كان اعتماد معهد غير موثّق، قل ذلك. القارئ يثق بمن يحذّره.

## أسلوب SEO
- الكلمة المفتاحية الأساسية في: العنوان (بداية) · H1 · أول 100 كلمة · عنوان فرعي واحد على الأقل
- كثافة طبيعية — **لا حشو**. اكتب للإنسان أولاً.
- عناوين فرعية (##) كل 200-300 كلمة
- جداول للمقارنات والأرقام (Google يحبها وقد تظهر كمقتطف مميز)
- فقرات قصيرة (2-4 أسطر) — أغلب القراء على الجوال
- **افتح بإجابة مباشرة على سؤال العنوان في أول فقرة** (يزيد فرصة المقتطف المميز)
- اختم بدعوة عملية واضحة

الكلمات المستهدفة: ${keywords.join(" · ")}

## المخرج
JSON فقط، بلا markdown fences:
{
  "title": "50-60 حرفاً، الكلمة المفتاحية في البداية",
  "meta_desc": "150-160 حرفاً، فيها الكلمة + دعوة للنقر",
  "h1": "قد يختلف عن title",
  "slug": "english-slug-only-lowercase-hyphens",
  "excerpt": "جملتان للمعاينة",
  "body_md": "المحتوى بـ Markdown، 800-1500 كلمة",
  "keywords": ["الكلمة الأساسية", "..."],
  "reading_min": 5
}`;

    const task = type === "institute"
      ? `اكتب صفحة هبوط للمعهد. الزاوية: مراجعة صادقة تساعد الطالب على القرار — لا إعلان.
غطِّ: من يناسبه هذا المعهد ومن لا يناسبه · الاعتمادات ومعناها العملي · البرامج · التكلفة الكاملة (مع الرسوم الإضافية!) · الموقع · كيف تسجّل.`
      : type === "guide"
      ? `اكتب دليلاً شاملاً عن: ${topic}. الزاوية: أشمل وأدق مرجع بهذه اللغة — يجيب عن كل سؤال يعطّل الطالب.`
      : `اكتب مقال مدونة عن: ${topic}. الزاوية: تجربة عملية صادقة تحل مشكلة حقيقية.`;

    // ---- استدعاء Claude ----
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",   // Sonnet للمحتوى — الجودة تستحق هنا
        max_tokens: 4000,
        system,
        messages: [{ role: "user", content: `${facts}\n\n---\n\n${task}` }],
      }),
    });

    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = await res.json();
    const raw = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text).join("");
    const out = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // ---- الحفظ كمسودة (لا نشر تلقائي) ----
    const finalSlug = slug ?? out.slug;

    if (type === "blog") {
      await admin.from("blog_posts").upsert({
        slug: finalSlug, lang,
        title: out.title, excerpt: out.excerpt, body_md: out.body_md,
        keywords: out.keywords, category: topic, reading_min: out.reading_min,
        is_published: false,
      }, { onConflict: "slug,lang" });
    } else {
      const { data: inst } = instituteSlug
        ? await admin.from("institutes").select("id").eq("slug", instituteSlug).single()
        : { data: null };
      await admin.from("seo_pages").upsert({
        slug: finalSlug, lang, type,
        title: out.title, meta_desc: out.meta_desc, h1: out.h1,
        body_md: out.body_md, keywords: out.keywords,
        institute_id: inst?.id ?? null,
        is_published: false,
      }, { onConflict: "slug,lang" });
    }

    return json({ ok: true, draft: out, note: "حُفظت كمسودة — راجعها ثم انشرها" });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function pick(f: Record<string, string> | null, lang: string): string {
  if (!f) return "";
  return f[lang] ?? f["en"] ?? Object.values(f)[0] ?? "";
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
