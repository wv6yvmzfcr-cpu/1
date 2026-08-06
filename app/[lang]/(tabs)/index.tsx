/**
 * الصفحة الرئيسية لكل لغة — /ar · /en · /ru · /ms
 */
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useInstitutes } from '@/hooks/useInstitutes';
import { InstituteCard } from '@/components/InstituteCard';
import { LoadingState } from '@/components/ui/States';
import { Seo } from '@/components/Seo';
import { SUPPORTED_LANGS } from '../_layout';

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export default function Home() {
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data, loading } = useInstitutes({ cityKey: null });

  if (loading && !data) return <LoadingState />;
  const top = (data ?? []).slice(0, 4);

  return (
    <ScrollView className="flex-1 bg-surface-warm" contentContainerClassName="pb-10">
      <Seo
        title={t('seo.home_title')}
        description={t('seo.home_desc')}
        path=""
        lang={lang}
        langs={[...SUPPORTED_LANGS]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'EduLink',
          url: `https://edulink.app/${lang}`,
          inLanguage: lang,
          potentialAction: {
            '@type': 'SearchAction',
            target: `https://edulink.app/${lang}/institutes?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }}
      />

      {/* البطل: الأطروحة — لا شعار تسويقي فارغ */}
      <View className="bg-primary-dark px-5 pb-8 pt-14">
        <Text className="font-display text-3xl leading-10 text-white">{t('seo.hero_h1')}</Text>
        <Text className="mt-3 font-body text-base text-primary-light">{t('seo.hero_sub')}</Text>
        <Pressable
          onPress={() => router.push(`/${lang}/institutes`)}
          className="mt-6 self-start rounded-pill bg-accent px-7 py-3.5 active:opacity-85"
        >
          <Text className="font-display text-white">{t('seo.hero_cta')}</Text>
        </Pressable>
      </View>

      <View className="gap-3 p-4">
        <Text className="font-display text-xl text-ink">{t('seo.featured')}</Text>
        {top.map((i) => <InstituteCard key={i.id} item={i} />)}
        <Pressable onPress={() => router.push(`/${lang}/institutes`)} className="py-3">
          <Text className="text-center font-bold text-primary">{t('seo.see_all')} ←</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
