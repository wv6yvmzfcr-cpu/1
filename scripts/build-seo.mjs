/**
 * يولّد sitemap.xml و robots.txt من قاعدة البيانات الحقيقية.
 * يُشغَّل بعد `expo export` وقبل الرفع.
 *
 * لماذا يدوي وليس تلقائي؟ لأن Expo لا يولّد sitemap للمسارات الديناميكية،
 * وبدون sitemap قد يستغرق Google شهوراً ليجد صفحاتك.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DOMAIN = process.env.SITE_URL || 'https://edulink.app';
const OUT = process.env.OUT_DIR || 'dist';
const LANGS = ['ar', 'en', 'ms', 'ru'];

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** كل رابط يحمل بدائله اللغوية — شرط أساسي لاستهداف عدة دول */
function urlNode(path, langs, lastmod, priority, changefreq = 'weekly') {
  const alts = langs.map((l) =>
    `    <xhtml:link rel="alternate" hreflang="${l}" href="${DOMAIN}/${l}${path}"/>`
  ).join('\n');
  return langs.map((l) => `  <url>
    <loc>${esc(`${DOMAIN}/${l}${path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en${path}"/>
  </url>`).join('\n');
}

const now = new Date().toISOString().split('T')[0];
const nodes = [];

// الصفحات الثابتة
nodes.push(urlNode('', LANGS, now, '1.0', 'daily'));
nodes.push(urlNode('/institutes', LANGS, now, '0.9', 'daily'));
nodes.push(urlNode('/blog', LANGS, now, '0.7'));

// المعاهد
const { data: insts } = await sb.from('institutes')
  .select('slug, updated_at:created_at').eq('is_active', true);
for (const i of insts ?? []) {
  nodes.push(urlNode(`/institutes/${i.slug}`, LANGS, now, '0.9'));
}

// الأدلة — بلغاتها المتاحة فقط
const { data: guides } = await sb.from('seo_pages')
  .select('slug, lang, updated_at').eq('type', 'guide').eq('is_published', true);
const guideMap = {};
for (const g of guides ?? []) (guideMap[g.slug] ??= []).push(g.lang);
for (const [slug, langs] of Object.entries(guideMap)) {
  nodes.push(urlNode(`/guide/${slug}`, langs, now, '0.8'));
}

// المدونة
const { data: posts } = await sb.from('blog_posts')
  .select('slug, lang, updated_at').eq('is_published', true);
const postMap = {};
for (const p of posts ?? []) (postMap[p.slug] ??= []).push(p.lang);
for (const [slug, langs] of Object.entries(postMap)) {
  nodes.push(urlNode(`/blog/${slug}`, langs, now, '0.7', 'monthly'));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${nodes.join('\n')}
</urlset>`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'sitemap.xml'), sitemap);

// المسارات الخاصة تحت كل لغة — نحجبها بنمط شامل
const privatePaths = LANGS.flatMap((l) => [
  `Disallow: /${l}/apply/`,
  `Disallow: /${l}/application/`,
  `Disallow: /${l}/assistant`,
  `Disallow: /${l}/profile`,
  `Disallow: /${l}/login`,
  `Disallow: /${l}/register`,
  `Disallow: /${l}/forgot-password`,
]).join('\n');

writeFileSync(join(OUT, 'robots.txt'), `User-agent: *
Allow: /

# صفحات خاصة بالطالب — لا تُفهرس
${privatePaths}

Sitemap: ${DOMAIN}/sitemap.xml
`);

const count = (sitemap.match(/<loc>/g) || []).length;
console.log(`✓ sitemap.xml — ${count} رابط`);
console.log(`✓ robots.txt`);
