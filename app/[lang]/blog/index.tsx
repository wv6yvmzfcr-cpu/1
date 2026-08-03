import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@/hooks/useQuery';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { Seo } from '@/components/Seo';
import { SUPPORTED_LANGS } from '../_layout';

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export default function BlogIndex() {
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const { data, loading } = useQuery(async () => {
    const { data } = await supabase
      .from('blog_posts').select('slug, title, excerpt, reading_min, published_at')
      .eq('lang', lang).eq('is_published', true)
      .order('published_at', { ascending: false });
    return data ?? [];
  }, [lang]);

  if (loading) return <LoadingState />;

  return (
    <View className="flex-1 bg-surface-warm">
      <Seo
        title={t('seo.blog_title')}
        description={t('seo.blog_desc')}
        path="/blog"
        lang={lang}
        langs={[...SUPPORTED_LANGS]}
      />
      <FlatList
        data={data ?? []}
        keyExtractor={(p) => p.slug}
        contentContainerClassName="gap-3 p-4"
        ListHeaderComponent={
          <Text className="mb-2 font-display text-3xl text-ink">{t('seo.blog_h1')}</Text>
        }
        ListEmptyComponent={<EmptyState message={t('seo.blog_empty')} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/${lang}/blog/${item.slug}`)}
            className="rounded-card bg-surface p-4 shadow-card active:opacity-90"
          >
            <Text className="font-display text-lg text-ink">{item.title}</Text>
            <Text numberOfLines={2} className="mt-1 font-body text-sm text-ink-soft">{item.excerpt}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
