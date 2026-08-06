// =====================================================================
// المساعد الذكي — Supabase Edge Function (Deno)
// supabase/functions/assistant/index.ts
//
// لماذا Edge Function وليس استدعاء مباشر من التطبيق؟
//  1) مفتاح Anthropic يبقى سرياً في السيرفر (لا يُشحن داخل التطبيق أبداً).
//  2) نبني "سياق الطالب" من قاعدة البيانات بصلاحياته هو (RLS) —
//     فالمساعد يعرف حالة طلبه ومستنداته الفعلية ويجيب بدقة وبلغته.
//
// النشر:
//   supabase functions deploy assistant
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // ---- 1) التحقق من هوية الطالب (بنفس توكن جلسته — RLS يحمي البيانات) ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { message, lang = "ar" } = await req.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "empty" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- 2) بناء سياق الطالب الحقيقي من قاعدة البيانات ----
    const [apps, docs, steps, faq, history] = await Promise.all([
      supabase.from("applications")
        .select("id, status, weeks, start_month, created_at, institutes(name, city, price_myr)")
        .order("created_at", { ascending: false }).limit(3),
      supabase.from("application_documents")
        .select("requirement_key, status, rejection_key, value_text"),
      supabase.from("pipeline_steps").select("*").order("step_order"),
      supabase.from("faq").select("question, answer").eq("is_active", true),
      supabase.from("chat_messages")
        .select("role, content").order("created_at", { ascending: false }).limit(10),
    ]);

    const pick = (f: Record<string, string> | null) =>
      f?.[lang] ?? f?.["en"] ?? Object.values(f ?? {})[0] ?? "";

    const contextBlock = `
## حالة الطالب الفعلية (من قاعدة البيانات)
الطلبات: ${JSON.stringify(apps.data ?? [], null, 1)}
المستندات وحالاتها: ${JSON.stringify(docs.data ?? [], null, 1)}

## مراحل خط سير الطلب (بالترتيب)
${(steps.data ?? []).map((s) => `- ${s.status}: ${pick(s.title)} — ${pick(s.explanation)} | المطلوب من الطالب: ${pick(s.your_action)}`).join("\n")}

## قاعدة المعرفة المعتمدة
${(faq.data ?? []).map((f) => `س: ${pick(f.question)}\nج: ${pick(f.answer)}`).join("\n\n")}`;

    const systemPrompt =
      `أنت "مرشد إيدولينك" — مساعد تسجيل الطلاب في معاهد اللغة بماليزيا داخل تطبيق EduLink MY.
مهمتك: إزالة أي حاجز يعطّل تسجيل الطالب، بإجابات دقيقة وعملية.
قواعدك:
1) أجب دائماً بلغة الطالب الحالية (رمزها: ${lang}) مهما كانت لغة سؤاله.
2) اعتمد أولاً على "حالة الطالب الفعلية" أدناه: إن سأل "وش ناقصني؟" أجب من مستنداته الحقيقية بالاسم، وإن سأل عن وضع طلبه اشرح مرحلته الحالية وخطوته التالية بالضبط.
3) اعتمد "قاعدة المعرفة المعتمدة" كمصدر للإجراءات (EMGS، التأشيرة، الدفع، الفحص الطبي). لا تخترع إجراءات أو رسوماً أو مدداً غير مذكورة — إن لم تعرف قل ذلك واقترح التواصل مع فريق الدعم من صفحة الطلب.
4) كن مختصراً وودوداً: فقرة أو فقرتان، وخطوات مرقمة عند الحاجة فقط.
5) لا تطلب من الطالب بيانات حساسة في المحادثة (أرقام بطاقات، كلمات مرور).

${contextBlock}`;

    // ---- 3) استدعاء Claude API ----
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // الأرخص والأسرع — مثالي لهذه المهمة
        max_tokens: 700,
        system: systemPrompt,
        messages: [
          // آخر 10 رسائل كذاكرة قصيرة (مقلوبة للترتيب الزمني الصحيح)
          ...(history.data ?? []).reverse().map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: message },
        ],
      }),
    });

    if (!anthropicRes.ok) throw new Error(`anthropic ${anthropicRes.status}`);
    const data = await anthropicRes.json();
    const reply: string = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text).join("\n");

    // ---- 4) حفظ المحادثة (تظهر للطالب عند إعادة فتح الشاشة) ----
    await supabase.from("chat_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
