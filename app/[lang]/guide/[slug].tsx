/**
 * صفحات الأدلة — /ar/guide/costs · /ar/guide/student-visa ...
 * تستهدف الكلمات المعلوماتية عالية الحجم.
 */
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@/hooks/useQuery';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Seo, faqSchema, breadcrumbSchema } from '@/components/Seo';

export async function generateStaticParams() {
  const { data } = await supabase
    .from('seo_pages').select('slug, lang').eq('type', 'guide').eq('is_published', true);
  return (data ?? []).map((p) => ({ lang: p.lang, slug: p.slug }));
}

export default function Guide() {
  const { slug, lang } = useLocalSearchParams<{ slug: string; lang: string }>();

  const { data, loading, error, refetch } = useQuery(async () => {
    const { data: page, error: e } = await supabase
      .from('seo_pages').select('*').eq('slug', slug).eq('lang', lang).single();
    if (e) throw e;
    const { data: alts } = await supabase
      .from('seo_pages').select('lang').eq('slug', slug).eq('is_published', true);
    const { data: faqs } = await supabase
      .from('faq').select('question, answer').eq('is_active', true).limit(6);
    return { page, langs: (alts ?? []).map((a) => a.lang), faqs: faqs ?? [] };
  }, [slug, lang]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;
  const { page, langs, faqs } = data;

  const pick = (f: Record<string, string>) => f?.[lang] ?? f?.en ?? Object.values(f)[0] ?? '';

  return (
    <ScrollView className="flex-1 bg-surface-warm" contentContainerClassName="p-5 pb-12">
      <Seo
        title={page.title}
        description={page.meta_desc}
        path={`/guide/${slug}`}
        lang={lang}
        langs={langs}
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            // FAQPage — قد يظهر كقائمة منسدلة داخل نتيجة Google نفسها
            faqSchema(faqs.map((f) => ({ q: pick(f.question), a: pick(f.answer) }))),
            breadcrumbSchema([
              { name: 'EduLink', url: `https://edulink.app/${lang}` },
              { name: page.h1, url: `https://edulink.app/${lang}/guide/${slug}` },
            ]),
          ],
        }}
      />
      <Text className="font-display text-3xl leading-10 text-ink">{page.h1}</Text>
      <View className="mt-5">
        <Markdown style={{
          body: { color: '#5A6B7C', fontSize: 15, lineHeight: 26 },
          heading2: { color: '#141F2B', fontSize: 20, marginTop: 24, marginBottom: 8 },
        }}>{page.body_md ?? ''}</Markdown>
      </View>
    </ScrollView>
  );
}
