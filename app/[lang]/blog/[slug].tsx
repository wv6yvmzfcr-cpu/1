/**
 * مقال المدونة — يُصدَّر HTML ثابتاً لكل مقال منشور.
 * hreflang يربط ترجمات نفس المقال عبر group_id.
 */
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@/hooks/useQuery';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Seo, articleSchema, breadcrumbSchema } from '@/components/Seo';

export async function generateStaticParams() {
  const { data } = await supabase
    .from('blog_posts').select('slug, lang').eq('is_published', true);
  return (data ?? []).map((p) => ({ lang: p.lang, slug: p.slug }));
}

export default function BlogPost() {
  const { slug, lang } = useLocalSearchParams<{ slug: string; lang: string }>();

  const { data, loading, error, refetch } = useQuery(async () => {
    const { data: post, error: e } = await supabase
      .from('blog_posts').select('*').eq('slug', slug).eq('lang', lang).single();
    if (e) throw e;
    // ترجمات نفس المقال — لبناء hreflang صحيح
    const { data: alts } = await supabase
      .from('blog_posts').select('lang').eq('group_id', post.group_id).eq('is_published', true);
    return { post, langs: (alts ?? []).map((a) => a.lang) };
  }, [slug, lang]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;
  const { post, langs } = data;

  return (
    <ScrollView className="flex-1 bg-surface-warm" contentContainerClassName="p-5 pb-12">
      <Seo
        title={post.title}
        description={post.excerpt ?? ''}
        path={`/blog/${slug}`}
        lang={lang}
        langs={langs}
        image={post.cover_image ?? undefined}
        type="article"
        publishedAt={post.published_at ?? undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            articleSchema({
              title: post.title,
              description: post.excerpt ?? '',
              url: `https://edulink.app/${lang}/blog/${slug}`,
              image: post.cover_image ?? undefined,
              published: post.published_at ?? post.updated_at,
              modified: post.updated_at,
            }),
            breadcrumbSchema([
              { name: 'EduLink', url: `https://edulink.app/${lang}` },
              { name: 'Blog', url: `https://edulink.app/${lang}/blog` },
              { name: post.title, url: `https://edulink.app/${lang}/blog/${slug}` },
            ]),
          ],
        }}
      />
      <Text className="font-display text-3xl leading-10 text-ink">{post.title}</Text>
      {post.reading_min && (
        <Text className="mt-2 text-xs text-ink-faint">{post.reading_min} min</Text>
      )}
      <View className="mt-5">
        <Markdown style={mdStyles}>{post.body_md}</Markdown>
      </View>
    </ScrollView>
  );
}

const mdStyles = {
  body:     { color: '#5A6B7C', fontSize: 15, lineHeight: 26, fontFamily: 'Tajawal_400Regular' },
  heading2: { color: '#141F2B', fontSize: 20, lineHeight: 30, marginTop: 24, marginBottom: 8, fontFamily: 'Tajawal_700Bold' },
  heading3: { color: '#141F2B', fontSize: 17, lineHeight: 28, marginTop: 18, marginBottom: 6, fontFamily: 'Tajawal_500Medium' },
  link:     { color: '#0E6E5C' },
  table:    { borderColor: '#E8E2D8', borderRadius: 10, marginVertical: 12 },
  th:       { backgroundColor: '#F5F1EA', padding: 8 },
  td:       { padding: 8, borderColor: '#E8E2D8' },
  blockquote: { backgroundColor: '#E3F0EC', borderRadius: 10, padding: 12, borderLeftWidth: 0 },
};
