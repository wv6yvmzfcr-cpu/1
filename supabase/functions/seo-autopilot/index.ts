// =====================================================================
// طيّار SEO الآلي — Supabase Edge Function (Deno)
// supabase/functions/seo-autopilot/index.ts
//
// الهدف: نمو محتوى الموقع تلقائياً بلا تدخّل — يكتشف الكلمات المفتاحية
// التي لا صفحة لها، ويولّد صفحة/دليلاً من حقائق قاعدتك (بلا اختراع)،
// وينشرها. يُشغَّل بجدول زمني (pg_cron) أو يدوياً من اللوحة.
//
// الأمان: سرّ داخلي (للجدولة) أو مدير (للتشغيل اليدوي).
// الأسرار: ANTHROPIC_API_KEY ، (اختياري) SEO_MODEL ، EDULINK_INVOKE_SECRET.
// =====================================================================
import { hasServiceSecret, requireAdmin, serviceClient, json, cors } from "../_shared/auth.ts";

const MODEL = Deno.env.get("SEO_MODEL") || "claude-sonnet-4-6";

const slugify = (s: string) =>
  (s || "").toString().toLowerCase().trim()
    .replace(/^\/+|\/+$/g, "").replace(/^(guide|blog)\//, "")
    .replace(/[^\w؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "page";

const pick = (o: Record<string, string> | null, lang: string) =>
  o?.[lang] ?? o?.["ar"] ?? o?.["en"] ?? Object.values(o ?? {})[0] ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // تفويض: سرّ الجدولة أو مدير
    if (!hasServiceSecret(req)) {
      const a = await requireAdmin(req);
      if (!a.ok) return a.response;
    }
    const admin = serviceClient();
    const { lang = "ar", max = 1 } = await req.json().catch(() => ({}));

    // إعداد النشر التلقائي (افتراضي: مُفعّل — الهدف صفر تدخّل)
    const { data: seoCfg } = await admin.from("app_config").select("value").eq("key", "seo").maybeSingle();
    const autopublish = (seoCfg?.value?.autopublish ?? true) !== false;

    // 1) اكتشاف الفجوات: كلمات ذات أولوية بلا صفحة منشورة
    let candidates: { lang: string; keyword: string; priority: number; target_page: string | null }[] = [];
    const gaps = await admin.from("v_seo_gaps").select("*").order("priority").limit(max * 4);
    if (!gaps.error && gaps.data) {
      candidates = gaps.data
        .filter((g: { status: string }) => String(g.status).includes("missing"))
        .map((g: Record<string, unknown>) => ({ lang: g.lang as string, keyword: g.keyword as string, priority: g.priority as number, target_page: (g.target_page as string) || null }));
    }
    if (!candidates.length) {
      const kws = await admin.from("seo_keywords").select("lang,keyword,priority,target_page").lte("priority", 2).limit(max * 4);
      candidates = (kws.data || []) as typeof candidates;
    }
    if (lang) candidates = candidates.filter((c) => c.lang === lang);
    if (!candidates.length) return json({ ok: true, generated: [], note: "no_gaps" });

    // 2) بناء حقائق قاعدتك (المصدر الوحيد المسموح)
    const facts = await buildFacts(admin, lang);

    const results: unknown[] = [];
    for (const c of candidates.slice(0, max)) {
      const slug = slugify(c.target_page || c.keyword);
      const exists = await admin.from("seo_pages").select("id").eq("slug", slug).eq("lang", c.lang).maybeSingle();
      if (exists.data) continue;

      const gen = await generate(c.keyword, c.lang, facts);
      if (!gen) continue;

      const finalSlug = slugify(gen.slug || slug);
      const ins = await admin.from("seo_pages").insert({
        slug: finalSlug, lang: c.lang, type: "guide",
        title: gen.title, meta_desc: gen.meta_desc, h1: gen.h1 || gen.title,
        body_md: gen.body_md, keywords: gen.keywords || [c.keyword],
        is_published: autopublish, published_at: autopublish ? new Date().toISOString() : null,
      });
      results.push({ keyword: c.keyword, slug: finalSlug, lang: c.lang, published: autopublish, error: ins.error?.message || null });
    }
    return json({ ok: true, autopublish, generated: results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function buildFacts(admin: ReturnType<typeof serviceClient>, lang: string): Promise<string> {
  const [{ data: faqs }, { data: steps }, { data: insts }] = await Promise.all([
    admin.from("faq").select("question,answer").eq("is_active", true),
    admin.from("pipeline_steps").select("step_order,title,explanation").order("step_order"),
    admin.from("institutes").select("name,city,price_month_myr,price_estimated,tags").eq("is_active", true).order("sort_order"),
  ]);
  return `## قاعدة المعرفة الموثّقة (المصدر الوحيد — لا تخترع)

### المعاهد
${(insts || []).map((i: Record<string, unknown>) => `- ${pick(i.name as Record<string, string>, lang)} (${pick(i.city as Record<string, string>, lang)}) — ${i.price_month_myr} رينغت/شهر${i.price_estimated ? " (تقديري)" : ""}`).join("\n")}

### مراحل التسجيل
${(steps || []).map((s: Record<string, unknown>) => `${s.step_order}. ${pick(s.title as Record<string, string>, lang)} — ${pick(s.explanation as Record<string, string>, lang)}`).join("\n")}

### أسئلة معتمدة
${(faqs || []).map((f: Record<string, unknown>) => `س: ${pick(f.question as Record<string, string>, lang)}\nج: ${pick(f.answer as Record<string, string>, lang)}`).join("\n\n")}

### اشتراطات رسمية حاسمة
- العمر 18–45 لمراكز اللغة · صلاحية الجواز 18 شهراً+ من بدء الدراسة
- ممنوع العمل لطلاب مراكز اللغة · السعوديون: إعفاء تأشيرة 90 يوماً
- الفحص الطبي داخل ماليزيا خلال 7 أيام · MDAC مجانية خلال 3 أيام قبل الوصول`;
}

interface Gen { title: string; meta_desc: string; h1: string; slug: string; body_md: string; keywords: string[] }

async function generate(keyword: string, lang: string, facts: string): Promise<Gen | null> {
  const system = `أنت كاتب محتوى SEO محترف لمنصة تسجيل الطلاب في معاهد اللغة بماليزيا.
قواعد غير قابلة للتفاوض:
1. لا تخترع أي حقيقة — استخدم الحقائق المعطاة فقط؛ إن نقصت معلومة قل "يُؤكَّد من المعهد".
2. السعر التقديري يُذكر صراحةً كتقديري.
3. لا مبالغات تسويقية فارغة — اكتب للإنسان أولاً بلغة ${lang} أصيلة.
4. الكلمة المفتاحية في: العنوان (البداية) · H1 · أول 100 كلمة · عنوان فرعي.
أعد JSON فقط بلا أي نص أو أسوار markdown:
{"title":"50-60 حرفاً","meta_desc":"150-160 حرفاً","h1":"...","slug":"english-slug-lowercase-hyphens","body_md":"800-1200 كلمة Markdown","keywords":["..."]}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 4000, system,
        messages: [{ role: "user", content: `${facts}\n\n---\n\nاكتب دليلاً شاملاً يستهدف الكلمة: «${keyword}». الزاوية: أشمل وأدق مرجع بهذه اللغة يجيب عن كل سؤال يعطّل الطالب.` }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch { return null; }
}
