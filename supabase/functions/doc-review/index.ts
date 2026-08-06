// =====================================================================
// مراجع المستندات الذكي — Supabase Edge Function (Deno)
// supabase/functions/doc-review/index.ts   (نسخة مُصحّحة أمنياً)
//
// المشكلة: كل طالب = 4 مستندات تفحصها بعينك. الحل: Claude يفحصها أولاً
//          ويعطيك حكماً مبدئياً + السبب المقنّن.
//
// 🔒 إصلاح معماري: كانت الدالة تعمل بـ service_role بلا تحقق من المُستدعي،
//    فأي أحد يقدر يشغّل استدعاءات Claude المدفوعة على أي documentId ويقرأ
//    البيانات المستخرجة منه. الآن: **مدير فقط**.
//
// ⚠️ قرار تصميمي: هذا مساعد لك لا بديل عنك — النتيجة تُخزَّن كـ ai_verdict
//    (لا status)، والحالة تبقى pending حتى تعتمدها أنت.
//
// النشر: supabase functions deploy doc-review
// =====================================================================
import { requireAdmin, serviceClient, json, cors } from "../_shared/auth.ts";

interface Verdict {
  verdict: "pass" | "review" | "fail";
  confidence: number;              // 0-1
  rejection_key: string | null;    // مفتاح من rejection_reasons
  findings: string[];              // ملاحظات موجزة لك
  extracted: Record<string, string>; // بيانات مقروءة (تاريخ الانتهاء مثلاً)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // ---- 0) التفويض أولاً — مدير فقط ----
    const authz = await requireAdmin(req);
    if (!authz.ok) return authz.response;

    const { documentId } = await req.json();
    if (!documentId) return json({ error: "missing_document_id" }, 400);

    const admin = serviceClient();

    // ---- 1) جلب المستند وسياقه ----
    const { data: doc } = await admin
      .from("application_documents")
      .select("id, requirement_key, storage_path, value_text, application_id, applications(start_month)")
      .eq("id", documentId)
      .single();

    if (!doc?.storage_path) return json({ error: "no_file" }, 400);

    // ---- 2) تنزيل الملف ----
    const { data: file, error: dlErr } = await admin.storage
      .from("documents")
      .download(doc.storage_path);
    if (dlErr || !file) return json({ error: "download_failed" }, 500);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = doc.storage_path.split(".").pop()?.toLowerCase() ?? "jpg";

    const isPdf = ext === "pdf";
    const mediaType = isPdf ? "application/pdf"
      : ext === "png" ? "image/png"
      : "image/jpeg";

    // ---- 3) التعليمات حسب نوع المستند ----
    const prompts: Record<string, string> = {
      passport: `افحص صورة جواز السفر هذه:
1) هل هي صفحة البيانات (فيها الصورة والاسم ورقم الجواز وتاريخ الانتهاء)؟
2) هل كل النصوص **مقروءة بوضوح**؟ (ضبابية = رفض)
3) استخرج تاريخ انتهاء الجواز بصيغة YYYY-MM-DD.
4) تاريخ بدء الدراسة المخطط: ${doc.applications?.start_month ?? "غير محدد"}.
   قاعدة EMGS: الجواز يجب أن يكون صالحاً 18 شهراً فأكثر من بدء الدراسة.
   احسب: هل يستوفي؟`,

      photo: `افحص هذه الصورة الشخصية وفق اشتراطات صورة الجواز:
1) هل الخلفية **بيضاء صافية** وموحّدة؟
2) هل الوجه واضح ومواجه للكاميرا وفي المنتصف؟
3) هل يشغل الوجه نسبة معقولة من الإطار (ليس بعيداً جداً ولا مقصوصاً)؟
4) هل توجد نظارة شمسية أو ما يحجب ملامح الوجه؟ (غطاء الرأس/الحجاب **مقبول** إن كان الوجه كاملاً ظاهراً)
5) هل الإضاءة كافية بلا ظلال قوية؟`,

      certificate: `افحص هذه الشهادة الدراسية:
1) هل هي فعلاً شهادة دراسية (ثانوية أو جامعية)؟
2) هل كل النصوص مقروءة؟
3) هل تبدو كاملة (غير مقصوصة الأطراف، لا صفحات ناقصة)؟
4) بأي لغة صدرت؟ إن لم تكن بالإنجليزية، هل معها ترجمة معتمدة في نفس الملف؟`,
    };

    const task = prompts[doc.requirement_key];
    if (!task) return json({ error: "unsupported_type", key: doc.requirement_key }, 400);

    // ---- 4) استدعاء Claude برؤية الصورة ----
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        system: `أنت مدقق مستندات في منصة تسجيل طلاب بماليزيا. مهمتك فحص مبدئي دقيق يوفّر وقت المراجع البشري.

مبادئ حاكمة:
1) **عند أي شك → "review"**. رفضك الخاطئ يعطّل طالباً أسابيع؛ وقبولك الخاطئ يُرفض لاحقاً من EMGS ويضر الطالب أكثر. الشك ليس ضعفاً — هو الصواب.
2) لا تخترع معلومة لا تراها. إن كان النص غير مقروء، قل ذلك.
3) غطاء الرأس/الحجاب مقبول تماماً ما دام الوجه كاملاً ظاهراً — لا ترفضه أبداً.
4) كن موجزاً في findings — المراجع يقرأ عشرات المستندات.

أعد **JSON فقط** بلا أي نص قبله أو بعده وبلا علامات markdown:
{
  "verdict": "pass" | "review" | "fail",
  "confidence": 0.0-1.0,
  "rejection_key": null | "blurry" | "expired" | "wrong_doc" | "incomplete",
  "findings": ["ملاحظة موجزة بالعربية", "..."],
  "extracted": {"passport_expiry": "YYYY-MM-DD"}
}

verdict:
- "pass": مستوفٍ بوضوح
- "review": يحتاج عين بشرية (شك، جودة حدّية، معلومة ناقصة)
- "fail": مخالفة صريحة لا لبس فيها (ضبابي تماماً، مستند خطأ، منتهي)`,
        messages: [{
          role: "user",
          content: [
            {
              type: isPdf ? "document" : "image",
              source: { type: "base64", media_type: mediaType, data: b64(bytes) },
            },
            { type: "text", text: task },
          ],
        }],
      }),
    });

    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = await res.json();
    const raw = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text).join("");

    // تحصين: إن لم يُعِد النموذج JSON صالحاً، لا ننهار — نطلب مراجعة بشرية
    let v: Verdict;
    try {
      v = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      v = { verdict: "review", confidence: 0, rejection_key: null,
            findings: ["تعذّر تحليل رد الفحص الآلي — يرجى المراجعة يدوياً"], extracted: {} };
    }
    if (!Array.isArray(v.findings)) v.findings = [];
    if (!v.extracted || typeof v.extracted !== "object") v.extracted = {};

    // ---- 5) تحقق منطقي إضافي: قاعدة الـ18 شهراً (لا نتركها لتقدير النموذج) ----
    if (doc.requirement_key === "passport" && v.extracted?.passport_expiry) {
      const start = doc.applications?.start_month
        ? new Date(doc.applications.start_month)
        : new Date();
      const expiry = new Date(v.extracted.passport_expiry);
      const months = (expiry.getFullYear() - start.getFullYear()) * 12
                   + (expiry.getMonth() - start.getMonth());
      if (!isNaN(months) && months < 18) {
        v.verdict = "fail";
        v.rejection_key = "expired";
        v.findings.unshift(`⛔ صلاحية الجواز ${months} شهراً من بدء الدراسة — أقل من 18 (شرط EMGS)`);
      }
    }

    // ---- 6) حفظ الرأي — الحالة تبقى pending حتى تعتمدها أنت ----
    await admin.from("application_documents").update({
      ai_verdict: v.verdict,
      ai_confidence: v.confidence,
      ai_findings: v.findings,
      ai_extracted: v.extracted,
      ai_suggested_rejection: v.rejection_key,
      ai_reviewed_at: new Date().toISOString(),
    }).eq("id", documentId);

    return json({ ok: true, ...v });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function b64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
