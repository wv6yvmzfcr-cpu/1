// =====================================================================
// معالجة الصورة الشخصية — Supabase Edge Function (Deno)
// supabase/functions/photo-passport/index.ts
//
// المهمة: يستقبل صورة الطالب (base64)، يزيل الخلفية ويستبدلها بأبيض،
//         ويعيد صورة جاهزة تطابق اشتراطات صورة الجواز.
//
// لماذا على السيرفر؟ إزالة الخلفية تحتاج نموذج AI لا يعمل داخل تطبيق Expo،
// ومفتاح الخدمة يجب أن يبقى سرياً (لا يُشحن داخل التطبيق أبداً).
//
// مزوّد إزالة الخلفية قابل للتبديل عبر متغير BG_PROVIDER:
//   - 'removebg'  : واجهة remove.bg (حصة مجانية شهرية).
//   - 'clipdrop'  : واجهة Clipdrop remove-background.
// نمرر الصورة الناتجة (خلفية شفافة PNG) ونركّبها فوق خلفية بيضاء.
//
// النشر:
//   supabase functions deploy photo-passport
//   supabase secrets set REMOVEBG_API_KEY=xxx   (أو CLIPDROP_API_KEY)
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Image } from "jsr:@matmen/imagescript@1.3.0"; // معالجة صور نقية بلا اعتماديات أصلية

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// أبعاد صورة الجواز القياسية 35×45مم عند 300dpi ≈ 413×531 بكسل
const OUT_W = 413;
const OUT_H = 531;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // ---- 1) تحقق الهوية ----
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "unauthorized" }, 401);
    }

    // ---- 2) استقبال الصورة ----
    const { imageBase64, applicationId } = await req.json();
    if (!imageBase64) return json({ error: "no_image" }, 400);
    const inputBytes = decodeBase64(imageBase64);

    // ---- 3) إزالة الخلفية عبر المزوّد ----
    const provider = Deno.env.get("BG_PROVIDER") ?? "removebg";
    const cutoutPng = await removeBackground(provider, inputBytes);

    // ---- 4) تركيب فوق خلفية بيضاء + ضبط المقاس ----
    const cutout = await Image.decode(cutoutPng);
    // نحافظ على النسبة مع ملء الإطار (تغطية) ثم قص للوسط
    cutout.resize(OUT_W, Image.RESIZE_AUTO);
    if (cutout.height < OUT_H) cutout.resize(Image.RESIZE_AUTO, OUT_H);
    const cropX = Math.max(0, (cutout.width - OUT_W) / 2);
    const cropY = Math.max(0, (cutout.height - OUT_H) / 2);
    const framed = cutout.crop(cropX | 0, cropY | 0, OUT_W, OUT_H);

    const white = new Image(OUT_W, OUT_H).fill(0xffffffff); // خلفية بيضاء صلبة
    white.composite(framed, 0, 0);                          // يحترم شفافية القصاصة
    const outPng = await white.encode();

    // ---- 5) رفع النتيجة لمجلد الطالب الخاص ----
    const path = `${user.id}/${applicationId}/photo.png`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(path, outPng, { upsert: true, contentType: "image/png" });
    if (upErr) throw upErr;

    // معاينة للطالب قبل الاعتماد (data URL)
    const previewB64 = encodeBase64(outPng);
    return json({ ok: true, path, preview: `data:image/png;base64,${previewB64}` });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// ---- إزالة الخلفية: تُعيد PNG بخلفية شفافة ----
async function removeBackground(provider: string, bytes: Uint8Array): Promise<Uint8Array> {
  if (provider === "clipdrop") {
    const form = new FormData();
    form.append("image_file", new Blob([bytes]), "photo.jpg");
    const res = await fetch("https://clipdrop-api.co/remove-background/v1", {
      method: "POST",
      headers: { "x-api-key": Deno.env.get("CLIPDROP_API_KEY")! },
      body: form,
    });
    if (!res.ok) throw new Error(`clipdrop ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  // الافتراضي: remove.bg
  const form = new FormData();
  form.append("image_file", new Blob([bytes]), "photo.jpg");
  form.append("size", "auto");
  form.append("bg_color", "");      // شفاف — نركّب الأبيض بأنفسنا لضبط النقاء
  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": Deno.env.get("REMOVEBG_API_KEY")! },
    body: form,
  });
  if (!res.ok) throw new Error(`removebg ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// ---- أدوات base64 ----
function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/^data:image\/\w+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function encodeBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
