/**
 * قائمة المعاهد — تستهدف الكلمة الأم:
 * "معاهد اللغة الانجليزية في ماليزيا" (منافسة شبه معدومة بالعربية)
 */
import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useInstitutes } from '@/hooks/useInstitutes';
import { useLocalized } from '@/hooks/useLocalized';
import { InstituteCard } from '@/components/InstituteCard';
import { FilterBar } from '@/components/FilterBar';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Seo, breadcrumbSchema } from '@/components/Seo';
import { SUPPORTED_LANGS } from '../_layout';

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export default function InstitutesPage() {
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const { t } = useTranslation();
  const { L } = useLocalized();
  const [cityKey, setCityKey] = useState<string | null>(null);
  const { data, loading, error, refetch } = useInstitutes({ cityKey });

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState onRetry={refetch} />;
  const list = data ?? [];

  // ItemList schema — يساعد Google يفهم أنها قائمة
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: list.length,
    itemListElement: list.map((i, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: L(i.name),
      url: `https://edulink.app/${lang}/institutes/${i.slug}`,
    })),
  };

  return (
    <View className="flex-1 bg-surface-warm">
      <Seo
        title={t('seo.list_title')}
        description={t('seo.list_desc', { count: list.length })}
        path="/institutes"
        lang={lang}
        langs={[...SUPPORTED_LANGS]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [itemList, breadcrumbSchema([
            { name: t('nav.home'), url: `https://edulink.app/${lang}` },
            { name: t('nav.institutes'), url: `https://edulink.app/${lang}/institutes` },
          ])],
        }}
      />
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerClassName="gap-3 p-4 pb-10"
        renderItem={({ item }) => <InstituteCard item={item} />}
        ListEmptyComponent={<EmptyState message={t('home.empty')} />}
        ListHeaderComponent={
          <View className="gap-3">
            {/* H1 يحمل الكلمة المفتاحية الأساسية */}
            <Text className="font-display text-3xl text-ink">{t('seo.list_h1')}</Text>
            <Text className="font-body text-base text-ink-soft">{t('seo.list_intro')}</Text>
            <FilterBar institutes={list} cityKey={cityKey} onCity={setCityKey} />
          </View>
        }
      />
    </View>
  );
}
