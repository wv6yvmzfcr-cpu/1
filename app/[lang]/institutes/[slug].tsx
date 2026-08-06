/**
 * صفحة المعهد — أهم صفحة SEO عندك.
 *
 * تُصدَّر كـ HTML ثابت لكل (معهد × لغة):
 *   /ar/institutes/ems-language-centre
 *   /en/institutes/ems-language-centre  ... إلخ
 *
 * وكلها مربوطة بـ hreflang فيفهم Google أنها **نفس الصفحة بلغات مختلفة**
 * لا محتوى مكرر.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useInstitute } from '@/hooks/useInstitutes';
import { useLocalized } from '@/hooks/useLocalized';
import { PriceTag } from '@/components/PriceTag';
import { ImageCarousel } from '@/components/ImageCarousel';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { Seo, instituteSchema, courseSchema, breadcrumbSchema } from '@/components/Seo';
import { SUPPORTED_LANGS } from '../_layout';

/**
 * يخبر Expo بكل الصفحات الثابتة الواجب توليدها عند التصدير.
 * ⚠️ بدونها لن يُولَّد HTML لأي معهد — ولن يفهرس Google شيئاً.
 */
export async function generateStaticParams() {
  const { data } = await supabase
    .from('institutes')
    .select('slug')
    .eq('is_active', true);

  const params: { lang: string; slug: string }[] = [];
  for (const lang of SUPPORTED_LANGS) {
    for (const inst of data ?? []) {
      params.push({ lang, slug: inst.slug });
    }
  }
  return params;
}

export default function InstitutePage() {
  const { slug, lang } = useLocalSearchParams<{ slug: string; lang: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { L, LL } = useLocalized();
  const { data: inst, loading, error, refetch } = useInstitute(slug);

  if (loading) return <LoadingState />;
  if (error || !inst) return <ErrorState onRetry={refetch} />;

  const name = L(inst.name);
  const city = L(inst.city);
  const desc = L(inst.description);
  const url = `https://edulink.app/${lang}/institutes/${slug}`;

  // العنوان: الكلمة المفتاحية أولاً — Google يزن البداية أكثر
  const title = `${name} — ${t('seo.inst_title', { city })}`;
  const metaDesc = t('seo.inst_desc', {
    name,
    city,
    rating: inst.rating ?? '—',
    count: inst.rating_count ?? 0,
  });

  return (
    <ScrollView className="flex-1 bg-surface-warm">
      <Seo
        title={title}
        description={metaDesc}
        path={`/institutes/${slug}`}
        lang={lang}
        langs={[...SUPPORTED_LANGS]}
        image={inst.images?.[0]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            instituteSchema({
              name, description: desc, url,
              image: inst.images?.[0],
              address: inst.address ?? undefined,
              lat: inst.location_lat ?? undefined,
              lng: inst.location_lng ?? undefined,
              rating: inst.rating,          // ⚠️ تقييم Google حقيقي فقط
              ratingCount: inst.rating_count,
              phone: inst.phone,
            }),
            ...LL(inst.programs).map((p) =>
              courseSchema({
                name: p, description: `${p} — ${name}`,
                provider: name, providerUrl: url,
                priceMyr: inst.price_month_myr,
                estimated: inst.price_estimated,
              })
            ),
            breadcrumbSchema([
              { name: t('nav.home'), url: `https://edulink.app/${lang}` },
              { name: t('nav.institutes'), url: `https://edulink.app/${lang}/institutes` },
              { name, url },
            ]),
          ],
        }}
      />

      <ImageCarousel images={inst.images} />

      <View className="gap-5 rounded-t-card bg-surface p-5" style={{ marginTop: -20 }}>
        {/* H1 — واحد فقط لكل صفحة، وفيه الكلمة المفتاحية */}
        <View>
          <Text className="font-display text-2xl text-ink">{name}</Text>
          <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
            <Text className="text-sm text-ink-soft">📍 {city}</Text>
            {!!inst.rating && (
              <Text className="text-sm font-bold text-accent">
                ★ {inst.rating}
                <Text className="font-body text-ink-soft"> ({inst.rating_count})</Text>
              </Text>
            )}
          </View>
          {inst.accreditation?.length > 0 && (
            <Text className="mt-2 text-xs font-bold text-primary-dark">
              ✓ {t('seo.accredited')}: {inst.accreditation.join(' · ')}
            </Text>
          )}
        </View>

        <PriceTag
          priceMonthMyr={inst.price_month_myr}
          estimated={inst.price_estimated}
          minMyr={inst.price_min_myr}
          maxMyr={inst.price_max_myr}
          note={inst.price_note}
          extraFees={inst.extra_fees}
        />

        {/* H2 — عناوين فرعية تحمل الكلمات الفرعية */}
        <View>
          <Text className="mb-2 font-display text-lg text-ink">{t('institute.features')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {LL(inst.tags).map((tag) => (
              <Text key={tag} className="rounded-pill bg-primary-light px-3 py-1.5 text-xs text-primary-dark">
                {tag}
              </Text>
            ))}
          </View>
        </View>

        <View>
          <Text className="mb-2 font-display text-lg text-ink">{t('seo.programs')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {LL(inst.programs).map((p) => (
              <Text key={p} className="rounded-pill bg-accent-light px-3 py-1.5 text-xs text-accent-dark">
                {p}
              </Text>
            ))}
          </View>
        </View>

        <View>
          <Text className="mb-2 font-display text-lg text-ink">{t('institute.about')}</Text>
          <Text className="font-body text-base text-ink-soft">{desc}</Text>
        </View>

        {/* بيانات منظمة — تساعد Google وتفيد القارئ */}
        <View className="rounded-card bg-surface-sand p-4">
          <Text className="mb-2 font-display text-lg text-ink">{t('seo.details')}</Text>
          {inst.hours_per_week && (
            <Row label={t('seo.hours')} value={String(inst.hours_per_week)} />
          )}
          {inst.levels_count && <Row label={t('seo.levels')} value={String(inst.levels_count)} />}
          <Row label={t('seo.age')} value={`${inst.min_age}–${inst.max_age}`} />
          {inst.address && <Row label={t('seo.address')} value={inst.address} />}
        </View>

        <Pressable
          onPress={() => router.push(`/${lang}/apply/${slug}`)}
          className="rounded-pill bg-primary py-4 active:opacity-85"
        >
          <Text className="text-center font-display text-white">{t('institute.apply_now')}</Text>
        </Pressable>

        {inst.website && (
          <Pressable onPress={() => Linking.openURL(inst.website!)} className="py-2">
            <Text className="text-center text-sm text-primary">{t('seo.official_site')} ↗</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-surface-line py-2">
      <Text className="text-sm text-ink-soft">{label}</Text>
      <Text className="max-w-[60%] text-end text-sm font-bold text-ink">{value}</Text>
    </View>
  );
}
