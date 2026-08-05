// =====================================================================
// sitemap.xml + robots.txt ديناميكي — Supabase Edge Function (Deno)
// supabase/functions/sitemap-xml/index.ts
//
// يبني خريطة الموقع و robots من قاعدتك مباشرةً — دائماً محدّثة بلا بناء.
// عام (بلا مصادقة): زوّار محركات البحث يصلونه.
//   /functions/v1/sitemap-xml            → sitemap.xml
//   /functions/v1/sitemap-xml?type=robots → robots.txt
//
// أفضل ممارسة: وجّه نطاقك بحيث /sitemap.xml و /robots.txt يشيران لهذه الدالة.
// النطاق يُقرأ من app_config('seo').domain أو من المتغيّر SITE_URL.
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const LANGS = ["ar", "en", "ms", "ru"];
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: seoCfg } = await admin.from("app_config").select("value").eq("key", "seo").maybeSingle();
  const domain = (seoCfg?.value?.domain || Deno.env.get("SITE_URL") || "").replace(/\/+$/, "");

  const url = new URL(req.url);
  if (url.searchParams.get("type") === "robots") {
    const priv = LANGS.flatMap((l) => [
      `Disallow: /${l}/apply/`, `Disallow: /${l}/application/`, `Disallow: /${l}/profile`,
      `Disallow: /${l}/login`, `Disallow: /${l}/register`,
    ]).join("\n");
    return new Response(
      `User-agent: *\nAllow: /\n\n${priv}\n\nSitemap: ${domain}/sitemap.xml\n`,
      { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } },
    );
  }

  const now = new Date().toISOString().split("T")[0];
  const nodes: string[] = [];
  const node = (path: string, langs: string[], priority: string, freq = "weekly") =>
    langs.map((l) => {
      const alts = langs.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${domain}/${a}${path}"/>`).join("\n");
      return `  <url>
    <loc>${esc(`${domain}/${l}${path}`)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
${alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="${domain}/en${path}"/>
  </url>`;
    }).join("\n");

  nodes.push(node("", LANGS, "1.0", "daily"));
  nodes.push(node("/institutes", LANGS, "0.9", "daily"));

  const { data: insts } = await admin.from("institutes").select("slug").eq("is_active", true);
  (insts || []).forEach((i: { slug: string }) => nodes.push(node(`/institutes/${i.slug}`, LANGS, "0.9")));

  const { data: pages } = await admin.from("seo_pages").select("slug,lang,type").eq("is_published", true);
  const pmap: Record<string, string[]> = {};
  (pages || []).forEach((p: { slug: string; lang: string; type: string }) => (pmap[`${p.type}:${p.slug}`] ??= []).push(p.lang));
  for (const [key, langs] of Object.entries(pmap)) {
    const [type, slug] = key.split(":");
    const base = type === "blog" ? "/blog/" : type === "guide" ? "/guide/" : "/";
    nodes.push(node(`${base}${slug}`, langs, "0.8"));
  }

  const { data: posts } = await admin.from("blog_posts").select("slug,lang").eq("is_published", true);
  const bmap: Record<string, string[]> = {};
  (posts || []).forEach((p: { slug: string; lang: string }) => (bmap[p.slug] ??= []).push(p.lang));
  for (const [slug, langs] of Object.entries(bmap)) nodes.push(node(`/blog/${slug}`, langs, "0.7", "monthly"));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${nodes.join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
});
